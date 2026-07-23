#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/al2023-ec2/install-tailscale.sh

Installs Tailscale from its stable amazon-linux/2023 repository and starts
tailscaled. Authentication is intentionally separate. Default guidance avoids
the documented AL2023 DNS forwarding loop:

  sudo tailscale up --accept-dns=false --ssh=false
EOF
}
if [[ ${1:-} == --help ]]; then usage; exit 0; fi
[[ $# -eq 0 ]] || {
  [[ ${1:-} == --releasever ]] && die 'Later AL installers use the host pinned release; do not pass --releasever.'
  die 'This script accepts no arguments. Use --help for usage.'
}
require_root "$@"
require_profile al2023-ec2
have dnf || die 'dnf is required.'

PINNED=$(rpm -q system-release --qf '%{VERSION}\n' 2>/dev/null || true)
[[ -n $PINNED ]] && log "Host pinned AL2023 release: $PINNED"

if have tailscale; then
  log "Tailscale is already installed: $(tailscale version | head -n 1)"
  service_enable_now tailscaled
  exit 0
fi

have curl || die 'curl is required to fetch the Tailscale repository definition.'
repo_url='https://pkgs.tailscale.com/stable/amazon-linux/2023/tailscale.repo'
repo_tmp=$(mktemp)
trap 'rm -f "$repo_tmp"' EXIT
curl -fsSL "$repo_url" -o "$repo_tmp" || die "Tailscale has no stable repository at $repo_url."
grep -q 'pkgs\.tailscale\.com' "$repo_tmp" || die 'The downloaded Tailscale repository definition was unexpected.'
grep -Eq '^gpgcheck=1' "$repo_tmp" || die 'The Tailscale repository does not enable GPG verification.'
install -d -m 0755 /etc/yum.repos.d
install -m 0644 "$repo_tmp" /etc/yum.repos.d/tailscale.repo
dnf -y install tailscale

service_enable_now tailscaled
have tailscale || die 'Tailscale installation completed without providing the tailscale command.'
log "Tailscale installed: $(tailscale version | head -n 1)"
cat <<'EOF'

Authentication still needs a human-controlled tailnet login. On AL2023 default to:
  sudo tailscale up --accept-dns=false --ssh=false

--accept-dns=false avoids the documented AL2023 DNS forwarding-loop risk.
Enabling MagicDNS or changing resolver mode is separate requested work.

Open the displayed URL, then verify with:
  tailscale status
  tailscale ip -4
  tailscale ip -6
  # confirm ordinary host DNS still resolves

This skill uses traditional OpenSSH over Tailscale; Tailscale SSH must remain disabled.
EOF
