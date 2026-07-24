#!/usr/bin/env python3
"""Tighten keep-list edges using audio energy to avoid dangling prep tails/heads.

For each keep:
- out=surgical|soft: pull end earlier if post-speech energy rises again (prep for deleted attempt)
- snap end to last speech decay within a search window
- in=tight: snap start to first speech attack

Requires analysis WAV (16-bit mono). Extract with analyze_audio.py if needed.

Stdout: JSON summary
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import db_series, load_keeps_file, read_wav_mono, write_keeps_file  # noqa: E402


def load_region_db(samples: list[int], sr: int, t0: float, t1: float, win: float = 0.02):
    a = max(0, int(t0 * sr))
    b = min(len(samples), int(t1 * sr))
    series = db_series(samples[a:b], sr, win_s=win)
    return [(t0 + t, db) for t, db in series]


def last_speech_time(series: list[tuple[float, float]], thr: float, min_run: int = 2) -> float | None:
    """Last time where speech-like energy ends (decay)."""
    last = None
    run = 0
    last_end = None
    for t, db in series:
        if db >= thr:
            run += 1
            if run >= min_run:
                last = t
        else:
            if last is not None:
                last_end = last
            run = 0
            last = None
    if last is not None:
        last_end = last
    return last_end


def first_speech_time(series: list[tuple[float, float]], thr: float, min_run: int = 2) -> float | None:
    run = 0
    for t, db in series:
        if db >= thr:
            run += 1
            if run >= min_run:
                return t
        else:
            run = 0
    return None


def rising_after(series: list[tuple[float, float]], after_t: float, thr: float) -> bool:
    seen_low = False
    for t, db in series:
        if t < after_t:
            continue
        if db < thr - 3:
            seen_low = True
        elif seen_low and db >= thr:
            return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--keeps", type=Path, required=True)
    ap.add_argument("--wav", type=Path, required=True, help="16-bit mono analysis wav")
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--speech-db", type=float, default=-38.0, help="Speech threshold dBFS-ish")
    ap.add_argument(
        "--tail-search",
        type=float,
        default=0.55,
        help="Seconds before keep end to search for last speech",
    )
    ap.add_argument(
        "--head-search",
        type=float,
        default=0.45,
        help="Seconds after keep start to search for first speech",
    )
    ap.add_argument(
        "--release",
        type=float,
        default=0.04,
        help="Keep this many seconds after last speech for natural decay",
    )
    ap.add_argument(
        "--pre-attack",
        type=float,
        default=0.02,
        help="Keep this many seconds before first speech attack",
    )
    args = ap.parse_args()

    if not args.wav.is_file():
        print(f"error: wav not found: {args.wav}", file=sys.stderr)
        return 2
    try:
        meta, keeps = load_keeps_file(args.keeps)
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    sr, samples = read_wav_mono(args.wav)
    changes = []
    new_keeps: list[dict] = []

    for i, k in enumerate(keeps):
        item = dict(k)
        out_cls = item.get("out") or "soft"
        in_cls = item.get("in") or "natural"
        s0, e0 = float(item["start"]), float(item["end"])

        # tighten out
        if out_cls in ("surgical", "soft"):
            search_a = max(s0, e0 - args.tail_search)
            series = load_region_db(samples, sr, search_a, e0 + 0.05)
            last = last_speech_time(series, args.speech_db)
            if last is not None:
                # if energy rises again after last speech before end, definitely trim
                new_end = min(e0, last + args.release)
                # also if there's rising energy in final 250ms after a quiet gap, trim harder
                if rising_after(series, last + 0.05, args.speech_db):
                    new_end = min(new_end, last + max(0.02, args.release * 0.5))
                if out_cls == "surgical":
                    new_end = min(new_end, last + max(0.02, args.release * 0.75))
                if new_end < e0 - 0.01:
                    changes.append(
                        {
                            "i": i,
                            "field": "end",
                            "from": e0,
                            "to": round(new_end, 3),
                            "out": out_cls,
                        }
                    )
                    item["end"] = round(new_end, 3)

        # tighten in
        if in_cls == "tight":
            search_b = min(item["end"], s0 + args.head_search)
            series = load_region_db(samples, sr, max(0.0, s0 - 0.05), search_b)
            first = first_speech_time(series, args.speech_db)
            if first is not None:
                new_start = max(s0, first - args.pre_attack)
                # don't move start later past old start by more than head_search
                if new_start > s0 + 0.01:
                    changes.append(
                        {
                            "i": i,
                            "field": "start",
                            "from": s0,
                            "to": round(new_start, 3),
                            "in": in_cls,
                        }
                    )
                    item["start"] = round(new_start, 3)

        if item["end"] <= item["start"] + 0.05:
            # revert unsafe
            item["start"], item["end"] = s0, e0
        new_keeps.append(item)

    # ensure still non-overlapping after moves
    for a, b in zip(new_keeps, new_keeps[1:]):
        if b["start"] < a["end"]:
            mid = (a["end"] + b["start"]) / 2
            a["end"] = round(mid - 0.01, 3)
            b["start"] = round(mid + 0.01, 3)

    write_keeps_file(
        args.output,
        meta if isinstance(meta, dict) else {"keeps": new_keeps},
        new_keeps,
    )
    summary = {
        "input": str(args.keeps),
        "output": str(args.output),
        "changes": changes,
        "change_count": len(changes),
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"tightened {len(changes)} edges -> {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
