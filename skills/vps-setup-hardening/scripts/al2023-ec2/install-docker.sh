#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/al2023-ec2/install-docker.sh [--admin USER]

Installs Docker from the Amazon Linux 2023 repository only (package name:
docker). Verifies Engine, Compose, Buildx, service state, and hello-world.
There is no Docker CE or third-party plugin fallback.

A verified EC2 Security Group must already govern Docker-published ingress.
Sudo-based administration is the default. --admin adds USER to the
root-equivalent docker group only after explicit approval.
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --releasever) die 'Later AL installers use the host pinned release; do not pass --releasever.' ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
require_profile al2023-ec2
have dnf || die 'dnf is required.'
have rpm || die 'rpm is required to read the pinned system-release version.'

PINNED=$(rpm -q system-release --qf '%{VERSION}\n' 2>/dev/null || true)
[[ -n $PINNED ]] || die 'Could not read pinned system-release version. Run al2023-ec2/apply-base-setup.sh first.'
log "Using host pinned AL2023 release: $PINNED"

add_admin_to_docker_group() {
  [[ -n $ADMIN ]] || return 0
  id "$ADMIN" >/dev/null 2>&1 || die "Administrator does not exist: $ADMIN"
  usermod -aG docker "$ADMIN"
  warn "$ADMIN was added to the root-equivalent docker group by explicit approval. A new login is required before group membership applies."
}

verify_docker_install() {
  local test_container="vps-setup-hardening-hello-$$"
  docker info >/dev/null || die 'Docker Engine is not responding.'
  docker compose version >/dev/null || die 'Docker Compose is unavailable from the Amazon docker package. No fallback will be attempted.'
  docker buildx version >/dev/null || die 'Docker Buildx is unavailable from the Amazon docker package. No fallback will be attempted.'
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

# Refuse obvious third-party/CE leftovers without attempting migration.
CONFLICTS=()
for package in docker-ce docker-ce-cli docker-compose-plugin docker-buildx-plugin; do
  if rpm -q "$package" >/dev/null 2>&1; then
    CONFLICTS+=("$package")
  fi
done
if [[ ${#CONFLICTS[@]} -gt 0 ]]; then
  die "Conflicting Docker CE packages are installed: ${CONFLICTS[*]}. Review them explicitly; this installer uses only Amazon's docker package."
fi

dnf -y install docker
systemctl enable --now docker

add_admin_to_docker_group
verify_docker_install

log "Docker installed from Amazon repositories on release $PINNED: $(docker --version)"
cat <<'EOF'
Docker-published traffic must be governed by the instance Security Group.
Bind private ports explicitly to loopback or the intended Tailscale address,
and publish public ports only with explicit approval. Verify every published
port externally.
EOF
