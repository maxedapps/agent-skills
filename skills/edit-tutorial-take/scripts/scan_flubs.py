#!/usr/bin/env python3
"""Scan cleaned transcript/SRT text for leftover flub patterns.

Stdout: JSON findings
Stderr: human summary
Exit 0 if clean (or only --soft findings), 1 if findings with --strict, 2 on errors.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_srt import parse_srt  # noqa: E402

# Patterns that usually mean the edit is not done.
HARD_PATTERNS = [
    (r"\b\w{2,}-\s+\w+", "stump-word residual (e.g. 're- code')"),
    (r"\bwhich,\s*which(?:,\s*which)?\b", "which-stutter"),
    (r"\bto again,\s*to again\b", "double 'to again' join"),
    (r"\bbecause I,\s*because I\b", "double because-I join"),
    (r"\bnow,\s*now\b", "now-stutter"),
    (r"\bbecause the,\s*because\b", "because-stutter"),
    (r"\bcrucifix\b", "frustration aside"),
    (r"\bmein Gott\b", "frustration aside"),
    (r"\bNah\.?\b", "abandoned thought marker"),
    (r"\bhas to--\b", "aborted phrase"),
    (r"\bI d-\s", "aborted phrase"),
    (r"Let's talk[\s\S]{0,80}Let's talk", "duplicate intro opening"),
]

# Often style; report but don't fail strictly unless --include-soft-strict
SOFT_PATTERNS = [
    (r"\buh\b", "filler uh"),
    (r"\bum\b", "filler um"),
    (r"\b(\w{4,})\b[,.]?\s+\1\b", "immediate word repeat (may be intentional)"),
]


def load_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() == ".srt":
        cues = parse_srt(raw)
        return " ".join(c["text"] for c in cues)
    return raw


def scan(text: str, patterns: list[tuple[str, str]]) -> list[dict]:
    hits = []
    for pat, label in patterns:
        for m in re.finditer(pat, text, flags=re.I | re.M):
            i = m.start()
            snippet = text[max(0, i - 40) : i + 60].replace("\n", " ")
            hits.append(
                {
                    "label": label,
                    "pattern": pat,
                    "match": m.group(0),
                    "index": i,
                    "snippet": snippet,
                }
            )
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("path", type=Path, help="Clean .txt or .srt")
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 when any hard findings exist",
    )
    ap.add_argument(
        "--include-soft",
        action="store_true",
        help="Include soft/style findings in output",
    )
    args = ap.parse_args()

    if not args.path.is_file():
        print(f"error: not found: {args.path}", file=sys.stderr)
        return 2

    text = load_text(args.path)
    hard = scan(text, HARD_PATTERNS)
    soft = scan(text, SOFT_PATTERNS) if args.include_soft else []

    payload = {
        "path": str(args.path),
        "chars": len(text),
        "hard_count": len(hard),
        "soft_count": len(soft),
        "hard": hard,
        "soft": soft,
    }
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")

    print(f"hard={len(hard)} soft={len(soft)} file={args.path}", file=sys.stderr)
    for h in hard[:30]:
        print(f"  HARD {h['label']}: ...{h['snippet']}...", file=sys.stderr)

    if args.strict and hard:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
