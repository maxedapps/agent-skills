#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

if [[ ${1:-} == --help ]]; then
  cat <<'EOF'
Usage: ./scripts/inspect-system.sh

Prints a read-only inventory of every gate input for the ubuntu and al2023-ec2
profiles. It does not display authorized-key contents or make changes.
EOF
  exit 0
fi
[[ $# -eq 0 ]] || die 'This script accepts no arguments. Use --help for usage.'

echo '=== Identity and platform ==='
printf 'Hostname: %s\n' "$(hostname -f 2>/dev/null || hostname)"
printf 'Kernel: %s\n' "$(uname -sr)"
printf 'Machine: %s\n' "$(uname -m)"
printf 'Current user: %s (uid=%s)\n' "$(id -un)" "$(id -u)"

ID=''
VERSION_ID=''
PRETTY_NAME=''
VERSION_CODENAME=''
UBUNTU_CODENAME=''
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  printf 'os-release: ID=%s VERSION_ID=%s PRETTY_NAME=%s\n' \
    "${ID:-}" "${VERSION_ID:-}" "${PRETTY_NAME:-}"
  printf 'Codename: %s\n' "${VERSION_CODENAME:-${UBUNTU_CODENAME:-none}}"
else
  warn '/etc/os-release is missing.'
fi

ARCH_NORMALIZED='unsupported'
if ARCH_NORMALIZED=$(normalize_architecture "$(uname -m)"); then
  printf 'Normalized architecture: %s\n' "$ARCH_NORMALIZED"
else
  printf 'Normalized architecture: unsupported (%s)\n' "$(uname -m)"
  ARCH_NORMALIZED='unsupported'
fi

if has_systemd; then
  echo 'Init: systemd present'
else
  echo 'Init: systemd NOT present (unsupported)'
fi

if has_sshd_config_d_include; then
  echo 'sshd_config.d include: present'
else
  echo 'sshd_config.d include: MISSING (unsupported layout)'
fi

EC2_TAG='none'
if EC2_TAG=$(detect_ec2_evidence); then
  printf 'EC2 evidence: %s\n' "$EC2_TAG"
else
  echo 'EC2 evidence: absent or ambiguous'
  EC2_TAG='none'
fi

PROFILE='refused'
IS_EC2=false
[[ $EC2_TAG != none ]] && IS_EC2=true
HAS_SD=false
HAS_INCLUDE=false
has_systemd && HAS_SD=true
has_sshd_config_d_include && HAS_INCLUDE=true
OS_ID_LOWER=$(to_lower "${ID:-}")
if [[ $ARCH_NORMALIZED != unsupported ]] \
  && PROFILE=$(classify_profile "${OS_ID_LOWER:-}" "${VERSION_ID:-}" "$ARCH_NORMALIZED" "$HAS_SD" "$HAS_INCLUDE" "$IS_EC2" 2>/dev/null); then
  printf 'Profile classification: %s\n' "$PROFILE"
else
  echo 'Profile classification: REFUSED (unsupported host for this skill)'
  PROFILE='refused'
fi

if [[ $(id -u) -eq 0 ]]; then
  echo 'Privilege: running as root'
elif have sudo && sudo -n true 2>/dev/null; then
  echo 'Privilege: non-interactive sudo is available'
else
  echo 'Privilege: root access is not currently available non-interactively'
fi

echo
echo '=== Users and administrator candidates ==='
if getent passwd ubuntu >/dev/null 2>&1; then
  printf 'ubuntu: shell=%s home=%s groups=%s\n' \
    "$(getent passwd ubuntu | awk -F: '{print $7}')" \
    "$(getent passwd ubuntu | awk -F: '{print $6}')" \
    "$(id -nG ubuntu 2>/dev/null || true)"
fi
if getent passwd ec2-user >/dev/null 2>&1; then
  printf 'ec2-user: shell=%s home=%s groups=%s\n' \
    "$(getent passwd ec2-user | awk -F: '{print $7}')" \
    "$(getent passwd ec2-user | awk -F: '{print $6}')" \
    "$(id -nG ec2-user 2>/dev/null || true)"
fi
if have ssh-keygen; then
  for candidate in ubuntu ec2-user root "$(id -un)"; do
    home=$(getent passwd "$candidate" 2>/dev/null | awk -F: '{print $6}' || true)
    [[ -n $home && -r "$home/.ssh/authorized_keys" ]] || continue
    echo "Authorized-key fingerprints for $candidate:"
    ssh-keygen -lf "$home/.ssh/authorized_keys" 2>/dev/null || warn "Could not parse keys for $candidate."
  done
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
  if [[ -r /etc/ssh/sshd_config ]]; then
    grep -Eiq '^[[:space:]]*Include[[:space:]]+' /etc/ssh/sshd_config \
      && echo 'sshd_config Include directives:' \
      && grep -Ei '^[[:space:]]*Include[[:space:]]+' /etc/ssh/sshd_config || true
  fi
  if [[ $(id -u) -eq 0 ]]; then
    sshd -T 2>/dev/null | awk '$1 ~ /^(port|permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication)$/ {print}' || true
  else
    echo 'Run as root to inspect effective sshd settings.'
  fi
else
  warn 'sshd is not installed or not in PATH.'
fi

echo
echo '=== Firewall / ingress evidence (qualification only) ==='
if have ufw; then
  echo 'UFW:'
  ufw status verbose 2>/dev/null || true
else
  echo 'UFW: not installed'
fi
if have nft; then
  printf 'nftables ruleset: '
  if nft list ruleset >/dev/null 2>&1; then echo 'present/readable'; else echo 'unavailable without more privileges'; fi
fi
echo 'Provider/Security Group state cannot be classified from local output.'
if [[ $PROFILE == al2023-ec2 ]]; then
  echo 'AL2023 profile requires user-confirmed EC2 Security Group attachment and independent external tests.'
fi
if have tailscale; then
  echo 'Tailscale:'
  tailscale status 2>/dev/null || true
else
  echo 'Tailscale: not installed'
fi

echo
echo '=== Updates, time, and security controls ==='
case "${OS_ID_LOWER:-}" in
  ubuntu)
    if have apt-get; then
      PENDING=$(apt-get -s upgrade 2>/dev/null | awk '/^Inst / {count++} END {print count+0}')
      printf 'Pending APT upgrades based on current metadata: %s\n' "$PENDING"
    fi
    if [[ -f /etc/apt/apt.conf.d/20auto-upgrades ]]; then
      echo 'APT auto-upgrades config present'
    fi
    ;;
  amzn)
    if have dnf; then
      echo 'AL2023 release update check (dnf check-release-update):'
      dnf check-release-update 2>/dev/null || true
      if rpm -q system-release >/dev/null 2>&1; then
        printf 'Installed system-release version: %s\n' \
          "$(rpm -q system-release --qf '%{VERSION}\n' 2>/dev/null || true)"
      fi
      if dnf -q check-update >/dev/null 2>&1; then
        echo 'No package updates reported for the pinned release.'
      else
        STATUS=$?
        if [[ $STATUS -eq 100 ]]; then
          echo 'Package updates are available for the pinned release.'
        else
          echo 'Package update status could not be determined.'
        fi
      fi
    fi
    ;;
  *) echo 'Update status not queried for unsupported distributions.' ;;
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
  echo 'Ubuntu reboot-required marker: yes'
else
  echo 'Ubuntu reboot-required marker: no'
fi
if have needs-restarting; then
  if needs-restarting -r >/dev/null 2>&1; then
    echo 'needs-restarting -r: reboot not indicated'
  else
    echo 'needs-restarting -r: reboot indicated or check failed'
  fi
fi
if [[ -e /var/run/smart-restart/needs-restart ]]; then
  echo 'smart-restart reboot marker: present'
fi

echo
echo '=== Storage, services, optional tools ==='
df -hT / /var 2>/dev/null || df -h /
if have systemctl; then
  echo
  echo 'Running services:'
  systemctl list-units --type=service --state=running --no-pager --no-legend || true
  echo
  echo 'Failed units:'
  systemctl --failed --no-pager || true
fi

printf 'Docker: '
if have docker; then docker --version; else echo 'not installed'; fi
printf 'Node.js: '
if have node; then node --version; else echo 'not installed'; fi
printf 'npm: '
if have npm; then npm --version; else echo 'not installed'; fi
printf 'pnpm: '
if have pnpm; then pnpm --version; else echo 'not installed'; fi
printf 'Tailscale CLI: '
if have tailscale; then tailscale version 2>/dev/null | head -n 1; else echo 'not installed'; fi

echo
printf 'Inspection summary: profile=%s arch=%s ec2=%s\n' "$PROFILE" "$ARCH_NORMALIZED" "$EC2_TAG"
