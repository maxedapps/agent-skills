#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/ubuntu/install-tailscale.sh

Installs Tailscale from its stable Ubuntu APT repository and starts tailscaled.
Authentication is intentionally separate:
  sudo tailscale up --ssh=false
EOF
}
if [[ ${1:-} == --help ]]; then usage; exit 0; fi
[[ $# -eq 0 ]] || die 'This script accepts no arguments. Use --help for usage.'
require_root "$@"
require_profile ubuntu
have apt-get || die 'apt-get is required.'
[[ -n ${OS_CODENAME:-} ]] || die 'The Ubuntu codename is missing; cannot select a Tailscale repository safely.'

if have tailscale; then
  log "Tailscale is already installed: $(tailscale version | head -n 1)"
  service_enable_now tailscaled
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
install -d -m 0755 /usr/share/keyrings
base="https://pkgs.tailscale.com/stable/ubuntu/${OS_CODENAME}"
key_tmp=$(mktemp)
list_tmp=$(mktemp)
trap 'rm -f "$key_tmp" "$list_tmp"' EXIT
curl -fsSL "${base}.noarmor.gpg" -o "$key_tmp" || die "Tailscale has no stable repository for ubuntu/${OS_CODENAME}."
curl -fsSL "${base}.tailscale-keyring.list" -o "$list_tmp" || die "Could not download the Tailscale repository definition for ubuntu/${OS_CODENAME}."
grep -q 'pkgs\.tailscale\.com' "$list_tmp" || die 'The downloaded Tailscale repository definition was unexpected.'
install -m 0644 "$key_tmp" /usr/share/keyrings/tailscale-archive-keyring.gpg
install -m 0644 "$list_tmp" /etc/apt/sources.list.d/tailscale.list
apt-get update
apt-get install -y tailscale

service_enable_now tailscaled
have tailscale || die 'Tailscale installation completed without providing the tailscale command.'
log "Tailscale installed: $(tailscale version | head -n 1)"
cat <<'EOF'

Authentication still needs a human-controlled tailnet login. Run:
  sudo tailscale up --ssh=false

Open the displayed URL, then verify with:
  tailscale status
  tailscale ip -4
  tailscale ip -6

This skill uses traditional OpenSSH over Tailscale; Tailscale SSH must remain disabled.
EOF
