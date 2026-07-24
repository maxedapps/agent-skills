#!/usr/bin/env python3
"""Parse an SRT into JSON cues and optional restart/gap/flub reports.

Stdout: JSON (default) or text report.
Stderr: diagnostics.
Exit 0 on success, 2 on usage/input errors.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

CUE_SPLIT = re.compile(r"\n\s*\n")
TS_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})"
)

DEFAULT_FLUB_PATTERNS = [
    r"\b\w{2,}-\s",  # stump: "Becau- ", "cor- "
    r"\b(\w{3,})[,.]?\s+\1\b",  # immediate word repeat
    r"\bwhich,\s*which\b",
    r"\bnow,\s*now\b",
    r"\band,\s*and\b",
    r"\bbecause\s+the,\s*because\b",
    r"\.\.\.\s*$",  # abandoned trailing ellipsis
    r"\bNah\.?\b",
    r"crucifix",
    r"mein Gott",
    r"\buh,\s+the,\s+the\b",
]


def ts_to_s(h: str, m: str, s: str, ms: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def parse_srt(text: str) -> list[dict]:
    cues: list[dict] = []
    for block in CUE_SPLIT.split(text.strip()):
        lines = [ln.rstrip() for ln in block.splitlines() if ln.strip() != ""]
        if len(lines) < 2:
            continue
        # index line optional
        idx = 0
        if re.fullmatch(r"\d+", lines[0]):
            idx = int(lines[0])
            ts_line = lines[1]
            body = lines[2:]
        else:
            ts_line = lines[0]
            body = lines[1:]
        m = TS_RE.search(ts_line)
        if not m:
            continue
        start = ts_to_s(*m.group(1, 2, 3, 4))
        end = ts_to_s(*m.group(5, 6, 7, 8))
        content = re.sub(r"\s+", " ", " ".join(body)).strip()
        if not content:
            continue
        cues.append(
            {
                "i": idx or (len(cues) + 1),
                "start": round(start, 3),
                "end": round(end, 3),
                "text": content,
            }
        )
    return cues


def find_gaps(cues: list[dict], min_gap: float) -> list[dict]:
    gaps = []
    for a, b in zip(cues, cues[1:]):
        g = b["start"] - a["end"]
        if g >= min_gap:
            gaps.append(
                {
                    "after_end": a["end"],
                    "before_start": b["start"],
                    "gap": round(g, 3),
                    "before_text": a["text"][-80:],
                    "after_text": b["text"][:80],
                }
            )
    return gaps


def find_openings(cues: list[dict], needle: str) -> list[dict]:
    n = needle.lower()
    return [
        {"start": c["start"], "end": c["end"], "text": c["text"]}
        for c in cues
        if n in c["text"].lower()
    ]


def find_flubs(cues: list[dict], patterns: list[str]) -> list[dict]:
    compiled = [(p, re.compile(p, re.I | re.M)) for p in patterns]
    hits = []
    for c in cues:
        matched = [p for p, rx in compiled if rx.search(c["text"])]
        if matched:
            hits.append(
                {
                    "start": c["start"],
                    "end": c["end"],
                    "text": c["text"],
                    "patterns": matched,
                }
            )
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("srt", type=Path, help="Path to .srt file")
    ap.add_argument(
        "--format",
        choices=("json", "report"),
        default="json",
        help="stdout format (default: json)",
    )
    ap.add_argument("--gaps", type=float, default=2.0, help="Min gap seconds to report")
    ap.add_argument(
        "--opening",
        action="append",
        default=[],
        help="Opening phrase to locate (repeatable). Default: Let's talk",
    )
    ap.add_argument(
        "--no-flubs",
        action="store_true",
        help="Skip flub pattern scan in report/json extras",
    )
    ap.add_argument(
        "--write-cues",
        type=Path,
        default=None,
        help="Also write cues-only JSON to this path",
    )
    args = ap.parse_args()

    if not args.srt.is_file():
        print(f"error: srt not found: {args.srt}", file=sys.stderr)
        return 2

    text = args.srt.read_text(encoding="utf-8", errors="replace")
    cues = parse_srt(text)
    if not cues:
        print("error: no cues parsed", file=sys.stderr)
        return 2

    openings = args.opening or ["let's talk"]
    payload = {
        "source": str(args.srt),
        "cue_count": len(cues),
        "duration_s": cues[-1]["end"],
        "first_speech_s": cues[0]["start"],
        "cues": cues,
        "gaps": find_gaps(cues, args.gaps),
        "openings": {o: find_openings(cues, o) for o in openings},
        "flubs": [] if args.no_flubs else find_flubs(cues, DEFAULT_FLUB_PATTERNS),
    }

    if args.write_cues:
        args.write_cues.parent.mkdir(parents=True, exist_ok=True)
        args.write_cues.write_text(
            json.dumps({"cues": cues}, indent=2) + "\n", encoding="utf-8"
        )
        print(f"wrote cues: {args.write_cues}", file=sys.stderr)

    if args.format == "json":
        json.dump(payload, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print(f"cues={payload['cue_count']} duration={payload['duration_s']:.2f}s")
        print(f"first_speech={payload['first_speech_s']:.2f}s")
        print(f"\nGaps >= {args.gaps}s: {len(payload['gaps'])}")
        for g in payload["gaps"][:40]:
            print(
                f"  gap {g['gap']:5.1f}s after {g['after_end']:8.2f}s | ...{g['before_text']}"
            )
            print(f"                     before {g['before_start']:8.2f}s | {g['after_text']}")
        for o, hits in payload["openings"].items():
            print(f"\nOpenings matching {o!r}: {len(hits)}")
            for h in hits:
                print(f"  {h['start']:8.2f}-{h['end']:8.2f} | {h['text'][:100]}")
        print(f"\nFlub-pattern cues: {len(payload['flubs'])}")
        for h in payload["flubs"][:60]:
            print(f"  {h['start']:8.2f} | {h['text'][:110]}")
            print(f"           patterns={h['patterns']}")

    print(
        f"parsed {len(cues)} cues from {args.srt}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
