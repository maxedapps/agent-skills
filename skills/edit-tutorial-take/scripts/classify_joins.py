#!/usr/bin/env python3
"""Classify keep-list edges as surgical|soft|section from gaps + optional SRT.

Writes an updated keep-list (stdout JSON summary; optional --output).

Rules (defaults):
- gap to next keep < 0.8s  -> out=surgical
- gap < 2.5s               -> out=soft
- else                     -> out=section
- last keep                -> out=section
- in=tight if previous out surgical else natural
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_keeps_file, write_keeps_file  # noqa: E402


def classify(keeps: list[dict], g_surg: float, g_soft: float) -> list[dict]:
    out: list[dict] = []
    for i, k in enumerate(keeps):
        item = dict(k)
        if i + 1 >= len(keeps):
            item["out"] = "section"
            item["in"] = item.get("in") or "natural"
        else:
            gap = keeps[i + 1]["start"] - k["end"]
            if gap < g_surg:
                item["out"] = "surgical"
            elif gap < g_soft:
                item["out"] = "soft"
            else:
                item["out"] = "section"
            item["_gap_to_next"] = round(gap, 3)
        out.append(item)

    # set in based on previous out
    for i, item in enumerate(out):
        if i == 0:
            item["in"] = item.get("in") or "natural"
            continue
        prev_out = out[i - 1].get("out")
        if prev_out == "surgical":
            item["in"] = "tight"
        elif item.get("in") in (None, ""):
            item["in"] = "natural"
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--keeps", type=Path, required=True)
    ap.add_argument("--output", type=Path, default=None, help="Write annotated keep-list")
    ap.add_argument("--surgical-gap", type=float, default=0.8)
    ap.add_argument("--soft-gap", type=float, default=2.5)
    ap.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing in/out tags",
    )
    args = ap.parse_args()

    try:
        meta, keeps = load_keeps_file(args.keeps)
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    classified = classify(keeps, args.surgical_gap, args.soft_gap)
    if not args.force:
        # preserve explicit tags
        for old, new in zip(keeps, classified):
            if old.get("out") in ("surgical", "soft", "section"):
                new["out"] = old["out"]
            if old.get("in") in ("tight", "natural"):
                new["in"] = old["in"]

    counts = {"surgical": 0, "soft": 0, "section": 0}
    for k in classified:
        counts[str(k.get("out", "soft"))] = counts.get(str(k.get("out", "soft")), 0) + 1

    out_path = args.output
    if out_path:
        # strip helper field before write? keep gap as useful audit
        write_keeps_file(out_path, meta if isinstance(meta, dict) else {"keeps": classified}, classified)

    summary = {
        "input": str(args.keeps),
        "output": str(out_path) if out_path else None,
        "counts": counts,
        "keeps": [
            {
                "start": k["start"],
                "end": k["end"],
                "in": k.get("in"),
                "out": k.get("out"),
                "gap_to_next": k.get("_gap_to_next"),
                "note": k.get("note", ""),
            }
            for k in classified
        ],
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"classified {len(classified)} keeps: {counts}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
