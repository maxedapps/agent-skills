#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/install-tailscale.sh

Installs Tailscale from its stable package repository and starts tailscaled.
Authentication is intentionally separate: run `sudo tailscale up --ssh=false`
afterward so no auth key is placed in this script, arguments, or shell history.
EOF
}
if [[ ${1:-} == --help ]]; then usage; exit 0; fi
[[ $# -eq 0 ]] || die 'This script accepts no arguments. Use --help for usage.'
require_root "$@"
load_os_release

if have tailscale; then
  log "Tailscale is already installed: $(tailscale version | head -n 1)"
  service_enable_now tailscaled
  exit 0
fi

install_apt_repo() {
  [[ -n $OS_CODENAME ]] || die 'The distribution codename is missing; cannot select a Tailscale repository safely.'
  local repo_distro=$OS_ID
  case "$repo_distro" in
    ubuntu|debian|raspbian) ;;
    *)
      if [[ $OS_ID_LIKE == *ubuntu* ]]; then repo_distro=ubuntu
      elif [[ $OS_ID_LIKE == *debian* ]]; then repo_distro=debian
      else die "No safe Tailscale APT repository mapping exists for $OS_ID."
      fi
      ;;
  esac
  apt-get update
  apt-get install -y ca-certificates curl
  install -d -m 0755 /usr/share/keyrings
  local base="https://pkgs.tailscale.com/stable/${repo_distro}/${OS_CODENAME}"
  local key_tmp list_tmp
  key_tmp=$(mktemp)
  list_tmp=$(mktemp)
  trap 'rm -f "$key_tmp" "$list_tmp"' RETURN
  curl -fsSL "${base}.noarmor.gpg" -o "$key_tmp" || die "Tailscale has no stable repository for ${repo_distro}/${OS_CODENAME}."
  curl -fsSL "${base}.tailscale-keyring.list" -o "$list_tmp" || die "Could not download the Tailscale repository definition for ${repo_distro}/${OS_CODENAME}."
  grep -q 'pkgs\.tailscale\.com' "$list_tmp" || die 'The downloaded Tailscale repository definition was unexpected.'
  install -m 0644 "$key_tmp" /usr/share/keyrings/tailscale-archive-keyring.gpg
  install -m 0644 "$list_tmp" /etc/apt/sources.list.d/tailscale.list
  apt-get update
  apt-get install -y tailscale
}

install_rpm_repo() {
  local repo_family version_major repo_url repo_tmp
  version_major=${OS_VERSION_ID%%.*}
  case "$OS_ID" in
    fedora) repo_family=fedora; repo_url="https://pkgs.tailscale.com/stable/fedora/tailscale.repo" ;;
    rhel|rocky|almalinux) repo_family=rhel; repo_url="https://pkgs.tailscale.com/stable/rhel/${version_major}/tailscale.repo" ;;
    centos) repo_family=centos; repo_url="https://pkgs.tailscale.com/stable/centos/${version_major}/tailscale.repo" ;;
    ol|oracle) repo_family=oracle; repo_url="https://pkgs.tailscale.com/stable/oracle/${version_major}/tailscale.repo" ;;
    amzn) repo_family=amazon-linux; repo_url="https://pkgs.tailscale.com/stable/amazon-linux/${version_major}/tailscale.repo" ;;
    *) die "No safe Tailscale RPM repository mapping exists for $OS_ID." ;;
  esac
  repo_tmp=$(mktemp)
  trap 'rm -f "$repo_tmp"' RETURN
  curl -fsSL "$repo_url" -o "$repo_tmp" || die "Tailscale has no stable repository at $repo_url."
  grep -q 'pkgs\.tailscale\.com' "$repo_tmp" || die 'The downloaded Tailscale repository definition was unexpected.'
  grep -Eq '^gpgcheck=1' "$repo_tmp" || die 'The Tailscale repository does not enable GPG verification.'
  install -d -m 0755 /etc/yum.repos.d
  install -m 0644 "$repo_tmp" /etc/yum.repos.d/tailscale.repo
  if have dnf; then dnf -y install tailscale; else yum -y install tailscale; fi
  log "Configured Tailscale's $repo_family stable repository."
}

PACKAGE_MANAGER=$(detect_package_manager) || die 'No supported package manager was found.'
case "$PACKAGE_MANAGER" in
  apt-get) install_apt_repo ;;
  dnf|yum) install_rpm_repo ;;
  *) die "The local installer does not safely support $PACKAGE_MANAGER. Follow https://pkgs.tailscale.com/stable/ for this distribution, then continue with the skill workflow." ;;
esac

service_enable_now tailscaled
have tailscale || die 'Tailscale installation completed without providing the tailscale command.'
log "Tailscale installed: $(tailscale version | head -n 1)"
echo
cat <<'EOF'
Authentication still needs a human-controlled tailnet login. Run:
  sudo tailscale up --ssh=false

Open the displayed URL, then verify with:
  tailscale status
  tailscale ip -4
  tailscale ip -6

This skill uses traditional OpenSSH over Tailscale; Tailscale SSH must remain disabled.
EOF
