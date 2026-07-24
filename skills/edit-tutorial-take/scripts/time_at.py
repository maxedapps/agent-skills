#!/usr/bin/env python3
"""Estimate a timestamp inside a cue by text proportion.

WARNING: speaking rate is not constant. Treat output as a first guess;
refine with scripts/energy_at.py on hard joins.

Stdout: single float seconds
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--start", type=float, required=True, help="Cue start seconds")
    ap.add_argument("--end", type=float, required=True, help="Cue end seconds")
    ap.add_argument("--text", required=True, help="Full cue text")
    ap.add_argument("--needle", required=True, help="Substring to locate")
    ap.add_argument(
        "--after",
        action="store_true",
        help="Return timestamp at end of needle instead of start",
    )
    ap.add_argument(
        "--occurrence",
        type=int,
        default=1,
        help="1-based occurrence index (default 1)",
    )
    args = ap.parse_args()

    if args.end <= args.start:
        print("error: end must be > start", file=sys.stderr)
        return 2
    if args.occurrence < 1:
        print("error: occurrence must be >= 1", file=sys.stderr)
        return 2

    text = args.text
    pos = -1
    start_at = 0
    for _ in range(args.occurrence):
        pos = text.find(args.needle, start_at)
        if pos < 0:
            print(
                f"error: needle {args.needle!r} occurrence {args.occurrence} not in text",
                file=sys.stderr,
            )
            return 2
        start_at = pos + 1

    idx = pos + (len(args.needle) if args.after else 0)
    frac = idx / max(len(text), 1)
    t = args.start + (args.end - args.start) * frac
    print(f"{t:.3f}")
    print(
        f"frac={frac:.4f} idx={idx}/{len(text)} range={args.start:.3f}-{args.end:.3f}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
