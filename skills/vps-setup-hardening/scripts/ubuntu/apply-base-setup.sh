#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
SKILL_DIR=$(skill_dir)

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/ubuntu/apply-base-setup.sh --ingress host|external

Ubuntu 24.04/26.04 base setup: full APT upgrade, unattended security updates
(automatic reboot disabled), time synchronization, bounded persistent journald,
and an enabled Fail2Ban sshd jail. Never schedules automatic reboots.

Ingress strategy:
  host      Prepare UFW without activating it. Valid only when Docker will not
            be installed.
  external  Do not install a host firewall package and do not alter any existing
            firewall. Required when Docker will be installed.
EOF
}

ORIGINAL_ARGS=("$@")
INGRESS=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ingress) [[ $# -ge 2 ]] || die '--ingress requires host or external.'; INGRESS=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
[[ $INGRESS == host || $INGRESS == external ]] || die 'Select --ingress host|external.'
require_root "${ORIGINAL_ARGS[@]}"
require_profile ubuntu
have apt-get || die 'apt-get is required on the ubuntu profile.'

configure_journal() {
  install_managed_file \
    "$SKILL_DIR/assets/config/60-agent-recipes-journal.conf" \
    /etc/systemd/journald.conf.d/60-agent-recipes.conf
  systemctl restart systemd-journald.service
}

configure_fail2ban() {
  local source destination changed=false
  source="$SKILL_DIR/assets/config/10-agent-recipes-sshd.local"
  destination=/etc/fail2ban/jail.d/10-agent-recipes-sshd.local
  cmp -s -- "$source" "$destination" || changed=true
  install_managed_file "$source" "$destination"
  fail2ban-client -t
  systemctl enable fail2ban.service
  if ! systemctl is-active --quiet fail2ban.service; then
    systemctl start fail2ban.service
  elif [[ $changed == true ]]; then
    fail2ban-client reload
  fi
  fail2ban-client status sshd >/dev/null \
    || die 'Fail2Ban started but the managed sshd jail is unavailable.'
  log 'Fail2Ban is active with the managed sshd jail.'
}

ensure_time_sync() {
  local service
  for service in chrony.service chronyd.service systemd-timesyncd.service; do
    if systemctl list-unit-files "$service" >/dev/null 2>&1; then
      systemctl enable --now "$service" || true
      if systemctl is-active --quiet "$service"; then
        log "Time synchronization service is active: $service"
        return
      fi
    fi
  done
  apt-get install -y chrony
  systemctl enable --now chrony.service || systemctl enable --now chronyd.service || true
  if systemctl is-active --quiet chrony.service 2>/dev/null \
    || systemctl is-active --quiet chronyd.service 2>/dev/null \
    || systemctl is-active --quiet systemd-timesyncd.service 2>/dev/null; then
    log 'Time synchronization is active after chrony install.'
    return
  fi
  warn 'No active time-synchronization service was found after package setup.'
}

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y dist-upgrade
APT_PACKAGES=(ca-certificates curl fail2ban git gnupg openssh-client sudo unattended-upgrades)
if [[ $INGRESS == host ]]; then
  if have ufw; then
    log 'UFW is already installed.'
  elif have nft && nft list ruleset 2>/dev/null | grep -q 'hook input'; then
    warn 'An existing nftables input hook was detected; UFW was not installed automatically.'
  else
    APT_PACKAGES+=(ufw)
  fi
else
  warn 'External ingress selected; no host firewall package will be installed or disabled.'
fi
apt-get install -y "${APT_PACKAGES[@]}"
install_managed_file "$SKILL_DIR/assets/config/20auto-upgrades" /etc/apt/apt.conf.d/20auto-upgrades
install_managed_file \
  "$SKILL_DIR/assets/config/52agent-recipes-unattended-upgrades" \
  /etc/apt/apt.conf.d/52agent-recipes-unattended-upgrades
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer || true

ensure_time_sync
configure_journal
configure_fail2ban

log "Ubuntu base setup completed with ingress strategy: $INGRESS."
if [[ -e /var/run/reboot-required ]]; then
  warn 'A reboot is required. Do not reboot until access and ingress work are complete and a recovery path is available.'
else
  log 'No reboot-required marker is present.'
fi
