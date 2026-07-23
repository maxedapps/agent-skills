#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/ubuntu/close-public-ssh.sh --confirmed-tailscale-ssh-tested

Removes public SSH from UFW while retaining traditional OpenSSH over Tailscale.
Supply the confirmation only after an independent Tailscale SSH test.
For provider-only ingress, follow the provider workflow instead.
EOF
}

ORIGINAL_ARGS=("$@")
CONFIRMED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirmed-tailscale-ssh-tested) CONFIRMED=true; shift ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
[[ $CONFIRMED == true ]] || die 'First test traditional SSH over Tailscale from a separate client, then supply --confirmed-tailscale-ssh-tested.'
require_root "${ORIGINAL_ARGS[@]}"
require_profile ubuntu
have tailscale || die 'Tailscale is not installed.'
tailscale status >/dev/null 2>&1 || die 'Tailscale is not connected.'
[[ -d /sys/class/net/tailscale0 ]] || die 'The tailscale0 interface is unavailable.'
SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'
have ufw || die 'UFW is not installed.'
ufw status 2>/dev/null | grep -q '^Status: active' || die 'UFW is not active; public SSH was not changed.'

status=$(ufw status numbered)
unknown=$(grep -E '^\[[[:space:]]*[0-9]+\]' <<<"$status" | grep -v 'Agent Recipes' || true)
if [[ -n $unknown ]]; then
  printf '%s\n' "$unknown" >&2
  die 'UFW contains unrecognized rules. Review them before closing public SSH so no hidden allowance is missed.'
fi

ufw allow in on tailscale0 to any port "$SSH_PORT" proto tcp comment 'Agent Recipes SSH over Tailscale'
status=$(ufw status numbered)
numbers=$(awk '/Agent Recipes temporary public SSH/ {line=$0; sub(/^\[[[:space:]]*/, "", line); sub(/\].*/, "", line); print line}' <<<"$status" | sort -rn)
while IFS= read -r number; do
  [[ -n $number ]] && ufw --force delete "$number"
done <<<"$numbers"
ufw reload

status=$(ufw status numbered)
remaining=$(grep 'Agent Recipes temporary public SSH' <<<"$status" || true)
[[ -z $remaining ]] || die 'The managed public SSH rule still exists after removal.'
unknown=$(grep -E '^\[[[:space:]]*[0-9]+\]' <<<"$status" | grep -v 'Agent Recipes' || true)
[[ -z $unknown ]] || die 'An unrecognized UFW rule appeared during closure; public SSH status is uncertain.'
grep -q 'Agent Recipes SSH over Tailscale' <<<"$status" || die 'The Tailscale SSH firewall rule is missing.'
ufw status verbose

log 'No public SSH allowance remains in the managed UFW host firewall.'
cat <<EOF
Keep this session open and verify both paths from another machine:
  ssh -p $SSH_PORT <admin>@<tailscale-ip-or-magicdns-name>   # must succeed
  ssh -p $SSH_PORT <admin>@<public-ip>                       # must fail or time out

Also remove public TCP port $SSH_PORT from the VPS provider firewall when applicable.
Use the provider console or rescue mode if Tailscale access is later lost.
EOF
