#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
SKILL_DIR=$(skill_dir)

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/apply-base-setup.sh --firewall host|external

Updates the operating system, installs basic administration tools, configures
automatic security updates where supported, enables time synchronization, and
keeps a small persistent system journal. It never schedules automatic reboots.

Firewall strategy:
  host      Prepare a supported host firewall package when no existing firewall
            implementation is detected.
  external  Do not install a host firewall package and do not alter any existing
            firewall. A separately verified provider or Docker-aware ingress
            control must be established before public services are deployed.
EOF
}

ORIGINAL_ARGS=("$@")
FIREWALL_STRATEGY=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --firewall) [[ $# -ge 2 ]] || die '--firewall requires host or external.'; FIREWALL_STRATEGY=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
[[ $FIREWALL_STRATEGY == host || $FIREWALL_STRATEGY == external ]] \
  || die 'Select the approved firewall strategy with --firewall host|external.'
load_os_release
PACKAGE_MANAGER=$(detect_package_manager) || die 'No supported package manager was found.'

configure_journal() {
  if have systemctl && systemctl list-unit-files systemd-journald.service >/dev/null 2>&1; then
    install_managed_file \
      "$SKILL_DIR/assets/config/60-agent-recipes-journal.conf" \
      /etc/systemd/journald.conf.d/60-agent-recipes.conf
    systemctl restart systemd-journald.service
  else
    warn 'systemd-journald is unavailable; persistent journal settings were not applied.'
  fi
}

ensure_time_sync() {
  if ! have systemctl; then
    warn 'No supported time-synchronization service manager was found.'
    return
  fi
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
  warn 'No active time-synchronization service was found after package setup.'
}

case "$PACKAGE_MANAGER" in
  apt-get)
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get -y dist-upgrade
    APT_PACKAGES=(ca-certificates curl git gnupg openssh-client sudo unattended-upgrades)
    if [[ $FIREWALL_STRATEGY == host ]]; then
      if have firewall-cmd || { have nft && nft list ruleset 2>/dev/null | grep -q 'hook input'; }; then
        warn 'An existing firewall implementation was detected; UFW was not installed automatically.'
      else
        APT_PACKAGES+=(ufw)
      fi
    else
      warn 'External firewall strategy selected; no host firewall package will be installed.'
    fi
    apt-get install -y "${APT_PACKAGES[@]}"
    install_managed_file "$SKILL_DIR/assets/config/20auto-upgrades" /etc/apt/apt.conf.d/20auto-upgrades
    install_managed_file \
      "$SKILL_DIR/assets/config/52agent-recipes-unattended-upgrades" \
      /etc/apt/apt.conf.d/52agent-recipes-unattended-upgrades
    if have systemctl; then
      systemctl enable --now apt-daily.timer apt-daily-upgrade.timer || true
    fi
    if ! systemctl is-active --quiet chrony.service 2>/dev/null \
      && ! systemctl is-active --quiet systemd-timesyncd.service 2>/dev/null; then
      apt-get install -y chrony
    fi
    ;;
  dnf)
    dnf -y upgrade --refresh
    DNF_PACKAGES=(ca-certificates curl git gnupg2 openssh-clients sudo dnf-automatic chrony)
    [[ $FIREWALL_STRATEGY == host ]] && DNF_PACKAGES+=(firewalld)
    dnf -y install "${DNF_PACKAGES[@]}"
    if [[ -f /etc/dnf/automatic.conf ]]; then
      backup_file /etc/dnf/automatic.conf
      sed -Ei \
        -e 's/^[[:space:]]*upgrade_type[[:space:]]*=.*/upgrade_type = security/' \
        -e 's/^[[:space:]]*apply_updates[[:space:]]*=.*/apply_updates = yes/' \
        /etc/dnf/automatic.conf
    fi
    systemctl enable --now dnf-automatic.timer || warn 'Could not enable dnf-automatic.timer; inspect the distribution-specific timer units.'
    ;;
  yum)
    yum -y update
    YUM_PACKAGES=(ca-certificates curl git gnupg2 openssh-clients sudo yum-cron chrony)
    [[ $FIREWALL_STRATEGY == host ]] && YUM_PACKAGES+=(firewalld)
    yum -y install "${YUM_PACKAGES[@]}"
    if [[ -f /etc/yum/yum-cron.conf ]]; then
      backup_file /etc/yum/yum-cron.conf
      sed -Ei \
        -e 's/^[[:space:]]*update_cmd[[:space:]]*=.*/update_cmd = security/' \
        -e 's/^[[:space:]]*apply_updates[[:space:]]*=.*/apply_updates = yes/' \
        /etc/yum/yum-cron.conf
      systemctl enable --now yum-cron.service || true
    fi
    ;;
  zypper)
    zypper --non-interactive refresh
    zypper --non-interactive update
    zypper --non-interactive install ca-certificates curl git gpg2 openssh sudo chrony
    warn 'Automatic security updates were not configured automatically on this zypper-based system; the agent must use the distribution-supported update timer.'
    ;;
  apk)
    apk update
    apk upgrade
    apk add ca-certificates curl git gnupg openssh-client sudo chrony
    warn 'Automatic security updates were not configured automatically on this apk-based system; the agent must establish an appropriate periodic update mechanism.'
    ;;
  *) die "Unsupported package manager: $PACKAGE_MANAGER" ;;
esac

ensure_time_sync
configure_journal

log "Base setup completed with firewall strategy: $FIREWALL_STRATEGY."
if [[ -e /var/run/reboot-required ]]; then
  warn 'A reboot is required. Do not reboot until access and firewall work are complete and a recovery path is available.'
else
  log 'No reboot-required marker is present.'
fi
