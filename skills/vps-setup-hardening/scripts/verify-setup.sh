#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
SKILL_DIR=$(skill_dir)

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/verify-setup.sh --profile ubuntu|al2023-ec2
    --ingress host|external [--admin USER]
    [--ssh-access public|tailscale-only]
    [--confirmed-external-ingress-tested]
    [--confirmed-security-group-tested]

Emits pass/fail/warning evidence only. Write the human report from
assets/final-report.md using this evidence plus independent external tests.

Ubuntu:
  --ingress host                      UFW mode (invalid with Docker present)
  --ingress external + confirmation   provider firewall evidence recorded

AL2023:
  --ingress external + --confirmed-security-group-tested
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
SSH_ACCESS=public
PROFILE_ARG=''
INGRESS=''
EXTERNAL_CONFIRMED=false
SG_CONFIRMED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --ssh-access) [[ $# -ge 2 ]] || die '--ssh-access requires a value.'; SSH_ACCESS=$2; shift 2 ;;
    --profile) [[ $# -ge 2 ]] || die '--profile requires ubuntu or al2023-ec2.'; PROFILE_ARG=$2; shift 2 ;;
    --ingress) [[ $# -ge 2 ]] || die '--ingress requires host or external.'; INGRESS=$2; shift 2 ;;
    --confirmed-external-ingress-tested) EXTERNAL_CONFIRMED=true; shift ;;
    --confirmed-security-group-tested) SG_CONFIRMED=true; shift ;;
    --firewall) die 'Replaced by --profile and --ingress. See --help.' ;;
    --confirmed-external-firewall-tested) die 'Replaced by --confirmed-external-ingress-tested or --confirmed-security-group-tested.' ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
[[ $PROFILE_ARG == ubuntu || $PROFILE_ARG == al2023-ec2 ]] || die '--profile must be ubuntu or al2023-ec2.'
[[ $SSH_ACCESS == public || $SSH_ACCESS == tailscale-only ]] || die '--ssh-access must be public or tailscale-only.'
[[ $INGRESS == host || $INGRESS == external ]] || die '--ingress must be host or external.'

if [[ $PROFILE_ARG == ubuntu ]]; then
  if [[ $INGRESS == host && $EXTERNAL_CONFIRMED == true ]]; then
    die '--confirmed-external-ingress-tested is valid only with --ingress external.'
  fi
  if [[ $SG_CONFIRMED == true ]]; then
    die '--confirmed-security-group-tested is valid only with --profile al2023-ec2.'
  fi
  if [[ $INGRESS == external && $EXTERNAL_CONFIRMED == false ]]; then
    die 'Ubuntu external ingress requires completed independent access and public IPv4/IPv6 exposure tests, then --confirmed-external-ingress-tested.'
  fi
elif [[ $PROFILE_ARG == al2023-ec2 ]]; then
  [[ $INGRESS == external ]] || die 'al2023-ec2 requires --ingress external (EC2 Security Groups).'
  if [[ $EXTERNAL_CONFIRMED == true ]]; then
    die 'Use --confirmed-security-group-tested for al2023-ec2, not --confirmed-external-ingress-tested.'
  fi
  if [[ $SG_CONFIRMED == false ]]; then
    die 'al2023-ec2 requires completed independent access and public IPv4/IPv6 exposure tests, then --confirmed-security-group-tested.'
  fi
  if [[ $INGRESS == host ]]; then
    die 'al2023-ec2 does not support host firewall ingress.'
  fi
fi

require_root "${ORIGINAL_ARGS[@]}"
detect_profile
[[ $PROFILE_ARG == "$PROFILE" ]] || die "Host profile is '$PROFILE' but --profile '$PROFILE_ARG' was supplied."
if [[ $PROFILE == ubuntu ]] && have docker && [[ $INGRESS == host ]]; then
  die 'Docker is present; --ingress host is invalid. Use external/provider ingress with confirmation.'
fi

SSH_PORT=$(detect_ssh_port) || die 'Could not determine the SSH listening port safely.'

FAILURES=0
WARNINGS=0
pass() { printf '[PASS] %s\n' "$*"; }
fail() { printf '[FAIL] %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
check_warn() { printf '[WARN] %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }

pass "Profile: $PROFILE ($OS_PRETTY_NAME $OS_VERSION_ID, $ARCH_NORMALIZED)"
pass "SSH listening port detected: $SSH_PORT"

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

# --- Profile-specific ingress / update / MAC / reboot ---
if [[ $PROFILE == ubuntu ]]; then
  if [[ $INGRESS == external ]]; then
    pass 'Ubuntu external/provider ingress mode; separate ingress policy is not classified locally'
    pass 'Independent intended-access and public IPv4/IPv6 exposure tests were confirmed'
  else
    if have ufw && ufw status 2>/dev/null | grep -q '^Status: active'; then
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
    else
      fail 'No active UFW host firewall was found for --ingress host'
    fi
  fi

  if have aa-status; then
    if aa-status --enabled >/dev/null 2>&1; then pass 'AppArmor is enabled'; else check_warn 'AppArmor is not enabled'; fi
  else
    check_warn 'AppArmor status utility was not found.'
  fi

  FAIL2BAN_SOURCE="$SKILL_DIR/assets/config/10-agent-recipes-sshd.local"
  FAIL2BAN_DESTINATION=/etc/fail2ban/jail.d/10-agent-recipes-sshd.local
  if [[ -f $FAIL2BAN_DESTINATION ]] \
    && cmp -s -- "$FAIL2BAN_SOURCE" "$FAIL2BAN_DESTINATION"; then
    pass 'Managed Fail2Ban sshd configuration is current'
  else
    fail 'Managed Fail2Ban sshd configuration is missing or changed'
  fi
  if have fail2ban-client \
    && systemctl is-enabled --quiet fail2ban.service \
    && systemctl is-active --quiet fail2ban.service; then
    pass 'Fail2Ban service is enabled and active'
    if fail2ban-client -t >/dev/null 2>&1 \
      && fail2ban-client status sshd >/dev/null 2>&1; then
      pass 'Fail2Ban configuration is valid and the sshd jail is active'
    else
      fail 'Fail2Ban configuration is invalid or the sshd jail is unavailable'
    fi
  else
    fail 'Fail2Ban is not installed, enabled, and active'
  fi

  if [[ -f /etc/apt/apt.conf.d/20auto-upgrades ]] \
    && grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades; then
    pass 'APT unattended upgrades are enabled'
  else
    check_warn 'APT unattended upgrades configuration was not recognized.'
  fi
  ORIGINS_BLOB=$(grep -RhsE 'Allowed-Origins|Origins-Pattern|origin=' /etc/apt/apt.conf.d 2>/dev/null || true)
  if grep -Eiq 'security|\\$\{distro_codename\}-security|UbuntuESM' <<<"$ORIGINS_BLOB"; then
    pass 'Unattended-upgrade security origins qualification is present'
  elif [[ -n $ORIGINS_BLOB ]]; then
    check_warn 'unattended-upgrades origins config is present but a security origin could not be qualified'
  else
    check_warn 'No unattended-upgrades origins configuration was found to qualify'
  fi
  if grep -Rqs 'Automatic-Reboot "true"' /etc/apt/apt.conf.d 2>/dev/null; then
    fail 'APT unattended upgrades are configured to reboot automatically'
  else
    pass 'No APT automatic-reboot setting was found'
  fi
  if [[ -e /var/run/reboot-required ]]; then check_warn 'Ubuntu reboot-required marker is present'; else pass 'No Ubuntu reboot-required marker is present'; fi

elif [[ $PROFILE == al2023-ec2 ]]; then
  pass 'AL2023 external Security Group ingress mode; SG policy is not classified locally'
  pass 'Independent intended-access and public IPv4/IPv6 exposure tests were confirmed (--confirmed-security-group-tested)'
  if have getenforce; then
    SELINUX_MODE=$(getenforce)
    if [[ $SELINUX_MODE == Enforcing ]]; then
      pass 'SELinux is enforcing'
    elif [[ $SELINUX_MODE == Permissive ]]; then
      check_warn 'SELinux is permissive (enabled but not enforcing)'
    else
      check_warn "SELinux mode is $SELINUX_MODE"
    fi
  else
    check_warn 'SELinux status utility was not found.'
  fi
  if rpm -q system-release >/dev/null 2>&1; then
    REL=$(rpm -q system-release --qf '%{VERSION}\n')
    pass "Pinned AL2023 system-release version: $REL"
  else
    fail 'system-release package is not installed'
  fi
  check_warn 'AL2023 does not claim automatic release upgrades; treat dnf check-release-update results as manual maintenance.'
  if have needs-restarting; then
    if needs-restarting -r >/dev/null 2>&1; then
      pass 'needs-restarting -r does not indicate a required reboot'
    else
      check_warn 'needs-restarting -r indicates a reboot is advisable'
    fi
  fi
  if [[ -e /var/run/smart-restart/needs-restart ]]; then
    check_warn 'smart-restart reboot marker is present'
  fi
fi

# --- Shared checks ---
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
  if systemctl is-active --quiet docker.service; then pass 'Docker service is active'; else fail 'Docker service is not active'; fi
  if [[ $INGRESS != external ]]; then
    fail 'Docker is present without external/provider/SG ingress mode'
  fi
  echo
  echo '=== Docker published ports ==='
  docker ps --format 'table {{.Names}}\t{{.Ports}}' || check_warn 'Could not inspect Docker published ports.'
fi

if have node; then
  pass "Node.js: $(node --version); npm: $(npm --version 2>/dev/null || printf 'unavailable')"
  if [[ $PROFILE == al2023-ec2 ]] && have alternatives; then
    if alternatives --display node >/dev/null 2>&1; then
      pass 'alternatives node entry is present'
    else
      check_warn 'alternatives node entry was not found'
    fi
  fi
fi

printf '\nVerification complete: %s failure(s), %s warning(s).\n' "$FAILURES" "$WARNINGS"
if [[ $FAILURES -gt 0 ]]; then
  echo 'Remaining work: resolve the failures above before declaring setup complete.'
elif [[ $PROFILE == ubuntu && -e /var/run/reboot-required ]]; then
  echo 'Remaining work: reboot after access checks, reconnect through the intended path, and repeat verification.'
elif [[ $PROFILE == al2023-ec2 ]] && have needs-restarting && ! needs-restarting -r >/dev/null 2>&1; then
  echo 'Remaining work: reboot after access checks, reconnect through the intended path, and repeat verification.'
else
  echo 'Remaining work: complete or repeat independent external SSH and exposure checks as applicable; perform profile maintenance (APT full upgrades or AL release upgrades) deliberately.'
fi
[[ $FAILURES -eq 0 ]]
