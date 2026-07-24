#!/usr/bin/env python3
"""Convert SRT captions to WebVTT.

Stdout: summary JSON
Stderr: diagnostics
Exit 0 success, 2 usage/input error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

TS_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})"
)


def srt_ts_to_vtt(h: str, m: str, s: str, ms: str) -> str:
    return f"{h}:{m}:{s}.{ms}"


def convert(srt_text: str) -> str:
    blocks = re.split(r"\n\s*\n", srt_text.strip())
    out = ["WEBVTT", ""]
    cue_i = 0
    for block in blocks:
        lines = [ln.rstrip() for ln in block.splitlines() if ln.strip() != ""]
        if len(lines) < 2:
            continue
        if re.fullmatch(r"\d+", lines[0]):
            ts_line = lines[1]
            body = lines[2:]
        else:
            ts_line = lines[0]
            body = lines[1:]
        m = TS_RE.search(ts_line)
        if not m or not body:
            continue
        start = srt_ts_to_vtt(*m.group(1, 2, 3, 4))
        end = srt_ts_to_vtt(*m.group(5, 6, 7, 8))
        cue_i += 1
        out.append(str(cue_i))
        out.append(f"{start} --> {end}")
        out.extend(body)
        out.append("")
    if cue_i == 0:
        raise ValueError("no cues converted")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("srt", type=Path, help="Input .srt")
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output .vtt (default: alongside input with .vtt)",
    )
    args = ap.parse_args()

    if not args.srt.is_file():
        print(f"error: srt not found: {args.srt}", file=sys.stderr)
        return 2

    out = args.output or args.srt.with_suffix(".vtt")
    try:
        vtt = convert(args.srt.read_text(encoding="utf-8", errors="replace"))
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(vtt, encoding="utf-8")
    summary = {
        "input": str(args.srt),
        "output": str(out),
        "bytes": out.stat().st_size,
        "cues": vtt.count("\n\n"),
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"wrote {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
