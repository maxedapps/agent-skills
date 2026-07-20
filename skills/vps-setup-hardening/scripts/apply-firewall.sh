#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/apply-firewall.sh [--allow-tcp PORT]... [--allow-udp PORT]...
    [--docker-planned --confirmed-docker-ingress-control]

Creates a known default-deny host-input baseline while preserving the current
SSH port. Existing unrecognized firewall rules cause a safe stop instead of
being kept or reset silently. Public SSH remains open until close-public-ssh.sh.

UFW does not control Docker-published traffic. When Docker is planned, this
script requires confirmation that a provider firewall or reviewed Docker-aware
control will govern published-port ingress.
EOF
}

ORIGINAL_ARGS=("$@")
TCP_PORTS=()
UDP_PORTS=()
DOCKER_PLANNED=false
DOCKER_INGRESS_CONFIRMED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-tcp) [[ $# -ge 2 ]] || die '--allow-tcp requires a port.'; TCP_PORTS+=("$2"); shift 2 ;;
    --allow-udp) [[ $# -ge 2 ]] || die '--allow-udp requires a port.'; UDP_PORTS+=("$2"); shift 2 ;;
    --docker-planned) DOCKER_PLANNED=true; shift ;;
    --confirmed-docker-ingress-control) DOCKER_INGRESS_CONFIRMED=true; shift ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
if [[ $DOCKER_INGRESS_CONFIRMED == true && $DOCKER_PLANNED == false ]]; then
  die '--confirmed-docker-ingress-control is valid only with --docker-planned.'
fi
if [[ $DOCKER_PLANNED == true && $DOCKER_INGRESS_CONFIRMED == false ]]; then
  die 'Docker-published traffic can bypass host-input rules. First establish and approve a provider firewall or reviewed Docker-aware control, then supply --confirmed-docker-ingress-control.'
fi

validate_port() {
  [[ $1 =~ ^[0-9]+$ && $1 -ge 1 && $1 -le 65535 ]] || die "Invalid port: $1"
}
for port in "${TCP_PORTS[@]}" "${UDP_PORTS[@]}"; do
  [[ -n $port ]] && validate_port "$port"
done
SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'
log "Preserving public SSH on TCP port $SSH_PORT."

UFW_ACTIVE=false
FIREWALLD_ACTIVE=false
if have ufw && ufw status 2>/dev/null | grep -q '^Status: active'; then UFW_ACTIVE=true; fi
if have firewall-cmd && firewall-cmd --state 2>/dev/null | grep -q '^running$'; then FIREWALLD_ACTIVE=true; fi
if [[ $UFW_ACTIVE == true && $FIREWALLD_ACTIVE == true ]]; then
  die 'Both UFW and firewalld are active. Resolve the conflicting firewall managers before continuing.'
fi

UNMANAGED_POLICY=false
if [[ $UFW_ACTIVE == false && $FIREWALLD_ACTIVE == false ]]; then
  if have nft && nft list ruleset 2>/dev/null | grep -q 'hook input'; then UNMANAGED_POLICY=true; fi
  if have iptables-save && iptables-save 2>/dev/null | grep -q '^-A INPUT'; then UNMANAGED_POLICY=true; fi
fi
if [[ $UNMANAGED_POLICY == true ]]; then
  die 'An unmanaged input firewall policy already exists. Review it manually; this script will not activate another firewall or overwrite it.'
fi

if [[ $UFW_ACTIVE == true ]]; then
  BACKEND=ufw
elif [[ $FIREWALLD_ACTIVE == true ]]; then
  BACKEND=firewalld
elif have ufw; then
  BACKEND=ufw
elif have firewall-cmd && have firewall-offline-cmd; then
  BACKEND=firewalld
else
  die 'Neither UFW nor firewalld is safely available. Adapt this phase to the existing distribution firewall without replacing unknown rules.'
fi

TAILSCALE_ACTIVE=false
if have tailscale && tailscale status >/dev/null 2>&1 && [[ -d /sys/class/net/tailscale0 ]]; then
  TAILSCALE_ACTIVE=true
fi

configure_ufw() {
  local status unknown port
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
}

configure_firewalld() {
  local zone active item state_dir state_file public_interface actual_zone policies policy
  active=$FIREWALLD_ACTIVE
  public_interface=$(detect_public_interface) || die 'Could not determine the internet-facing default-route interface.'
  state_dir=/var/lib/agent-recipes
  state_file=$state_dir/firewalld-public-ports

  if [[ $active == true ]]; then
    zone=$(firewalld_public_zone) || die 'Could not map the public interface to an active firewalld zone.'
  else
    zone=$(firewall-offline-cmd --get-zone-of-interface="$public_interface" 2>/dev/null || true)
    if [[ -z $zone || $zone == no\ zone ]]; then
      zone=$(firewall-offline-cmd --get-default-zone)
      firewall-offline-cmd --zone="$zone" --add-interface="$public_interface" >/dev/null
    fi
  fi

  validate_firewalld_view() {
    local mode=$1 phase=$2 target services ports value allowed
    local -a command
    case "$mode" in
      runtime) command=(firewall-cmd --zone="$zone") ;;
      permanent) command=(firewall-cmd --permanent --zone="$zone") ;;
      offline) command=(firewall-offline-cmd --zone="$zone") ;;
      *) die "Unknown firewalld validation mode: $mode" ;;
    esac
    target=$("${command[@]}" --get-target)
    [[ $target != ACCEPT ]] || die "firewalld $mode zone '$zone' has target ACCEPT instead of default-deny."
    for option in --list-rich-rules --list-source-ports --list-forward-ports --list-protocols; do
      value=$("${command[@]}" "$option" 2>/dev/null || true)
      [[ -z $value ]] || die "Unsupported firewalld $mode rule '$option' exists in zone '$zone': $value"
    done
    services=$("${command[@]}" --list-services)
    for item in $services; do
      allowed=false
      [[ $item == dhcpv6-client ]] && allowed=true
      [[ $item == ssh && $phase == preflight ]] && allowed=true
      [[ $item == ssh && $phase == final && $SSH_PORT == 22 ]] && allowed=true
      [[ $allowed == true ]] || die "Unexpected service '$item' is allowed in firewalld $mode zone '$zone'."
    done
    ports=$("${command[@]}" --list-ports)
    for item in $ports; do
      allowed=false
      [[ $item == "$SSH_PORT/tcp" ]] && allowed=true
      for port in "${TCP_PORTS[@]}"; do [[ $item == "$port/tcp" ]] && allowed=true; done
      for port in "${UDP_PORTS[@]}"; do [[ $item == "$port/udp" ]] && allowed=true; done
      if [[ $phase == preflight && -r $state_file ]] && grep -Fxq "$item" "$state_file"; then allowed=true; fi
      [[ $allowed == true ]] || die "Unexpected port '$item' is allowed in firewalld $mode zone '$zone'."
    done
  }

  validate_firewalld_global() {
    local mode=$1 direct
    if [[ $mode == runtime ]]; then
      direct=$(firewall-cmd --direct --get-all-rules 2>/dev/null || true)
      policies=$(firewall-cmd --get-policies 2>/dev/null || true)
    elif [[ $mode == permanent ]]; then
      direct=$(firewall-cmd --permanent --direct --get-all-rules 2>/dev/null || true)
      policies=$(firewall-cmd --permanent --get-policies 2>/dev/null || true)
    else
      direct=$(firewall-offline-cmd --direct --get-all-rules 2>/dev/null || true)
      policies=$(firewall-offline-cmd --get-policies 2>/dev/null || true)
    fi
    [[ -z $direct ]] || die "Unsupported firewalld $mode direct rules exist: $direct"
    for policy in $policies; do
      [[ $policy == allow-host-ipv6 ]] || die "Unexpected firewalld $mode policy exists: $policy"
    done
  }

  if [[ $active == true ]]; then
    validate_firewalld_global runtime
    validate_firewalld_global permanent
    validate_firewalld_view runtime preflight
    validate_firewalld_view permanent preflight
  else
    validate_firewalld_global offline
    validate_firewalld_view offline preflight
  fi

  fw_apply() {
    if [[ $active == true ]]; then
      firewall-cmd --zone="$zone" "$@"
      firewall-cmd --permanent --zone="$zone" "$@"
    else
      firewall-offline-cmd --zone="$zone" "$@"
    fi
  }
  fw_remove() {
    if [[ $active == true ]]; then
      firewall-cmd --zone="$zone" "$@" >/dev/null 2>&1 || true
      firewall-cmd --permanent --zone="$zone" "$@" >/dev/null 2>&1 || true
    else
      firewall-offline-cmd --zone="$zone" "$@" >/dev/null 2>&1 || true
    fi
  }

  if [[ -r $state_file ]]; then
    while IFS= read -r item; do [[ -n $item ]] && fw_remove --remove-port="$item"; done <"$state_file"
  fi
  if [[ $SSH_PORT == 22 ]]; then
    fw_apply --add-service=ssh >/dev/null
  else
    fw_remove --remove-service=ssh
    fw_apply --add-port="$SSH_PORT/tcp" >/dev/null
  fi
  for port in "${TCP_PORTS[@]}"; do fw_apply --add-port="$port/tcp" >/dev/null; done
  for port in "${UDP_PORTS[@]}"; do fw_apply --add-port="$port/udp" >/dev/null; done

  install -d -m 0755 "$state_dir"
  : >"$state_file"
  for port in "${TCP_PORTS[@]}"; do printf '%s/tcp\n' "$port" >>"$state_file"; done
  for port in "${UDP_PORTS[@]}"; do printf '%s/udp\n' "$port" >>"$state_file"; done
  chmod 0644 "$state_file"

  if [[ $active == false ]]; then
    service_enable_now firewalld
  else
    firewall-cmd --reload
  fi
  firewall-cmd --state | grep -q '^running$' || die 'firewalld did not start successfully.'
  actual_zone=$(firewalld_public_zone) || die 'Could not verify the public interface firewalld zone after activation.'
  [[ $actual_zone == "$zone" ]] || die "Rules were staged in zone '$zone', but public interface '$public_interface' uses '$actual_zone'."
  validate_firewalld_global runtime
  validate_firewalld_global permanent
  validate_firewalld_view runtime final
  validate_firewalld_view permanent final
  if [[ $SSH_PORT == 22 ]]; then
    firewall-cmd --zone="$zone" --query-service=ssh >/dev/null || die "SSH is not allowed in active firewalld zone '$zone'."
  else
    firewall-cmd --zone="$zone" --query-port="$SSH_PORT/tcp" >/dev/null || die "SSH port $SSH_PORT is not allowed in active firewalld zone '$zone'."
  fi
  firewall-cmd --zone="$zone" --list-all
}

case "$BACKEND" in
  ufw) configure_ufw ;;
  firewalld) configure_firewalld ;;
  *) die "Unsupported firewall backend: $BACKEND" ;;
esac

log "Host-input firewall baseline enabled with $BACKEND. Public SSH is intentionally still available."
if [[ $DOCKER_PLANNED == true ]]; then
  warn 'This host-input baseline is not the confirmed control for Docker-published ports. Verify the separate ingress control externally.'
fi
echo "From another machine, test: ssh -p $SSH_PORT <admin>@<public-ip-or-hostname>"
