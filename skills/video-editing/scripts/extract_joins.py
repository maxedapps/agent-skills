#!/usr/bin/env python3
"""Extract WAV clips that audition actual assembled edit seams.

Preferred mode uses rendered preview/master media plus ``--plan --timeline output``.
Backward-compatible ``--video SOURCE --keeps ...`` uses source mode, but concatenates
the outgoing tail and incoming head so deleted source material is never auditioned.

Stdout: bounded JSON clip manifest. Stderr: diagnostics. Exit 0 success, 2 error.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_srt import load_keeps  # noqa: E402


def load_segments(plan: Path | None, keeps: Path | None) -> list[dict]:
    if plan:
        data = json.loads(plan.read_text(encoding="utf-8"))
        segments = data.get("segments")
        if not segments:
            raise ValueError("edit plan has no segments")
        return [dict(segment) for segment in segments]
    if keeps:
        return load_keeps(keeps)
    raise ValueError("pass --plan or --keeps")


def run_ffmpeg(cmd: list[str], index: int) -> None:
    process = subprocess.run(cmd, text=True, capture_output=True, check=False)
    if process.returncode != 0:
        print(process.stderr[-1000:], file=sys.stderr)
        raise RuntimeError(f"ffmpeg failed for join {index}")


def output_clip_cmd(media: Path, seam: float, pad: float, output: Path) -> tuple[list[str], list[float]]:
    start = max(0.0, seam - pad)
    duration = max(0.05, seam + pad - start)
    return (
        [
            "ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", str(media),
            "-t", f"{duration:.3f}", "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1", str(output),
        ],
        [round(start, 3), round(start + duration, 3)],
    )


def source_clip_cmd(
    media: Path, left: dict, right: dict, pad: float, output: Path
) -> tuple[list[str], list[list[float]]]:
    left_start = max(float(left["start"]), float(left["end"]) - pad)
    left_end = float(left["end"])
    right_start = float(right["start"])
    right_end = min(float(right["end"]), right_start + pad)
    if left_end <= left_start or right_end <= right_start:
        raise ValueError("join side is too short to extract")
    graph = (
        f"[0:a]atrim=start={left_start:.6f}:end={left_end:.6f},"
        "asetpts=PTS-STARTPTS[l];"
        f"[0:a]atrim=start={right_start:.6f}:end={right_end:.6f},"
        "asetpts=PTS-STARTPTS[r];"
        "[l][r]concat=n=2:v=0:a=1[out]"
    )
    return (
        [
            "ffmpeg", "-y", "-i", str(media), "-filter_complex", graph,
            "-map", "[out]", "-acodec", "pcm_s16le", "-ar", "16000",
            "-ac", "1", str(output),
        ],
        [[round(left_start, 3), round(left_end, 3)], [round(right_start, 3), round(right_end, 3)]],
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--video", "--media", dest="video", type=Path, required=True)
    source = ap.add_mutually_exclusive_group(required=True)
    source.add_argument("--plan", type=Path, help="Final edit-plan.json")
    source.add_argument("--keeps", type=Path, help="Keep-list (legacy source mode)")
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument(
        "--timeline", choices=("auto", "output", "source"), default="auto",
        help="output=rendered media seams; source=assemble disjoint source tails/heads",
    )
    ap.add_argument("--pad", type=float, default=1.25, help="Seconds on each side")
    ap.add_argument("--limit", type=int, default=0, help="Max clips (0=all)")
    args = ap.parse_args()

    if not args.video.is_file():
        print(f"error: media not found: {args.video}", file=sys.stderr)
        return 2
    metadata_path = args.plan or args.keeps
    if metadata_path is None or not metadata_path.is_file():
        print(f"error: plan/keeps not found: {metadata_path}", file=sys.stderr)
        return 2
    if args.pad <= 0 or args.limit < 0:
        print("error: --pad must be positive and --limit non-negative", file=sys.stderr)
        return 2

    timeline = args.timeline
    if timeline == "auto":
        timeline = "output" if args.plan else "source"
    if timeline == "output" and not args.plan:
        print("error: output timeline requires --plan", file=sys.stderr)
        return 2

    try:
        segments = load_segments(args.plan, args.keeps)
        if len(segments) < 2:
            raise ValueError("need at least 2 edit segments")
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    pairs = list(zip(segments, segments[1:]))
    if args.limit:
        pairs = pairs[: args.limit]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    clips: list[dict] = []
    cursor = 0.0

    try:
        for index, (left, right) in enumerate(pairs):
            output = args.out_dir / f"join_{index:03d}.wav"
            if timeline == "output":
                if left.get("output_end") is not None:
                    seam = float(left["output_end"])
                    cursor = seam
                else:
                    cursor += float(left.get("dur", float(left["end"]) - float(left["start"])))
                    seam = cursor
                cmd, window = output_clip_cmd(args.video, seam, args.pad, output)
                detail = {"seam": round(seam, 3), "window": window}
            else:
                cmd, windows = source_clip_cmd(args.video, left, right, args.pad, output)
                detail = {
                    "source_windows": windows,
                    "source_gap_excluded_s": round(float(right["start"]) - float(left["end"]), 3),
                }
            run_ffmpeg(cmd, index)
            clips.append(
                {
                    "index": index,
                    "path": str(output),
                    "timeline": timeline,
                    "left_note": left.get("note", ""),
                    "right_note": right.get("note", ""),
                    **detail,
                }
            )
    except (RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    json.dump({"clips": clips, "count": len(clips), "timeline": timeline}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"wrote {len(clips)} assembled join clips -> {args.out_dir}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
