#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/install-nodejs.sh [--major 24]

Installs the selected Node.js LTS major from the NodeSource APT repository.
Major 24 is the default supported LTS line as of this skill's synchronized date.
This installer supports Debian-based amd64 and arm64 hosts.
EOF
}

ORIGINAL_ARGS=("$@")
MAJOR=24
while [[ $# -gt 0 ]]; do
  case "$1" in
    --major) [[ $# -ge 2 ]] || die '--major requires a value.'; MAJOR=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
[[ $MAJOR == 22 || $MAJOR == 24 ]] || die 'Supported LTS major values are 22 and 24; 24 is recommended for a new VPS.'
load_os_release
have apt-get || die 'This local Node.js installer supports Debian-based APT systems only. Use a maintained LTS package source for this distribution.'

ARCH=$(dpkg --print-architecture)
[[ $ARCH == amd64 || $ARCH == arm64 ]] || die "NodeSource supports this skill on amd64 and arm64 only; detected $ARCH."

if have node; then
  INSTALLED_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  if [[ $INSTALLED_MAJOR != "$MAJOR" ]]; then
    die "Node.js $(node --version) is already installed. Refusing an implicit major-version change to $MAJOR."
  fi
  log "Requested Node.js major is already installed: $(node --version)"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg
install -d -m 0755 /usr/share/keyrings
KEY_TMP=$(mktemp)
trap 'rm -f "$KEY_TMP"' EXIT
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o "$KEY_TMP"
gpg --batch --yes --dearmor -o /usr/share/keyrings/nodesource.gpg "$KEY_TMP"
chmod 0644 /usr/share/keyrings/nodesource.gpg

cat >/etc/apt/sources.list.d/nodesource.sources <<EOF
Types: deb
URIs: https://deb.nodesource.com/node_${MAJOR}.x
Suites: nodistro
Components: main
Architectures: ${ARCH}
Signed-By: /usr/share/keyrings/nodesource.gpg
EOF
cat >/etc/apt/preferences.d/nodejs <<'EOF'
Package: nodejs
Pin: origin deb.nodesource.com
Pin-Priority: 600
EOF

apt-get update
apt-get install -y nodejs
[[ $(node -p 'process.versions.node.split(".")[0]') == "$MAJOR" ]] || die "Installed Node.js does not match requested major $MAJOR."
log "Node.js installed: $(node --version); npm: $(npm --version)"
warn 'Third-party repository updates are not automatically included by Ubuntu unattended-upgrades. Apply normal full package upgrades during routine maintenance.'
