#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/al2023-ec2/install-nodejs.sh [--major 24]

Installs Node.js from Amazon Linux 2023 packages (nodejs24/nodejs24-npm or
nodejs22/nodejs22-npm), selects the namespaced binary through alternatives,
and verifies both namespaced and default commands. Major 24 is the default.
EOF
}

ORIGINAL_ARGS=("$@")
MAJOR=24
while [[ $# -gt 0 ]]; do
  case "$1" in
    --major) [[ $# -ge 2 ]] || die '--major requires a value.'; MAJOR=$2; shift 2 ;;
    --releasever) die 'Later AL installers use the host pinned release; do not pass --releasever.' ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
require_profile al2023-ec2
[[ $MAJOR == 22 || $MAJOR == 24 ]] || die 'Supported major values are 22 and 24; 24 is recommended for a new VPS.'
have dnf || die 'dnf is required.'

PINNED=$(rpm -q system-release --qf '%{VERSION}\n' 2>/dev/null || true)
[[ -n $PINNED ]] || die 'Could not read pinned system-release version. Run al2023-ec2/apply-base-setup.sh first.'
log "Using host pinned AL2023 release: $PINNED"

if have node; then
  INSTALLED_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)
  if [[ -n $INSTALLED_MAJOR && $INSTALLED_MAJOR != "$MAJOR" ]]; then
    die "Node.js $(node --version) is already installed. Refusing an implicit major-version change to $MAJOR."
  fi
fi

PKG_NODE="nodejs${MAJOR}"
PKG_NPM="nodejs${MAJOR}-npm"
dnf -y install "$PKG_NODE" "$PKG_NPM"

# Amazon packages ship namespaced binaries; select them via alternatives.
NODE_BIN=''
NPM_BIN=''
for candidate in "/usr/bin/node-${MAJOR}" "/usr/bin/node${MAJOR}"; do
  [[ -x $candidate ]] && NODE_BIN=$candidate && break
done
for candidate in "/usr/bin/npm-${MAJOR}" "/usr/bin/npm${MAJOR}"; do
  [[ -x $candidate ]] && NPM_BIN=$candidate && break
done
[[ -n $NODE_BIN ]] || die "Namespaced node binary for major $MAJOR was not found after package install."
[[ -n $NPM_BIN ]] || die "Namespaced npm binary for major $MAJOR was not found after package install."

if have alternatives; then
  if alternatives --display node >/dev/null 2>&1; then
    alternatives --set node "$NODE_BIN" 2>/dev/null \
      || alternatives --install /usr/bin/node node "$NODE_BIN" 100
  else
    alternatives --install /usr/bin/node node "$NODE_BIN" 100
  fi
  if alternatives --display npm >/dev/null 2>&1; then
    alternatives --set npm "$NPM_BIN" 2>/dev/null \
      || alternatives --install /usr/bin/npm npm "$NPM_BIN" 100
  else
    alternatives --install /usr/bin/npm npm "$NPM_BIN" 100
  fi
else
  warn 'alternatives is unavailable; relying on package default path selection.'
fi

have node || die 'node command is unavailable after install.'
have npm || die 'npm command is unavailable after install.'
[[ $(node -p 'process.versions.node.split(".")[0]') == "$MAJOR" ]] \
  || die "Default node does not match requested major $MAJOR."
[[ $($NODE_BIN -p 'process.versions.node.split(".")[0]') == "$MAJOR" ]] \
  || die "Namespaced node binary does not match requested major $MAJOR."

log "Node.js installed on release $PINNED: default $(node --version) / namespaced $($NODE_BIN --version); npm $(npm --version)"
if have alternatives; then
  alternatives --display node 2>/dev/null | head -n 20 || true
fi
