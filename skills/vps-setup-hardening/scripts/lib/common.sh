#!/usr/bin/env bash

# Shared helpers for the VPS setup scripts. Callers must enable strict mode.

log() {
  printf '[INFO] %s\n' "$*"
}

warn() {
  printf '[WARN] %s\n' "$*" >&2
}

die() {
  printf '[ERROR] %s\n' "$*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

# Portable lowercase (avoid bash-4-only ${var,,} so helpers work under macOS /bin/bash in tests).
to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

require_root() {
  if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    local script_path command
    script_path=$(realpath "$0" 2>/dev/null || printf '%s' "$0")
    printf -v command '%q ' "$script_path" "$@"
    die "Root privileges are required. Run: sudo ${command% }"
  fi
}

skill_dir() {
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd
}

load_os_release() {
  [[ -r /etc/os-release ]] || die '/etc/os-release is missing; this Linux distribution cannot be detected safely.'
  # shellcheck disable=SC1091
  source /etc/os-release
  : "${ID:?The distribution ID is missing from /etc/os-release.}"
  # shellcheck disable=SC2034
  OS_ID=$(to_lower "$ID")
  # shellcheck disable=SC2034
  OS_VERSION_ID=${VERSION_ID:-}
  # shellcheck disable=SC2034
  OS_CODENAME=${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}
  # shellcheck disable=SC2034
  OS_PRETTY_NAME=${PRETTY_NAME:-$OS_ID}
}

normalize_architecture() {
  local arch=${1:-$(uname -m)}
  case "$arch" in
    x86_64|amd64) printf 'amd64\n' ;;
    aarch64|arm64) printf 'arm64\n' ;;
    *) return 1 ;;
  esac
}

# Pure classifier. Inputs are explicit so contract tests can exercise it without a host.
# Usage: classify_profile <os_id> <version_id> <arch> <has_systemd:true|false> \
#          <has_sshd_include:true|false> <is_ec2:true|false|n/a>
# Prints profile name on success; nonzero on refusal.
classify_profile() {
  local os_id=${1:-}
  local version_id=${2:-}
  local arch=${3:-}
  local has_systemd=${4:-false}
  local has_sshd_include=${5:-false}
  local is_ec2=${6:-false}

  normalize_architecture "$arch" >/dev/null || return 1
  [[ $has_systemd == true ]] || return 1
  [[ $has_sshd_include == true ]] || return 1

  case "$os_id" in
    ubuntu)
      case "$version_id" in
        24.04|26.04)
          printf 'ubuntu\n'
          return 0
          ;;
        *) return 1 ;;
      esac
      ;;
    amzn)
      [[ $version_id == 2023 ]] || return 1
      [[ $is_ec2 == true ]] || return 1
      printf 'al2023-ec2\n'
      return 0
      ;;
    *) return 1 ;;
  esac
}

# Positive local EC2 evidence only. No credentials, metadata service, or assumptions.
# Returns 0 and prints a short evidence tag when EC2 is established.
detect_ec2_evidence() {
  local product_name='' bios_vendor='' sys_vendor='' uuid='' virt=''

  if [[ -r /sys/class/dmi/id/product_name ]]; then
    product_name=$(tr -d '\0' </sys/class/dmi/id/product_name 2>/dev/null || true)
  fi
  if [[ -r /sys/class/dmi/id/bios_vendor ]]; then
    bios_vendor=$(tr -d '\0' </sys/class/dmi/id/bios_vendor 2>/dev/null || true)
  fi
  if [[ -r /sys/class/dmi/id/sys_vendor ]]; then
    sys_vendor=$(tr -d '\0' </sys/class/dmi/id/sys_vendor 2>/dev/null || true)
  fi
  if [[ -r /sys/hypervisor/uuid ]]; then
    uuid=$(tr -d '\0' </sys/hypervisor/uuid 2>/dev/null || true)
  elif [[ -r /sys/devices/virtual/dmi/id/product_uuid ]]; then
    uuid=$(tr -d '\0' </sys/devices/virtual/dmi/id/product_uuid 2>/dev/null || true)
  fi
  if have systemd-detect-virt; then
    virt=$(systemd-detect-virt 2>/dev/null || true)
  fi

  local uuid_l product_l bios_l sys_l
  uuid_l=$(to_lower "$uuid")
  product_l=$(to_lower "$product_name")
  bios_l=$(to_lower "$bios_vendor")
  sys_l=$(to_lower "$sys_vendor")
  if [[ $uuid_l == ec2* ]]; then
    printf 'dmi-uuid\n'
    return 0
  fi
  if [[ $product_l == *'amazon ec2'* ]]; then
    printf 'dmi-product-name\n'
    return 0
  fi
  if [[ $bios_l == amazon* && $sys_l == amazon* ]]; then
    printf 'dmi-vendor\n'
    return 0
  fi
  if [[ $virt == amazon ]]; then
    printf 'systemd-detect-virt\n'
    return 0
  fi
  return 1
}

has_systemd() {
  [[ -d /run/systemd/system ]] || return 1
  have systemctl || return 1
  return 0
}

has_sshd_config_d_include() {
  local config=${1:-/etc/ssh/sshd_config}
  [[ -r $config ]] || return 1
  grep -Eiq '^[[:space:]]*Include[[:space:]]+.*/sshd_config\.d(/|\*| )' "$config" \
    || grep -Eiq '^[[:space:]]*Include[[:space:]]+.*sshd_config\.d' "$config"
}

# Collect host facts and classify. Sets PROFILE, ARCH_NORMALIZED, EC2_EVIDENCE.
detect_profile() {
  local arch raw_ec2 is_ec2=false has_sd=false has_include=false

  load_os_release
  arch=$(uname -m)
  ARCH_NORMALIZED=$(normalize_architecture "$arch") \
    || die "Unsupported architecture: $arch. Supported: amd64/x86_64 and arm64/aarch64."

  if has_systemd; then
    has_sd=true
  else
    die 'systemd is required. OpenRC and other init systems are not supported.'
  fi

  if has_sshd_config_d_include; then
    has_include=true
  else
    die 'sshd_config must Include a standard sshd_config.d drop-in directory. Direct main-file hardening is not supported.'
  fi

  # shellcheck disable=SC2034 # exported for callers that source detect_profile
  EC2_EVIDENCE=''
  if raw_ec2=$(detect_ec2_evidence); then
    is_ec2=true
    # shellcheck disable=SC2034
    EC2_EVIDENCE=$raw_ec2
  fi

  if PROFILE=$(classify_profile "$OS_ID" "$OS_VERSION_ID" "$ARCH_NORMALIZED" "$has_sd" "$has_include" "$is_ec2"); then
    return 0
  fi

  case "$OS_ID" in
    ubuntu)
      die "Unsupported Ubuntu release: ${OS_VERSION_ID:-unknown}. Supported: 24.04 LTS and 26.04 LTS."
      ;;
    amzn)
      if [[ $OS_VERSION_ID == 2023 && $is_ec2 != true ]]; then
        die 'Amazon Linux 2023 is supported only on positively identified EC2 instances. Local EC2 evidence was absent or ambiguous.'
      fi
      die "Unsupported Amazon Linux release: ${OS_VERSION_ID:-unknown}. Supported: Amazon Linux 2023 on EC2."
      ;;
    debian)
      die 'Debian is not supported. Supported profiles: Ubuntu 24.04/26.04 and Amazon Linux 2023 on EC2.'
      ;;
    *)
      die "Unsupported distribution: ${OS_PRETTY_NAME:-$OS_ID}. Supported profiles: Ubuntu 24.04/26.04 and Amazon Linux 2023 on EC2."
      ;;
  esac
}

require_profile() {
  local expected=$1
  detect_profile
  [[ $PROFILE == "$expected" ]] \
    || die "This script requires profile '$expected' but the host classified as '${PROFILE:-unknown}'."
}

detect_ssh_port() {
  local port=''
  if [[ -n ${SSH_CONNECTION:-} ]]; then
    port=$(awk '{print $4}' <<<"$SSH_CONNECTION")
  fi
  if [[ -z $port ]] && have sshd; then
    port=$(sshd -T 2>/dev/null | awk '$1 == "port" {print $2; exit}')
  fi
  port=${port:-22}
  [[ $port =~ ^[0-9]+$ && $port -ge 1 && $port -le 65535 ]] || return 1
  printf '%s\n' "$port"
}

detect_public_interface() {
  local client_ip interface=''
  if have ip; then
    interface=$(ip route show default 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "dev") {print $(i+1); exit}}')
  fi
  if [[ -z $interface && -n ${SSH_CONNECTION:-} ]] && have ip; then
    client_ip=$(awk '{print $1}' <<<"$SSH_CONNECTION")
    interface=$(ip route get "$client_ip" 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "dev") {print $(i+1); exit}}')
  fi
  [[ -n $interface ]] || return 1
  printf '%s\n' "$interface"
}

backup_file() {
  local path=$1
  [[ -e "$path" ]] || return 0
  local backup
  backup="${path}.agent-recipes.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a -- "$path" "$backup"
  log "Backup created: $backup"
}

install_managed_file() {
  local source=$1 destination=$2 mode=${3:-0644}
  [[ -r "$source" ]] || die "Template is missing: $source"
  mkdir -p -- "$(dirname "$destination")"
  if [[ -e "$destination" ]] && cmp -s -- "$source" "$destination"; then
    log "Already current: $destination"
    return 0
  fi
  backup_file "$destination"
  install -m "$mode" -- "$source" "$destination"
  log "Installed: $destination"
}

service_enable_now() {
  local service=$1
  have systemctl || die "systemd is required to manage $service."
  systemctl enable --now "$service"
}

service_reload() {
  local service=$1
  have systemctl || die "systemd is required to reload $service."
  systemctl reload "$service"
}

# Optional pure-function CLI for contract tests.
if [[ ${BASH_SOURCE[0]##*/} == "${0##*/}" ]]; then
  case "${1:-}" in
    classify)
      shift
      classify_profile "$@"
      ;;
    normalize-arch)
      shift
      normalize_architecture "${1:-}"
      ;;
    --help|help)
      cat <<'EOF'
Usage:
  common.sh classify <os_id> <version_id> <arch> <has_systemd> <has_sshd_include> <is_ec2>
  common.sh normalize-arch <arch>
EOF
      exit 0
      ;;
    *)
      die 'Source this library from a setup script, or use: common.sh classify|normalize-arch|help'
      ;;
  esac
fi
