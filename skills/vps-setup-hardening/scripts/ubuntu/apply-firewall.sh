#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/ubuntu/apply-firewall.sh [--allow-tcp PORT]... [--allow-udp PORT]...

Creates a known default-deny UFW host-input baseline while preserving the
current SSH port. Existing unrecognized UFW rules cause a safe stop.
Public SSH remains open until close-public-ssh.sh.

UFW does not control Docker-published traffic. Do not use this script when
Docker is planned; establish a verified provider firewall instead.
EOF
}

ORIGINAL_ARGS=("$@")
TCP_PORTS=()
UDP_PORTS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-tcp) [[ $# -ge 2 ]] || die '--allow-tcp requires a port.'; TCP_PORTS+=("$2"); shift 2 ;;
    --allow-udp) [[ $# -ge 2 ]] || die '--allow-udp requires a port.'; UDP_PORTS+=("$2"); shift 2 ;;
    --docker-planned|--confirmed-docker-ingress-control)
      die "Removed flag '$1'. Docker requires provider/external ingress; do not apply UFW as the Docker boundary."
      ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
require_profile ubuntu
if have docker; then
  die 'Docker is present. UFW host-input rules do not govern Docker-published traffic. Use external/provider ingress instead of apply-firewall.sh.'
fi

validate_port() {
  [[ $1 =~ ^[0-9]+$ && $1 -ge 1 && $1 -le 65535 ]] || die "Invalid port: $1"
}
for port in "${TCP_PORTS[@]}" "${UDP_PORTS[@]}"; do
  [[ -n $port ]] && validate_port "$port"
done
SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'
log "Preserving public SSH on TCP port $SSH_PORT."

have ufw || die 'UFW is not installed. Run ubuntu/apply-base-setup.sh --ingress host first, or use external provider ingress.'

UFW_ACTIVE=false
if ufw status 2>/dev/null | grep -q '^Status: active'; then UFW_ACTIVE=true; fi

if [[ $UFW_ACTIVE == false ]]; then
  if have nft && nft list ruleset 2>/dev/null | grep -q 'hook input'; then
    if ! nft list ruleset 2>/dev/null | grep -qi ufw; then
      die 'An unmanaged input firewall policy already exists. Review it manually; this script will not activate UFW over it.'
    fi
  fi
  if have iptables-save && iptables-save 2>/dev/null | grep -q '^-A INPUT' \
    && ! iptables-save 2>/dev/null | grep -qi ufw; then
    die 'An unmanaged iptables INPUT policy already exists. Review it manually; this script will not activate UFW over it.'
  fi
fi

status=$(ufw status numbered 2>/dev/null || true)
unknown=$(grep -E '^\[[[:space:]]*[0-9]+\]' <<<"$status" | grep -v 'Agent Recipes' || true)
if [[ -n $unknown ]]; then
  printf '%s\n' "$unknown" >&2
  die 'UFW contains rules not managed by this skill. Review them explicitly before applying a new baseline.'
fi
if have ip && ip -6 -o addr show scope global 2>/dev/null | grep -q . \
  && grep -Eq '^[[:space:]]*IPV6[[:space:]]*=[[:space:]]*no' /etc/default/ufw 2>/dev/null; then
  die 'The host has a global IPv6 address but UFW IPv6 filtering is disabled. Enable and review IPv6 support before continuing.'
fi

if grep -Eq '^\[[[:space:]]*[0-9]+\]' <<<"$status"; then
  log 'Resetting the previously managed UFW baseline before reconciling requested ports.'
  ufw --force reset
fi

TAILSCALE_ACTIVE=false
if have tailscale && tailscale status >/dev/null 2>&1 && [[ -d /sys/class/net/tailscale0 ]]; then
  TAILSCALE_ACTIVE=true
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp" comment 'Agent Recipes temporary public SSH'
if [[ $TAILSCALE_ACTIVE == true ]]; then
  ufw allow in on tailscale0 to any port "$SSH_PORT" proto tcp comment 'Agent Recipes SSH over Tailscale'
fi
for port in "${TCP_PORTS[@]}"; do ufw allow "$port/tcp" comment 'Agent Recipes public TCP'; done
for port in "${UDP_PORTS[@]}"; do ufw allow "$port/udp" comment 'Agent Recipes public UDP'; done
ufw logging low
ufw --force enable
ufw status verbose

log 'UFW host-input baseline enabled. Public SSH is intentionally still available.'
echo "From another machine, test: ssh -p $SSH_PORT <admin>@<public-ip-or-hostname>"
