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

require_root() {
  if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    local script_path command
    script_path=$(realpath "$0" 2>/dev/null || printf '%s' "$0")
    printf -v command '%q ' "$script_path" "$@"
    die "Root privileges are required. Run: sudo ${command% }"
  fi
}

load_os_release() {
  [[ -r /etc/os-release ]] || die '/etc/os-release is missing; this Linux distribution cannot be detected safely.'
  # shellcheck disable=SC1091
  source /etc/os-release
  : "${ID:?The distribution ID is missing from /etc/os-release.}"
  # These globals are consumed by scripts that source this library.
  # shellcheck disable=SC2034
  OS_ID=${ID,,}
  # shellcheck disable=SC2034
  OS_VERSION_ID=${VERSION_ID:-}
  # shellcheck disable=SC2034
  OS_CODENAME=${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}
  # shellcheck disable=SC2034
  OS_ID_LIKE=${ID_LIKE:-}
}

detect_package_manager() {
  local manager
  for manager in apt-get dnf yum zypper apk; do
    if have "$manager"; then
      printf '%s\n' "$manager"
      return 0
    fi
  done
  return 1
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

firewalld_public_zone() {
  local interface zone=''
  interface=$(detect_public_interface) || return 1
  zone=$(firewall-cmd --get-zone-of-interface="$interface" 2>/dev/null || true)
  if [[ -z $zone || $zone == no\ zone ]]; then
    zone=$(firewall-cmd --get-default-zone 2>/dev/null || true)
  fi
  [[ -n $zone ]] || return 1
  printf '%s\n' "$zone"
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
  if have systemctl; then
    systemctl enable --now "$service"
  elif have rc-service && have rc-update; then
    rc-update add "$service" default
    rc-service "$service" start
  else
    die "No supported service manager was found for $service."
  fi
}

skill_dir() {
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd
}
