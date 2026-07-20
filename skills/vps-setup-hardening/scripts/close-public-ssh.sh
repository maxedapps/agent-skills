#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/close-public-ssh.sh --confirmed-tailscale-ssh-tested

Removes public SSH from a supported host firewall while retaining traditional
OpenSSH over Tailscale. Supply the confirmation only after an independent
Tailscale SSH test. For an external/provider-only firewall strategy, follow the
provider workflow in references/workflow.md instead; this script cannot change provider rules.
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
require_root "${ORIGINAL_ARGS[@]}"
[[ $CONFIRMED == true ]] || die 'First test traditional SSH over Tailscale from a separate client, then supply --confirmed-tailscale-ssh-tested.'
have tailscale || die 'Tailscale is not installed.'
tailscale status >/dev/null 2>&1 || die 'Tailscale is not connected.'
[[ -d /sys/class/net/tailscale0 ]] || die 'The tailscale0 interface is unavailable.'
SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'

UFW_ACTIVE=false
FIREWALLD_ACTIVE=false
if have ufw && ufw status 2>/dev/null | grep -q '^Status: active'; then UFW_ACTIVE=true; fi
if have firewall-cmd && firewall-cmd --state 2>/dev/null | grep -q '^running$'; then FIREWALLD_ACTIVE=true; fi
if [[ $UFW_ACTIVE == true && $FIREWALLD_ACTIVE == true ]]; then
  die 'Both UFW and firewalld are active. Public SSH was not changed.'
fi

close_ufw() {
  local status unknown numbers number remaining
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
}

close_firewalld() {
  local zone mode option service ports remaining='' value direct policies policy public_zone target
  local -a FW_ARGS
  public_zone=$(firewalld_public_zone) || die 'Could not identify the public firewalld zone before closing SSH.'
  target=$(firewall-cmd --zone="$public_zone" --get-target)
  [[ $target != ACCEPT ]] || die "Runtime public firewalld zone '$public_zone' has target ACCEPT; public SSH cannot be closed by removing a port rule."
  target=$(firewall-cmd --permanent --zone="$public_zone" --get-target)
  [[ $target != ACCEPT ]] || die "Permanent public firewalld zone '$public_zone' has target ACCEPT; review it before closing SSH."

  # Complete every fail-closed check before creating zones, assigning interfaces,
  # adding allowances, removing public SSH, or reloading firewalld.
  for zone in $(firewall-cmd --get-zones); do
    [[ $zone == tailscale ]] && continue
    for mode in runtime permanent; do
      if [[ $mode == permanent ]]; then FW_ARGS=(--permanent --zone="$zone"); else FW_ARGS=(--zone="$zone"); fi
      for option in --list-rich-rules --list-source-ports --list-forward-ports --list-protocols; do
        value=$(firewall-cmd "${FW_ARGS[@]}" "$option" 2>/dev/null || true)
        [[ -z $value ]] || die "Unsupported firewalld $mode rule '$option' in zone '$zone' must be reviewed before closing SSH: $value"
      done
    done
  done
  direct=$(firewall-cmd --direct --get-all-rules 2>/dev/null || true)
  [[ -z $direct ]] || die "Unsupported runtime firewalld direct rules must be reviewed before closing SSH: $direct"
  direct=$(firewall-cmd --permanent --direct --get-all-rules 2>/dev/null || true)
  [[ -z $direct ]] || die "Unsupported permanent firewalld direct rules must be reviewed before closing SSH: $direct"
  for mode in runtime permanent; do
    if [[ $mode == permanent ]]; then
      policies=$(firewall-cmd --permanent --get-policies 2>/dev/null || true)
    else
      policies=$(firewall-cmd --get-policies 2>/dev/null || true)
    fi
    for policy in $policies; do
      [[ $policy == allow-host-ipv6 || $policy == docker-forwarding ]] \
        || die "Unexpected firewalld $mode policy must be reviewed before closing SSH: $policy"
    done
  done

  if ! firewall-cmd --get-zones | tr ' ' '\n' | grep -qx tailscale; then
    firewall-cmd --permanent --new-zone=tailscale
    firewall-cmd --reload
  fi
  firewall-cmd --zone=tailscale --change-interface=tailscale0
  firewall-cmd --permanent --zone=tailscale --change-interface=tailscale0
  firewall-cmd --zone=tailscale --add-port="$SSH_PORT/tcp"
  firewall-cmd --permanent --zone=tailscale --add-port="$SSH_PORT/tcp"

  for zone in $(firewall-cmd --get-zones); do
    [[ $zone == tailscale ]] && continue
    firewall-cmd --zone="$zone" --remove-service=ssh >/dev/null 2>&1 || true
    firewall-cmd --permanent --zone="$zone" --remove-service=ssh >/dev/null 2>&1 || true
    firewall-cmd --zone="$zone" --remove-port="$SSH_PORT/tcp" >/dev/null 2>&1 || true
    firewall-cmd --permanent --zone="$zone" --remove-port="$SSH_PORT/tcp" >/dev/null 2>&1 || true
  done
  firewall-cmd --reload
  target=$(firewall-cmd --zone="$public_zone" --get-target)
  [[ $target != ACCEPT ]] || die "Public firewalld zone '$public_zone' became ACCEPT after reload."

  for zone in $(firewall-cmd --get-zones); do
    [[ $zone == tailscale ]] && continue
    if firewall-cmd --permanent --zone="$zone" --query-service=ssh >/dev/null 2>&1 \
      || firewall-cmd --permanent --zone="$zone" --query-port="$SSH_PORT/tcp" >/dev/null 2>&1; then
      remaining+=" $zone"
    fi
    for service in $(firewall-cmd --permanent --zone="$zone" --list-services); do
      ports=$(firewall-cmd --permanent --info-service="$service" 2>/dev/null | awk -F': ' '$1 ~ /^[[:space:]]*ports$/ {print $2}')
      if grep -Eq "(^|[[:space:]])${SSH_PORT}/tcp($|[[:space:]])" <<<"$ports"; then
        remaining+=" ${zone}:${service}"
      fi
    done
  done
  [[ -z $remaining ]] || die "SSH may still be public through firewalld:${remaining}"
  firewall-cmd --zone=tailscale --query-port="$SSH_PORT/tcp" >/dev/null || die 'The Tailscale firewalld zone does not allow the SSH port.'
  firewall-cmd --get-active-zones
}

if [[ $UFW_ACTIVE == true ]]; then
  close_ufw
elif [[ $FIREWALLD_ACTIVE == true ]]; then
  close_firewalld
else
  die 'No active supported firewall was found; public SSH was not changed.'
fi

log 'No public SSH allowance remains in the managed host firewall.'
cat <<EOF
Keep this session open and verify both paths from another machine:
  ssh -p $SSH_PORT <admin>@<tailscale-ip-or-magicdns-name>   # must succeed
  ssh -p $SSH_PORT <admin>@<public-ip>                       # must fail or time out

Also remove public TCP port $SSH_PORT from the VPS provider firewall/security group.
Use the provider console or rescue mode if Tailscale access is later lost.
EOF
