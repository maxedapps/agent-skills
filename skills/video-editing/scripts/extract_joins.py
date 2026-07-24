#!/usr/bin/env python3
"""Extract short WAV clips around keep-list boundaries for listen QA.

For each interior boundary between keep segments, exports a clip spanning
the end of segment i and start of segment i+1 in SOURCE time (with padding),
useful to hear whether a join will sound clean before/after rendering.

Stdout: JSON list of clips
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_srt import load_keeps  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--video", type=Path, required=True)
    ap.add_argument("--keeps", type=Path, required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument(
        "--pad",
        type=float,
        default=1.25,
        help="Seconds of audio before end and after next start (default 1.25)",
    )
    ap.add_argument("--limit", type=int, default=0, help="Max clips (0=all)")
    args = ap.parse_args()

    if not args.video.is_file():
        print(f"error: video not found: {args.video}", file=sys.stderr)
        return 2
    keeps = load_keeps(args.keeps)
    if len(keeps) < 2:
        print("error: need at least 2 keeps", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    clips = []
    pairs = list(zip(keeps, keeps[1:]))
    if args.limit > 0:
        pairs = pairs[: args.limit]

    for i, (a, b) in enumerate(pairs):
        # source window covering outgoing tail + incoming head
        t0 = max(0.0, a["end"] - args.pad)
        t1 = b["start"] + args.pad
        # if they are contiguous in source, still useful
        dur = max(0.05, t1 - t0)
        out = args.out_dir / f"join_{i:03d}_{a['end']:.2f}_{b['start']:.2f}.wav"
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{t0:.3f}",
            "-i",
            str(args.video),
            "-t",
            f"{dur:.3f}",
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            str(out),
        ]
        p = subprocess.run(cmd, text=True, capture_output=True, check=False)
        if p.returncode != 0:
            print(p.stderr[-500:], file=sys.stderr)
            print(f"error: ffmpeg failed for join {i}", file=sys.stderr)
            return 2
        clips.append(
            {
                "index": i,
                "path": str(out),
                "left_end": a["end"],
                "right_start": b["start"],
                "source_gap": round(b["start"] - a["end"], 3),
                "left_note": a.get("note", ""),
                "right_note": b.get("note", ""),
                "window": [round(t0, 3), round(t1, 3)],
            }
        )

    json.dump({"clips": clips, "count": len(clips)}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"wrote {len(clips)} join clips -> {args.out_dir}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
