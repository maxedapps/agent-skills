#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
SKILL_DIR=$(skill_dir)

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/al2023-ec2/apply-base-setup.sh --releasever <concrete-AL2023-version>

Upgrades Amazon Linux 2023 on EC2 to one explicitly approved concrete release
version, installs base administration packages, enables time synchronization,
and configures a bounded persistent journal. Does not configure dnf-automatic
and does not claim future releases apply automatically.

Rejects empty values, bare "2023", and "latest".
EOF
}

ORIGINAL_ARGS=("$@")
RELEASEVER=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --releasever) [[ $# -ge 2 ]] || die '--releasever requires a concrete AL2023 version.'; RELEASEVER=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
[[ -n $RELEASEVER ]] || die 'Provide an approved concrete AL2023 release with --releasever.'
[[ $RELEASEVER != 2023 && $RELEASEVER != latest ]] \
  || die 'Refusing nonspecific releasever. Provide a concrete AL2023 version (for example 2023.6.20241010), not "2023" or "latest".'
[[ $RELEASEVER =~ ^2023(\.[0-9a-zA-Z._-]+)+$ ]] \
  || die "Releasever '$RELEASEVER' does not look like a concrete AL2023 versioned release."
require_root "${ORIGINAL_ARGS[@]}"
require_profile al2023-ec2
have dnf || die 'dnf is required on the al2023-ec2 profile.'

configure_journal() {
  install_managed_file \
    "$SKILL_DIR/assets/config/60-agent-recipes-journal.conf" \
    /etc/systemd/journald.conf.d/60-agent-recipes.conf
  systemctl restart systemd-journald.service
}

ensure_time_sync() {
  local service
  for service in chronyd.service chrony.service systemd-timesyncd.service; do
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

log "Upgrading and pinning host to approved releasever: $RELEASEVER"
dnf -y --releasever="$RELEASEVER" upgrade --refresh
dnf -y --releasever="$RELEASEVER" install \
  ca-certificates curl git gnupg2 openssh-clients sudo chrony

INSTALLED=$(rpm -q system-release --qf '%{VERSION}\n')
[[ $INSTALLED == "$RELEASEVER" ]] \
  || die "Installed system-release version is '$INSTALLED', expected approved '$RELEASEVER'."

ensure_time_sync
configure_journal

log "AL2023 base setup completed. Host is pinned to release $INSTALLED."
log 'Future AL2023 releases are manual maintenance; this skill does not enable automatic release tracking.'
if have needs-restarting && ! needs-restarting -r >/dev/null 2>&1; then
  warn 'needs-restarting indicates a reboot is advisable. Do not reboot until access and Security Group work are complete.'
fi
