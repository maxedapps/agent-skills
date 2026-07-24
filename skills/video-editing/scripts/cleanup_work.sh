#!/usr/bin/env bash
# Remove disposable work artifacts; keep sources + deliverables + lean edit metadata.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: cleanup_work.sh --project-root <dir> [options]

Removes analysis media, face intermediates, joins, previews, and optional
duplicate masters. Keeps:
  - user sources (not deleted by this script)
  - deliverables/
  - work/edit/keep-list.json, edit-plan.json (and *.json metadata)

Options:
  --project-root DIR   Project directory (required)
  --also-masters       Also delete work/**/master*.mp4 and root *-clean*.mp4 intermediates
  --caption-work       Delete work/captions after requested caption files are delivered
  --dry-run            Print actions only
  -h, --help
EOF
}

ROOT=""
DRY=0
MASTERS=0
CAPTION_WORK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) ROOT="${2:-}"; shift 2 ;;
    --also-masters) MASTERS=1; shift ;;
    --caption-work) CAPTION_WORK=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ROOT" || ! -d "$ROOT" ]]; then
  echo "error: --project-root required" >&2
  exit 2
fi

run() {
  if [[ "$DRY" -eq 1 ]]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

cd "$ROOT"

# common disposable dirs/files
for p in \
  work/analysis \
  work/joins \
  work/face \
  audio-analysis
 do
  if [[ -e "$p" ]]; then
    run "rm -rf -- '$p'"
  fi
done

# disposable globs under work
if [[ -d work ]]; then
  while IFS= read -r -d '' f; do
    case "$f" in
      work/edit/*.json) continue ;;
      *) run "rm -rf -- '$f'" ;;
    esac
  done < <(find work -mindepth 1 -maxdepth 3 \( \
      -name '*.wav' -o -name '*.png' -o -name '*.jpg' -o -name 'wave_*' -o -name 'spec_*' \
      -o -name 'preview_*' -o -name 'face-window.mp4' -o -name 'face-track.mp4' \
      -o -name 'filter.txt' -o -name 'clean-preview.*' -o -name 'join_*' \
    \) -print0 2>/dev/null || true)
fi

if [[ "$MASTERS" -eq 1 ]]; then
  while IFS= read -r -d '' f; do
    run "rm -f -- '$f'"
  done < <(find . -maxdepth 2 \( -name '*-clean.mp4' -o -name '*-clean-pip.mp4' -o -name 'master-4k.mp4' \) -print0 2>/dev/null || true)
fi

if [[ "$CAPTION_WORK" -eq 1 && -d work/captions ]]; then
  run "rm -rf -- 'work/captions'"
fi

# tmp leftovers if named
for p in /tmp/face-sync /tmp/vibe-audio /tmp/edit-skill-smoke /tmp/edit-skill-smoke2; do
  if [[ -e "$p" ]]; then
    run "rm -rf -- '$p'"
  fi
done

echo "cleanup complete (dry_run=$DRY)" >&2
if [[ -d deliverables ]]; then
  echo "deliverables:" >&2
  ls -la deliverables >&2 || true
fi
