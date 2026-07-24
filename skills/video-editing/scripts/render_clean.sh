#!/usr/bin/env bash
# Render a clean cut from source video + filter_complex script.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: render_clean.sh --video <src.mp4> --filter <filter.txt> --output <out.mp4> [options]

Options:
  --video PATH       Source video (required)
  --filter PATH      ffmpeg filter_complex_script (required)
  --output PATH      Output mp4 (required)
  --encoder NAME     h264_videotoolbox (default) | libx264
  --video-bitrate B  Default: 12M
  --audio-bitrate B  Default: 192k
  --dry-run          Print command only
  -h, --help         Show help

Exit codes: 0 ok, 2 usage error, otherwise ffmpeg status.
EOF
}

VIDEO=""
FILTER=""
OUTPUT=""
ENCODER="h264_videotoolbox"
VBITRATE="12M"
ABITRATE="192k"
DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --video) VIDEO="${2:-}"; shift 2 ;;
    --filter) FILTER="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --encoder) ENCODER="${2:-}"; shift 2 ;;
    --video-bitrate) VBITRATE="${2:-}"; shift 2 ;;
    --audio-bitrate) ABITRATE="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$VIDEO" || -z "$FILTER" || -z "$OUTPUT" ]]; then
  echo "error: --video, --filter, --output required" >&2
  usage
  exit 2
fi
if [[ ! -f "$VIDEO" ]]; then echo "error: video not found: $VIDEO" >&2; exit 2; fi
if [[ ! -f "$FILTER" ]]; then echo "error: filter not found: $FILTER" >&2; exit 2; fi

mkdir -p "$(dirname "$OUTPUT")"

CMD=(
  ffmpeg -y -i "$VIDEO"
  -filter_complex_script "$FILTER"
  -map "[outv]" -map "[outa]"
)

case "$ENCODER" in
  h264_videotoolbox)
    CMD+=(-c:v h264_videotoolbox -b:v "$VBITRATE" -allow_sw 1)
    ;;
  libx264)
    CMD+=(-c:v libx264 -preset medium -crf 18)
    ;;
  *)
    echo "error: unsupported encoder: $ENCODER" >&2
    exit 2
    ;;
esac

CMD+=(
  -c:a aac -b:a "$ABITRATE" -ac 1 -ar 48000
  -movflags +faststart
  "$OUTPUT"
)

echo "render: $VIDEO -> $OUTPUT" >&2
echo "encoder=$ENCODER filter=$FILTER" >&2

if [[ "$DRY" -eq 1 ]]; then
  printf '%q ' "${CMD[@]}"
  echo
  exit 0
fi

"${CMD[@]}"
echo "wrote $OUTPUT" >&2
