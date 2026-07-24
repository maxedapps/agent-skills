#!/usr/bin/env python3
"""Annotate missing keep-list edge classes from advisory source-gap heuristics.

Source gaps describe removed source material, not the desired clean-timeline pause.
Existing semantic ``join`` values and explicit ``in``/``out`` edge classes are
therefore preserved unless the legacy ``--force`` option is requested. The
incoming edge is derived only after the preceding final outgoing class is known.

Stdout: JSON summary. Stderr: diagnostics. Exit 0 success, 2 input error.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_keeps_file, write_keeps_file  # noqa: E402

VALID_IN = ("tight", "natural")
VALID_OUT = ("surgical", "soft", "section")
VALID_JOIN = ("repair", "continuation", "sentence", "section")


def suggested_out(gap: float, g_surg: float, g_soft: float) -> str:
    if gap < g_surg:
        return "surgical"
    if gap < g_soft:
        return "soft"
    return "section"


def classify(
    keeps: list[dict], g_surg: float, g_soft: float, *, force: bool = False
) -> list[dict]:
    """Fill missing edge classes while retaining source-gap suggestions for audit."""
    out: list[dict] = []
    for i, keep in enumerate(keeps):
        item = dict(keep)
        if i + 1 < len(keeps):
            gap = float(keeps[i + 1]["start"]) - float(keep["end"])
            suggestion = suggested_out(gap, g_surg, g_soft)
            item["_source_gap_s"] = round(gap, 3)
            item["_gap_to_next"] = round(gap, 3)  # legacy audit key
            item["_suggested_out"] = suggestion
        else:
            suggestion = "section"

        if force or item.get("out") not in VALID_OUT:
            item["out"] = suggestion
        # ``join`` is editorial intent. Never infer or overwrite it from source gap.
        out.append(item)

    # Derive incoming tightness from the FINAL preceding out class. Preserve an
    # explicit incoming review unless --force requests legacy full reclassification.
    for i, item in enumerate(out):
        if i == 0:
            if force or item.get("in") not in VALID_IN:
                item["in"] = "natural"
            continue
        if force or item.get("in") not in VALID_IN:
            item["in"] = "tight" if out[i - 1].get("out") == "surgical" else "natural"
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
        help="Legacy mode: overwrite explicit in/out tags (not recommended after authoring)",
    )
    args = ap.parse_args()

    if args.surgical_gap < 0 or args.soft_gap <= args.surgical_gap:
        print("error: require 0 <= surgical-gap < soft-gap", file=sys.stderr)
        return 2
    try:
        meta, keeps = load_keeps_file(args.keeps)
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    classified = classify(keeps, args.surgical_gap, args.soft_gap, force=args.force)
    counts = {name: 0 for name in VALID_OUT}
    for keep in classified:
        name = str(keep.get("out", "soft"))
        counts[name] = counts.get(name, 0) + 1

    if args.output:
        write_keeps_file(args.output, meta, classified)

    summary = {
        "input": str(args.keeps),
        "output": str(args.output) if args.output else None,
        "forced": args.force,
        "source_gap_is_advisory": True,
        "counts": counts,
        "keeps": [
            {
                "start": keep["start"],
                "end": keep["end"],
                "join": keep.get("join"),
                "in": keep.get("in"),
                "out": keep.get("out"),
                "source_gap_s": keep.get("_source_gap_s"),
                "suggested_out": keep.get("_suggested_out"),
                "note": keep.get("note", ""),
            }
            for keep in classified
        ],
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"classified {len(classified)} keeps: {counts}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
