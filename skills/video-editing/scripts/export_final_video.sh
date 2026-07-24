#!/usr/bin/env bash
# Export optimized final MP4 (default 2K 2560x1440).
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: export_final_video.sh --input <master.mp4> --output <final.mp4> [options]

Options:
  --input PATH         Master/composited video (required)
  --output PATH        Final deliverable mp4 (required)
  --width N            Default 2560 (2K)
  --height N           Default 1440
  --video-bitrate B    Default 8M
  --audio-bitrate B    Default 192k
  --encoder NAME       h264_videotoolbox (default) | libx264
  --dry-run            Print command only
  -h, --help           Show help

Exit: 0 ok, 2 usage, else ffmpeg status.
EOF
}

INPUT=""
OUTPUT=""
WIDTH=2560
HEIGHT=1440
VBITRATE="8M"
ABITRATE="192k"
ENCODER="h264_videotoolbox"
DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) INPUT="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --width) WIDTH="${2:-}"; shift 2 ;;
    --height) HEIGHT="${2:-}"; shift 2 ;;
    --video-bitrate) VBITRATE="${2:-}"; shift 2 ;;
    --audio-bitrate) ABITRATE="${2:-}"; shift 2 ;;
    --encoder) ENCODER="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "error: --input and --output required" >&2
  usage
  exit 2
fi
if [[ ! -f "$INPUT" ]]; then
  echo "error: input not found: $INPUT" >&2
  exit 2
fi

mkdir -p "$(dirname "$OUTPUT")"

CMD=(
  ffmpeg -y -i "$INPUT"
  -vf "scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p"
)

case "$ENCODER" in
  h264_videotoolbox)
    CMD+=(-c:v h264_videotoolbox -b:v "$VBITRATE" -allow_sw 1)
    ;;
  libx264)
    CMD+=(-c:v libx264 -preset medium -crf 20)
    ;;
  *)
    echo "error: unsupported encoder: $ENCODER" >&2
    exit 2
    ;;
esac

CMD+=(
  -c:a aac -b:a "$ABITRATE" -ar 48000
  -movflags +faststart
  "$OUTPUT"
)

echo "export final: $INPUT -> $OUTPUT (${WIDTH}x${HEIGHT})" >&2

if [[ "$DRY" -eq 1 ]]; then
  printf '%q ' "${CMD[@]}"
  echo
  exit 0
fi

"${CMD[@]}"
echo "wrote $OUTPUT" >&2
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,codec_name -of default=nw=1 "$OUTPUT" >&2 || true
