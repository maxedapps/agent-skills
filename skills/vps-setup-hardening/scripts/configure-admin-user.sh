#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/configure-admin-user.sh --admin USER [--authorized-keys-file FILE]

Creates or updates a named administrator, grants passwordless sudo, and installs
SSH authorized keys. If FILE is omitted, the script reuses the administrator's
existing keys, the invoking sudo user's keys, or root's keys—in that order.
It does not change sshd or firewall settings.

Requires a supported profile (ubuntu or al2023-ec2).
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
KEY_SOURCE=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --authorized-keys-file) [[ $# -ge 2 ]] || die '--authorized-keys-file requires a value.'; KEY_SOURCE=$2; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
[[ -n $ADMIN ]] || die 'Provide a valid lowercase Linux username with --admin.'
[[ $ADMIN =~ ^[a-z_][a-z0-9_-]*[$]?$ ]] || die 'Provide a valid lowercase Linux username with --admin.'
require_root "${ORIGINAL_ARGS[@]}"
detect_profile

if id "$ADMIN" >/dev/null 2>&1; then
  log "Administrator account already exists: $ADMIN"
else
  if have adduser && adduser --help 2>&1 | grep -q -- '--disabled-password'; then
    adduser --disabled-password --gecos '' "$ADMIN"
  elif have useradd; then
    useradd --create-home --shell /bin/bash "$ADMIN"
  else
    die 'Neither adduser nor useradd is available.'
  fi
  log "Created administrator account: $ADMIN"
fi

ADMIN_HOME=$(getent passwd "$ADMIN" | awk -F: '{print $6}')
[[ -n $ADMIN_HOME && -d $ADMIN_HOME ]] || die "Could not determine a home directory for $ADMIN."
ADMIN_GROUP=$(id -gn "$ADMIN")
ADMIN_SHELL=$(getent passwd "$ADMIN" | awk -F: '{print $7}')
case "$ADMIN_SHELL" in
  */nologin|*/false) die "Administrator $ADMIN has a non-login shell: $ADMIN_SHELL" ;;
esac

if getent group sudo >/dev/null 2>&1; then
  usermod -aG sudo "$ADMIN"
elif getent group wheel >/dev/null 2>&1; then
  usermod -aG wheel "$ADMIN"
else
  die 'Neither sudo nor wheel administration group exists.'
fi

SUDOERS_FILE="/etc/sudoers.d/90-agent-recipes-${ADMIN}"
SUDOERS_TMP=$(mktemp)
trap 'rm -f "$SUDOERS_TMP"' EXIT
printf '%s ALL=(ALL:ALL) NOPASSWD: ALL\n' "$ADMIN" >"$SUDOERS_TMP"
chmod 0440 "$SUDOERS_TMP"
have visudo || die 'visudo is required to validate the sudoers configuration.'
visudo -cf "$SUDOERS_TMP" >/dev/null
if [[ ! -e $SUDOERS_FILE ]] || ! cmp -s "$SUDOERS_TMP" "$SUDOERS_FILE"; then
  backup_file "$SUDOERS_FILE"
  install -m 0440 "$SUDOERS_TMP" "$SUDOERS_FILE"
fi
visudo -cf /etc/sudoers >/dev/null
log "Configured passwordless sudo for $ADMIN."

ADMIN_KEYS="$ADMIN_HOME/.ssh/authorized_keys"
if [[ -z $KEY_SOURCE ]]; then
  if [[ -s $ADMIN_KEYS ]]; then
    KEY_SOURCE=$ADMIN_KEYS
  elif [[ -n ${SUDO_USER:-} && $SUDO_USER != root ]]; then
    SUDO_HOME=$(getent passwd "$SUDO_USER" | awk -F: '{print $6}')
    [[ -s "$SUDO_HOME/.ssh/authorized_keys" ]] && KEY_SOURCE="$SUDO_HOME/.ssh/authorized_keys"
  fi
  if [[ -z $KEY_SOURCE && -s /root/.ssh/authorized_keys ]]; then
    KEY_SOURCE=/root/.ssh/authorized_keys
  fi
fi
[[ -n $KEY_SOURCE ]] || die "No SSH keys were found. Save the intended public key in a file and rerun with --authorized-keys-file FILE."
[[ -r $KEY_SOURCE && -s $KEY_SOURCE ]] || die "Authorized-keys source is missing or empty: $KEY_SOURCE"

install -d -m 0700 -o "$ADMIN" -g "$ADMIN_GROUP" "$ADMIN_HOME/.ssh"
KEYS_TMP=$(mktemp)
trap 'rm -f "$SUDOERS_TMP" "$KEYS_TMP"' EXIT
{
  [[ -r $ADMIN_KEYS ]] && cat "$ADMIN_KEYS"
  cat "$KEY_SOURCE"
} | awk 'NF && !seen[$0]++' >"$KEYS_TMP"

have ssh-keygen || die 'ssh-keygen is required to validate the authorized keys.'
ssh-keygen -lf "$KEYS_TMP" >/dev/null 2>&1 || die 'The authorized-keys input contains no key that ssh-keygen can parse.'
install -m 0600 -o "$ADMIN" -g "$ADMIN_GROUP" "$KEYS_TMP" "$ADMIN_KEYS"
chmod 0750 "$ADMIN_HOME"
log "Installed SSH keys for $ADMIN from $KEY_SOURCE."
log "Passwordless sudo means possession of this SSH key is root-equivalent."

SSH_PORT=$(detect_ssh_port || printf '22')
echo
printf 'Next, test a separate external login before hardening SSH:\n  ssh -p %s %s@<server-public-ip-or-hostname>\n' "$SSH_PORT" "$ADMIN"
echo 'Do not close the current session until that login succeeds.'
