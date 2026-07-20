#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

if [[ ${1:-} == --help ]]; then
  cat <<'EOF'
Usage: ./scripts/inspect-system.sh

Prints a read-only VPS inventory. It does not display authorized-key contents or
make changes. Run it before asking the user configuration questions.
EOF
  exit 0
fi
[[ $# -eq 0 ]] || die 'This script accepts no arguments. Use --help for usage.'

load_os_release
PACKAGE_MANAGER=$(detect_package_manager || printf 'unknown')

echo '=== Identity and platform ==='
printf 'Hostname: %s\n' "$(hostname -f 2>/dev/null || hostname)"
printf 'Distribution: %s %s (%s)\n' "${PRETTY_NAME:-$OS_ID}" "$OS_VERSION_ID" "$(uname -m)"
printf 'Kernel: %s\n' "$(uname -sr)"
printf 'Current user: %s (uid=%s)\n' "$(id -un)" "$(id -u)"
printf 'Package manager: %s\n' "$PACKAGE_MANAGER"
if [[ $(id -u) -eq 0 ]]; then
  echo 'Privilege: running as root'
elif have sudo && sudo -n true 2>/dev/null; then
  echo 'Privilege: non-interactive sudo is available'
else
  echo 'Privilege: root access is not currently available non-interactively'
fi

echo
echo '=== Network ==='
if have ip; then
  ip -brief address || true
  echo
  ip route || true
else
  warn 'The ip command is unavailable.'
fi
if have ss; then
  echo
echo 'Listening sockets:'
  ss -lntup || ss -lntu || true
elif have netstat; then
  netstat -lntup 2>/dev/null || netstat -lntu || true
else
  warn 'Neither ss nor netstat is available.'
fi

echo
echo '=== SSH ==='
if [[ -n ${SSH_CONNECTION:-} ]]; then
  printf 'Current SSH connection: client=%s server=%s port=%s\n' \
    "$(awk '{print $1}' <<<"$SSH_CONNECTION")" \
    "$(awk '{print $3}' <<<"$SSH_CONNECTION")" \
    "$(awk '{print $4}' <<<"$SSH_CONNECTION")"
else
  echo 'No SSH_CONNECTION environment variable was detected.'
fi
if have sshd; then
  printf 'sshd: %s\n' "$(sshd -V 2>&1 | head -n 1 || true)"
  if [[ $(id -u) -eq 0 ]]; then
    sshd -T 2>/dev/null | awk '$1 ~ /^(port|permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication)$/ {print}' || true
  else
    echo 'Run as root to inspect effective sshd settings.'
  fi
else
  warn 'sshd is not installed or not in PATH.'
fi

KEY_FILE=${HOME}/.ssh/authorized_keys
if [[ -r "$KEY_FILE" ]] && have ssh-keygen; then
  echo 'Current user authorized-key fingerprints:'
  ssh-keygen -lf "$KEY_FILE" 2>/dev/null || warn "Could not parse every entry in $KEY_FILE."
else
  echo 'No readable authorized_keys file was found for the current user.'
fi

echo
echo '=== Firewall and private networking ==='
if have ufw; then
  ufw status verbose 2>/dev/null || true
fi
if have firewall-cmd; then
  firewall-cmd --state 2>/dev/null || true
  firewall-cmd --get-active-zones 2>/dev/null || true
fi
if have nft; then
  printf 'nftables rules: '
  if nft list ruleset >/dev/null 2>&1; then echo 'present/readable'; else echo 'unavailable without more privileges'; fi
fi
if have tailscale; then
  tailscale status 2>/dev/null || true
else
  echo 'Tailscale: not installed'
fi

echo
echo '=== Updates, time, and security controls ==='
case "$PACKAGE_MANAGER" in
  apt-get)
    PENDING=$(apt-get -s upgrade 2>/dev/null | awk '/^Inst / {count++} END {print count+0}')
    printf 'Pending APT upgrades based on current metadata: %s\n' "$PENDING"
    ;;
  dnf|yum)
    if "$PACKAGE_MANAGER" -q check-update >/dev/null 2>&1; then
      echo 'No package updates reported.'
    else
      STATUS=$?
      if [[ $STATUS -eq 100 ]]; then echo 'Package updates are available.'; else echo 'Package update status could not be determined.'; fi
    fi
    ;;
  *) echo 'Pending updates were not queried for this package manager.' ;;
esac
if have timedatectl; then
  timedatectl status || true
fi
if have aa-status; then
  aa-status 2>/dev/null | head -n 8 || true
elif have getenforce; then
  printf 'SELinux: %s\n' "$(getenforce)"
else
  echo 'AppArmor/SELinux status tool not found.'
fi
if [[ -e /var/run/reboot-required ]]; then
  echo 'Reboot required: yes'
else
  echo 'Reboot required: no marker detected'
fi

echo
echo '=== Storage and services ==='
df -hT / /var 2>/dev/null || df -h /
if have systemctl; then
  echo
  echo 'Running services:'
  systemctl list-units --type=service --state=running --no-pager --no-legend || true
  echo
  echo 'Enabled service units:'
  systemctl list-unit-files --type=service --state=enabled --no-pager --no-legend || true
  echo
  echo 'Failed units:'
  systemctl --failed --no-pager || true
elif have rc-status; then
  rc-status --all || true
else
  warn 'No supported service inventory command was found.'
fi
