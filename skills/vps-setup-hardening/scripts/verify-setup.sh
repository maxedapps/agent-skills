#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/verify-setup.sh --firewall host|external [--admin USER]
    [--ssh-access public|tailscale-only]
    [--confirmed-external-firewall-tested]

Checks the local baseline and expected SSH-access mode, prints listeners and
published container ports, and emits a concise current-state report.

External mode never claims to classify a provider or separate Docker-aware
policy locally. It requires the confirmation flag after intended access and
public IPv4/IPv6 exposure have been tested independently.
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
SSH_ACCESS=public
FIREWALL_MODE=''
EXTERNAL_FIREWALL_CONFIRMED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --ssh-access) [[ $# -ge 2 ]] || die '--ssh-access requires a value.'; SSH_ACCESS=$2; shift 2 ;;
    --firewall) [[ $# -ge 2 ]] || die '--firewall requires host or external.'; FIREWALL_MODE=$2; shift 2 ;;
    --confirmed-external-firewall-tested) EXTERNAL_FIREWALL_CONFIRMED=true; shift ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
[[ $SSH_ACCESS == public || $SSH_ACCESS == tailscale-only ]] || die '--ssh-access must be public or tailscale-only.'
[[ $FIREWALL_MODE == host || $FIREWALL_MODE == external ]] || die '--firewall must be host or external.'
if [[ $EXTERNAL_FIREWALL_CONFIRMED == true && $FIREWALL_MODE != external ]]; then
  die '--confirmed-external-firewall-tested is valid only with --firewall external.'
fi
if [[ $FIREWALL_MODE == external && $EXTERNAL_FIREWALL_CONFIRMED == false ]]; then
  die 'External firewall mode requires completed independent access and public IPv4/IPv6 exposure tests, then --confirmed-external-firewall-tested.'
fi
SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'

FAILURES=0
WARNINGS=0
pass() { printf '[PASS] %s\n' "$*"; }
fail() { printf '[FAIL] %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
check_warn() { printf '[WARN] %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }

if [[ -n $ADMIN ]]; then
  if id "$ADMIN" >/dev/null 2>&1; then
    pass "Administrator exists: $ADMIN"
    ADMIN_HOME=$(getent passwd "$ADMIN" | awk -F: '{print $6}')
    if [[ -s "$ADMIN_HOME/.ssh/authorized_keys" ]]; then pass "$ADMIN has authorized SSH keys"; else fail "$ADMIN has no authorized SSH keys"; fi
    if sudo -n -u "$ADMIN" sudo -n true >/dev/null 2>&1; then pass "$ADMIN has non-interactive sudo"; else check_warn "$ADMIN does not have non-interactive sudo"; fi
  else
    fail "Administrator does not exist: $ADMIN"
  fi
else
  check_warn 'No --admin USER was supplied; administrator checks were skipped.'
fi

if have sshd; then
  if sshd -t; then pass 'sshd configuration syntax is valid'; else fail 'sshd configuration syntax is invalid'; fi
  EFFECTIVE=$(sshd -T 2>/dev/null || true)
  ssh_value() { awk -v key="$1" '$1 == key {print $2; exit}' <<<"$EFFECTIVE"; }
  if [[ $(ssh_value permitrootlogin) == no ]]; then pass 'Direct root SSH login is disabled'; else fail 'Direct root SSH login is not disabled'; fi
  if [[ $(ssh_value passwordauthentication) == no ]]; then pass 'SSH password authentication is disabled'; else fail 'SSH password authentication is not disabled'; fi
  if [[ $(ssh_value kbdinteractiveauthentication) == no ]]; then pass 'SSH keyboard-interactive authentication is disabled'; else fail 'SSH keyboard-interactive authentication is not disabled'; fi
  if [[ $(ssh_value pubkeyauthentication) == yes ]]; then pass 'SSH public-key authentication is enabled'; else fail 'SSH public-key authentication is not enabled'; fi
else
  fail 'sshd is unavailable'
fi

UFW_ACTIVE=false
FIREWALLD_ACTIVE=false
if have ufw && ufw status 2>/dev/null | grep -q '^Status: active'; then UFW_ACTIVE=true; fi
if have firewall-cmd && firewall-cmd --state 2>/dev/null | grep -q '^running$'; then FIREWALLD_ACTIVE=true; fi

if [[ $FIREWALL_MODE == external ]]; then
  pass 'External firewall mode selected; separate ingress policy is not classified locally'
  pass 'Independent intended-access and public IPv4/IPv6 exposure tests were confirmed'
  if [[ $UFW_ACTIVE == true || $FIREWALLD_ACTIVE == true ]]; then
    check_warn 'A host firewall is also active; external mode does not classify its rules'
  fi
else
if [[ $UFW_ACTIVE == true && $FIREWALLD_ACTIVE == true ]]; then
  fail 'Both UFW and firewalld are active'
elif [[ $UFW_ACTIVE == true ]]; then
  UFW_STATUS=$(ufw status numbered)
  pass 'UFW is active'
  UFW_UNKNOWN=$(grep -E '^\[[[:space:]]*[0-9]+\]' <<<"$UFW_STATUS" | grep -v 'Agent Recipes' || true)
  if [[ -z $UFW_UNKNOWN ]]; then pass 'UFW contains only recognized skill rules'; else fail 'UFW contains unrecognized rules that require review'; fi
  if [[ $SSH_ACCESS == tailscale-only ]]; then
    if grep -q 'Agent Recipes SSH over Tailscale' <<<"$UFW_STATUS"; then pass 'UFW permits SSH over Tailscale'; else fail 'UFW lacks the managed Tailscale SSH rule'; fi
    if grep -q 'Agent Recipes temporary public SSH' <<<"$UFW_STATUS"; then fail 'UFW still permits managed public SSH'; else pass 'UFW managed public SSH rule is absent'; fi
  else
    if grep -q 'Agent Recipes temporary public SSH' <<<"$UFW_STATUS"; then pass 'UFW permits managed public SSH'; else check_warn 'The managed public SSH rule was not recognized'; fi
  fi
elif [[ $FIREWALLD_ACTIVE == true ]]; then
  pass 'firewalld is active'
  PUBLIC_ZONE=$(firewalld_public_zone || true)
  if [[ -z $PUBLIC_ZONE ]]; then
    fail 'The public firewalld zone could not be determined'
  else
    RUNTIME_TARGET=$(firewall-cmd --zone="$PUBLIC_ZONE" --get-target 2>/dev/null || true)
    PERMANENT_TARGET=$(firewall-cmd --permanent --zone="$PUBLIC_ZONE" --get-target 2>/dev/null || true)
    if [[ $RUNTIME_TARGET != ACCEPT && $PERMANENT_TARGET != ACCEPT ]]; then pass "Public firewalld zone $PUBLIC_ZONE is default-deny"; else fail "Public firewalld zone $PUBLIC_ZONE has target ACCEPT"; fi
  fi
  FIREWALLD_ADVANCED=''
  for zone in $(firewall-cmd --get-zones); do
    [[ $zone == tailscale ]] && continue
    for mode in runtime permanent; do
      if [[ $mode == permanent ]]; then FW_ARGS=(--permanent --zone="$zone"); else FW_ARGS=(--zone="$zone"); fi
      for option in --list-rich-rules --list-source-ports --list-forward-ports --list-protocols; do
        VALUE=$(firewall-cmd "${FW_ARGS[@]}" "$option" 2>/dev/null || true)
        [[ -n $VALUE ]] && FIREWALLD_ADVANCED+=" ${zone}:${mode}:${option}"
      done
    done
  done
  DIRECT_RUNTIME=$(firewall-cmd --direct --get-all-rules 2>/dev/null || true)
  DIRECT_PERMANENT=$(firewall-cmd --permanent --direct --get-all-rules 2>/dev/null || true)
  [[ -z $DIRECT_RUNTIME && -z $DIRECT_PERMANENT ]] || FIREWALLD_ADVANCED+=' direct-rules'
  for mode in runtime permanent; do
    if [[ $mode == permanent ]]; then POLICIES=$(firewall-cmd --permanent --get-policies 2>/dev/null || true); else POLICIES=$(firewall-cmd --get-policies 2>/dev/null || true); fi
    for policy in $POLICIES; do
      [[ $policy == allow-host-ipv6 || $policy == docker-forwarding ]] || FIREWALLD_ADVANCED+=" unexpected-policy:${mode}:${policy}"
    done
  done
  if [[ -z $FIREWALLD_ADVANCED ]]; then pass 'No unsupported firewalld rich/direct exposure rules were found'; else fail "Unsupported firewalld rules require review:${FIREWALLD_ADVANCED}"; fi

  if [[ $SSH_ACCESS == tailscale-only ]]; then
    FIREWALLD_REMAINING=''
    for zone in $(firewall-cmd --get-zones); do
      [[ $zone == tailscale ]] && continue
      for mode in runtime permanent; do
        if [[ $mode == permanent ]]; then FW_ARGS=(--permanent --zone="$zone"); INFO_ARGS=(--permanent); else FW_ARGS=(--zone="$zone"); INFO_ARGS=(); fi
        if firewall-cmd "${FW_ARGS[@]}" --query-service=ssh >/dev/null 2>&1 \
          || firewall-cmd "${FW_ARGS[@]}" --query-port="$SSH_PORT/tcp" >/dev/null 2>&1; then
          FIREWALLD_REMAINING+=" ${zone}:${mode}"
        fi
        for service in $(firewall-cmd "${FW_ARGS[@]}" --list-services); do
          SERVICE_PORTS=$(firewall-cmd "${INFO_ARGS[@]}" --info-service="$service" 2>/dev/null | awk -F': ' '$1 ~ /^[[:space:]]*ports$/ {print $2}')
          if grep -Eq "(^|[[:space:]])${SSH_PORT}/tcp($|[[:space:]])" <<<"$SERVICE_PORTS"; then
            FIREWALLD_REMAINING+=" ${zone}:${mode}:${service}"
          fi
        done
      done
    done
    if [[ -z $FIREWALLD_REMAINING ]]; then pass 'firewalld has no standard public SSH allowance'; else fail "firewalld still allows SSH in:${FIREWALLD_REMAINING}"; fi
    if firewall-cmd --zone=tailscale --query-port="$SSH_PORT/tcp" >/dev/null 2>&1; then pass 'firewalld permits SSH in the Tailscale zone'; else fail 'firewalld lacks Tailscale-zone SSH access'; fi
  else
    if [[ -n $PUBLIC_ZONE ]] && { firewall-cmd --zone="$PUBLIC_ZONE" --query-service=ssh >/dev/null 2>&1 || firewall-cmd --zone="$PUBLIC_ZONE" --query-port="$SSH_PORT/tcp" >/dev/null 2>&1; }; then
      pass "firewalld permits public SSH in zone $PUBLIC_ZONE"
    else
      check_warn 'A public SSH firewalld allowance was not recognized'
    fi
  fi
elif have nft && nft list ruleset 2>/dev/null | grep -q .; then
  check_warn 'An nftables ruleset exists but this verifier cannot classify its policy safely.'
else
  fail 'No active supported host firewall was found'
fi
fi

if have tailscale; then
  if tailscale status >/dev/null 2>&1 && [[ -d /sys/class/net/tailscale0 ]]; then
    pass "Tailscale is connected: $(tailscale ip -4 2>/dev/null || printf 'address unavailable')"
  else
    check_warn 'Tailscale is installed but not connected.'
  fi
  TAILSCALE_PREFS=$(tailscale debug prefs 2>/dev/null || true)
  if grep -Eq '"RunSSH"[[:space:]]*:[[:space:]]*false' <<<"$TAILSCALE_PREFS"; then
    pass 'Tailscale SSH is disabled; traditional OpenSSH remains in use'
  elif grep -Eq '"RunSSH"[[:space:]]*:[[:space:]]*true' <<<"$TAILSCALE_PREFS"; then
    fail 'Tailscale SSH is enabled but must remain disabled for this workflow'
  else
    check_warn 'Tailscale SSH state could not be determined from local preferences'
  fi
elif [[ $SSH_ACCESS == tailscale-only ]]; then
  fail 'Tailscale-only SSH was requested but Tailscale is not installed'
fi

if have timedatectl; then
  if [[ $(timedatectl show -p NTPSynchronized --value 2>/dev/null) == yes ]]; then pass 'System time is synchronized'; else check_warn 'System time is not reported as synchronized'; fi
elif have chronyc; then
  if chronyc tracking >/dev/null 2>&1; then pass 'chrony is responding'; else check_warn 'chrony did not report synchronization status'; fi
else
  check_warn 'Time synchronization status could not be determined.'
fi

if have aa-status; then
  if aa-status --enabled >/dev/null 2>&1; then pass 'AppArmor is enabled'; else check_warn 'AppArmor is not enabled'; fi
elif have getenforce; then
  if [[ $(getenforce) == Enforcing ]]; then pass 'SELinux is enforcing'; else check_warn "SELinux mode is $(getenforce)"; fi
else
  check_warn 'No AppArmor or SELinux status utility was found.'
fi

if [[ -f /etc/apt/apt.conf.d/20auto-upgrades ]] \
  && grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades; then
  pass 'APT unattended upgrades are enabled'
elif have systemctl && systemctl is-enabled --quiet dnf-automatic.timer 2>/dev/null; then
  pass 'DNF automatic updates are enabled'
else
  check_warn 'Automatic security updates were not recognized by this verifier.'
fi
if grep -Rqs 'Automatic-Reboot "true"' /etc/apt/apt.conf.d 2>/dev/null; then
  fail 'APT unattended upgrades are configured to reboot automatically'
else
  pass 'No APT automatic-reboot setting was found'
fi

if [[ -e /var/run/reboot-required ]]; then check_warn 'A reboot is required'; else pass 'No reboot-required marker is present'; fi

if have systemctl; then
  FAILED_UNITS=$(systemctl --failed --no-legend 2>/dev/null | awk 'NF {count++} END {print count+0}')
  if [[ $FAILED_UNITS -eq 0 ]]; then pass 'No failed systemd units'; else check_warn "$FAILED_UNITS systemd unit(s) are failed"; fi
fi

ROOT_USE=$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')
if [[ $ROOT_USE -lt 85 ]]; then pass "Root filesystem usage is ${ROOT_USE}%"; else check_warn "Root filesystem usage is ${ROOT_USE}%"; fi

echo
echo '=== Listening sockets (review every wildcard listener) ==='
if have ss; then ss -lntup || true; elif have netstat; then netstat -lntup || true; else check_warn 'Neither ss nor netstat is available.'; fi

if have docker; then
  if docker info >/dev/null 2>&1; then pass 'Docker Engine is responding'; else fail 'Docker Engine is not responding'; fi
  if docker compose version >/dev/null 2>&1; then pass "Docker Compose is available: $(docker compose version --short 2>/dev/null || docker compose version)"; else fail 'Docker Compose plugin is unavailable'; fi
  if docker buildx version >/dev/null 2>&1; then pass "Docker Buildx is available: $(docker buildx version | awk '{print $2}')"; else fail 'Docker Buildx plugin is unavailable'; fi
  if have systemctl; then
    if systemctl is-active --quiet docker.service; then pass 'Docker service is active'; else fail 'Docker service is not active'; fi
  fi
  echo
  echo '=== Docker published ports ==='
  docker ps --format 'table {{.Names}}\t{{.Ports}}' || check_warn 'Could not inspect Docker published ports.'
fi
if have node; then printf '\nNode.js: %s; npm: %s\n' "$(node --version)" "$(npm --version)"; fi

printf '\nVerification complete: %s failure(s), %s warning(s).\n' "$FAILURES" "$WARNINGS"

load_os_release
printf '\n=== Current setup report ===\n'
printf 'Platform: %s %s (%s)\n' "${PRETTY_NAME:-$OS_ID}" "$OS_VERSION_ID" "$(uname -m)"
printf 'Kernel: %s\n' "$(uname -r)"
printf 'Administrator: %s\n' "${ADMIN:-not supplied}"
printf 'SSH access: %s on TCP port %s\n' "$SSH_ACCESS" "$SSH_PORT"
printf 'Firewall strategy: %s\n' "$FIREWALL_MODE"
if [[ $FIREWALL_MODE == external ]]; then
  echo 'External exposure evidence: independently tested and confirmed; separate ingress policy not classified locally'
else
  echo 'External exposure evidence: still required; local host-firewall checks are not sufficient'
fi
if have tailscale; then printf 'Tailscale: %s\n' "$(tailscale version 2>/dev/null | head -n 1 || printf 'installed')"; else echo 'Tailscale: not installed'; fi
if have docker; then
  printf 'Docker: %s; Compose: %s; Buildx: %s\n' \
    "$(docker --version)" \
    "$(docker compose version --short 2>/dev/null || printf 'unavailable')" \
    "$(docker buildx version 2>/dev/null | awk '{print $2}' || printf 'unavailable')"
else
  echo 'Docker: not installed'
fi
if have node; then printf 'Node.js: %s; npm: %s\n' "$(node --version)" "$(npm --version)"; else echo 'Node.js: not installed'; fi
if have pnpm; then printf 'pnpm: %s\n' "$(pnpm --version)"; fi
if [[ -e /var/run/reboot-required ]]; then echo 'Reboot: required'; else echo 'Reboot: no reboot-required marker'; fi
printf 'Result: %s failure(s), %s warning(s)\n' "$FAILURES" "$WARNINGS"

echo
if [[ $FAILURES -gt 0 ]]; then
  echo 'Remaining work: resolve the failures above before declaring setup complete.'
elif [[ -e /var/run/reboot-required ]]; then
  echo 'Remaining work: reboot after access checks, reconnect through the intended path, and repeat verification.'
elif [[ $FIREWALL_MODE == host ]]; then
  echo 'Remaining work: confirm intended SSH, expected public-SSH behavior, and public IPv4/IPv6 exposure from another machine.'
else
  echo 'Remaining work: none detected locally; repeat independent exposure checks after future networking, firewall, or runtime changes.'
fi
[[ $FAILURES -eq 0 ]]
