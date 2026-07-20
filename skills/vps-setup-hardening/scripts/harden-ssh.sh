#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=skills/vps-setup-hardening/scripts/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
SKILL_DIR=$(skill_dir)

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/harden-ssh.sh --admin USER --confirmed-login-tested

Disables root, password, and keyboard-interactive SSH login after a separate
external key-based login for USER has been tested. Existing sessions stay open.
The confirmation flag is a safety gate and must never be supplied speculatively.
EOF
}

ORIGINAL_ARGS=("$@")
ADMIN=''
CONFIRMED=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin) [[ $# -ge 2 ]] || die '--admin requires a value.'; ADMIN=$2; shift 2 ;;
    --confirmed-login-tested) CONFIRMED=true; shift ;;
    --help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
require_root "${ORIGINAL_ARGS[@]}"
[[ -n $ADMIN ]] || die 'Provide the tested administrator with --admin USER.'
[[ $CONFIRMED == true ]] || die 'First test a separate external key-based login, then rerun with --confirmed-login-tested.'
id "$ADMIN" >/dev/null 2>&1 || die "Administrator does not exist: $ADMIN"
ADMIN_HOME=$(getent passwd "$ADMIN" | awk -F: '{print $6}')
[[ -s "$ADMIN_HOME/.ssh/authorized_keys" ]] || die "$ADMIN has no non-empty authorized_keys file."
have sshd || die 'sshd is not installed or not in PATH.'

SSHD_CONFIG=/etc/ssh/sshd_config
TEMPLATE="$SKILL_DIR/assets/config/00-agent-recipes-hardening.conf"
[[ -r $SSHD_CONFIG ]] || die "Missing SSH daemon configuration: $SSHD_CONFIG"
[[ -r $TEMPLATE ]] || die "Missing hardening template: $TEMPLATE"

TARGET=''
TARGET_EXISTED=false
BACKUP=''
if grep -Eiq '^[[:space:]]*Include[[:space:]]+.*sshd_config\.d/' "$SSHD_CONFIG"; then
  TARGET=/etc/ssh/sshd_config.d/00-agent-recipes-hardening.conf
  mkdir -p /etc/ssh/sshd_config.d
  [[ -e $TARGET ]] && TARGET_EXISTED=true
  if [[ -e $TARGET ]]; then
    BACKUP="${TARGET}.agent-recipes.rollback"
    cp -a "$TARGET" "$BACKUP"
  fi
  install -m 0644 "$TEMPLATE" "$TARGET"
else
  TARGET=$SSHD_CONFIG
  TARGET_EXISTED=true
  BACKUP="${SSHD_CONFIG}.agent-recipes.rollback"
  cp -a "$SSHD_CONFIG" "$BACKUP"
  TEMP_CONFIG=$(mktemp)
  trap 'rm -f "${TEMP_CONFIG:-}"' EXIT
  {
    echo '# BEGIN AGENT-RECIPES HARDENING'
    cat "$TEMPLATE"
    echo '# END AGENT-RECIPES HARDENING'
    echo
    awk '
      /^# BEGIN AGENT-RECIPES HARDENING$/ {skip=1; next}
      /^# END AGENT-RECIPES HARDENING$/ {skip=0; next}
      !skip {print}
    ' "$SSHD_CONFIG"
  } >"$TEMP_CONFIG"
  install -m 0600 "$TEMP_CONFIG" "$SSHD_CONFIG"
fi

rollback() {
  warn 'Rolling back the SSH configuration.'
  if [[ -n $BACKUP && -e $BACKUP ]]; then
    cp -a "$BACKUP" "$TARGET"
  elif [[ $TARGET_EXISTED == false ]]; then
    rm -f "$TARGET"
  fi
}

if ! sshd -t; then
  rollback
  die 'sshd rejected the hardening configuration.'
fi

EFFECTIVE=$(sshd -T -C "user=$ADMIN,host=localhost,addr=127.0.0.1")
check_setting() {
  local key=$1 expected=$2 actual
  actual=$(awk -v key="$key" '$1 == key {print $2; exit}' <<<"$EFFECTIVE")
  [[ $actual == "$expected" ]] || {
    rollback
    die "Effective sshd setting $key is '$actual', expected '$expected'. An earlier configuration entry may override the managed file."
  }
}
check_setting permitrootlogin no
check_setting pubkeyauthentication yes
check_setting passwordauthentication no
check_setting kbdinteractiveauthentication no

if have systemctl; then
  if systemctl reload ssh.service 2>/dev/null; then
    SSH_SERVICE=ssh.service
  elif systemctl reload sshd.service 2>/dev/null; then
    SSH_SERVICE=sshd.service
  else
    rollback
    systemctl reload ssh.service 2>/dev/null || systemctl reload sshd.service 2>/dev/null || true
    die 'Could not reload the SSH service; the previous configuration was restored.'
  fi
else
  rollback
  die 'No supported service manager was found to reload sshd safely.'
fi
rm -f "$BACKUP"

log "SSH hardening is active via $TARGET ($SSH_SERVICE)."
echo 'Keep the current session open and test another new login now.'
echo 'The firewall has not been changed.'
