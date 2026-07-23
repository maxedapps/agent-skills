#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/ubuntu/install-docker.sh [--admin USER]

Installs Docker Engine, Buildx, and the Compose plugin from Docker's official
APT repository on Ubuntu 24.04/26.04. Sudo-based administration is the default.
Supplying --admin explicitly adds USER to the root-equivalent docker group and
must represent an approved privilege decision.

A verified provider firewall must already govern Docker-published ingress.
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
require_profile ubuntu
have apt-get || die 'apt-get is required.'
[[ -n ${OS_CODENAME:-} ]] || die 'The Ubuntu codename is missing; cannot select Docker packages safely.'

add_admin_to_docker_group() {
  [[ -n $ADMIN ]] || return 0
  id "$ADMIN" >/dev/null 2>&1 || die "Administrator does not exist: $ADMIN"
  usermod -aG docker "$ADMIN"
  warn "$ADMIN was added to the root-equivalent docker group by explicit approval. A new login is required before group membership applies."
}

verify_docker_install() {
  local test_container="vps-setup-hardening-hello-$$"
  docker info >/dev/null
  docker compose version >/dev/null
  docker buildx version >/dev/null
  systemctl is-active --quiet docker.service || die 'Docker service is not active.'

  docker rm -f "$test_container" >/dev/null 2>&1 || true
  if ! docker run --name "$test_container" --rm hello-world >/dev/null; then
    docker rm -f "$test_container" >/dev/null 2>&1 || true
    die 'Docker hello-world verification failed.'
  fi
  docker rm -f "$test_container" >/dev/null 2>&1 || true
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$test_container"; then
    die "Docker test container remains after verification: $test_container"
  fi
  log 'Docker Engine, Compose, Buildx, service state, and hello-world verified; no test container remains.'
}

if have docker; then
  log "Docker is already installed: $(docker --version)"
  add_admin_to_docker_group
  verify_docker_install
  exit 0
fi

CONFLICTS=()
for package in docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc; do
  if dpkg-query -W -f='${db:Status-Abbrev}' "$package" 2>/dev/null | grep -q '^ii'; then
    CONFLICTS+=("$package")
  fi
done
if [[ ${#CONFLICTS[@]} -gt 0 ]]; then
  die "Conflicting container packages are installed: ${CONFLICTS[*]}. Review and remove or migrate them explicitly before installing Docker CE."
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
install -d -m 0755 /etc/apt/keyrings
KEY_TMP=$(mktemp)
trap 'rm -f "$KEY_TMP"' EXIT
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o "$KEY_TMP"
grep -q 'BEGIN PGP PUBLIC KEY BLOCK' "$KEY_TMP" || die 'The downloaded Docker signing key was unexpected.'
install -m 0644 "$KEY_TMP" /etc/apt/keyrings/docker.asc

ARCH=$(dpkg --print-architecture)
[[ $ARCH == amd64 || $ARCH == arm64 ]] || die "Unsupported architecture for Docker APT packages: $ARCH"
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${OS_CODENAME}
Components: stable
Architectures: ${ARCH}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker.service containerd.service

add_admin_to_docker_group
verify_docker_install

log "Docker installed: $(docker --version)"
cat <<'EOF'
Docker-published traffic can bypass host-input rules such as UFW. A verified
provider firewall must control public ingress. Bind private ports explicitly to
loopback or the intended Tailscale address, and publish public ports only with
explicit approval. Verify every published port externally.
EOF
