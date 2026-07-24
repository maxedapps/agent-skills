#!/usr/bin/env python3
"""Propose/apply conservative energy-based cleanup at actual keep-list cuts.

The tool can snap tight attacks and remove a short late energy run after desired
speech plus quiet at an outgoing cut. Energy is not breath/prep recognition:
ambiguous long late endpoints are reported unresolved and every changed seam must
be listened to on assembled/rendered audio. Internal pauses are never deleted.

Stdout: JSON summary. Stderr: diagnostics. Exit 0 success, 2 input error.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import db_series, load_keeps_file, read_wav_mono, write_keeps_file  # noqa: E402


def load_region_db(
    samples: list[int], sr: int, t0: float, t1: float, win: float = 0.02
) -> list[tuple[float, float]]:
    a = max(0, int(t0 * sr))
    b = min(len(samples), int(t1 * sr))
    series = db_series(samples[a:b], sr, win_s=win)
    return [(a / sr + t, db) for t, db in series]


def speech_runs(
    series: list[tuple[float, float]], thr: float, min_run: int = 2, win: float = 0.02
) -> list[tuple[float, float]]:
    runs: list[tuple[float, float]] = []
    start: float | None = None
    count = 0
    last_t = 0.0
    for timestamp, db in series:
        if db >= thr:
            if start is None:
                start = timestamp
                count = 0
            count += 1
            last_t = timestamp
        elif start is not None:
            if count >= min_run:
                runs.append((start, last_t + win))
            start = None
            count = 0
    if start is not None and count >= min_run:
        runs.append((start, last_t + win))
    return runs


def first_speech_time(
    series: list[tuple[float, float]], thr: float, min_run: int = 2
) -> float | None:
    runs = speech_runs(series, thr, min_run=min_run)
    return runs[0][0] if runs else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--keeps", type=Path, required=True)
    ap.add_argument("--wav", type=Path, required=True, help="16-bit PCM analysis WAV")
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--speech-db", type=float, default=-38.0, help="Energy threshold dBFS")
    ap.add_argument(
        "--tail-search", type=float, default=1.2,
        help="Seconds before an actual out-cut inspected for late energy",
    )
    ap.add_argument("--head-search", type=float, default=0.45)
    ap.add_argument("--release", type=float, default=0.04)
    ap.add_argument("--pre-attack", type=float, default=0.02)
    ap.add_argument(
        "--prep-gap", type=float, default=0.12,
        help="Minimum quiet gap before a possible cut-adjacent prep run",
    )
    ap.add_argument(
        "--max-auto-prep", type=float, default=0.32,
        help="Longest late energy run auto-trimmed; longer runs are unresolved",
    )
    ap.add_argument(
        "--endpoint-margin", type=float, default=0.18,
        help="Late energy must end this close to the authored cut",
    )
    args = ap.parse_args()

    if not args.wav.is_file():
        print(f"error: wav not found: {args.wav}", file=sys.stderr)
        return 2
    if min(
        args.tail_search, args.head_search, args.release, args.prep_gap,
        args.max_auto_prep, args.endpoint_margin,
    ) <= 0:
        print("error: search/release/gap values must be positive", file=sys.stderr)
        return 2
    try:
        meta, keeps = load_keeps_file(args.keeps)
        sr, samples = read_wav_mono(args.wav)
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    merge_gap = float(meta.get("merge_gap", 0.15)) if isinstance(meta, dict) else 0.15
    changes: list[dict] = []
    unresolved: list[dict] = []
    new_keeps: list[dict] = []

    for index, keep in enumerate(keeps):
        item = dict(keep)
        out_class = item.get("out") or "soft"
        in_class = item.get("in") or "natural"
        pause = item.get("pause") if isinstance(item.get("pause"), dict) else {}
        reviewed_retained_pause = bool(
            pause.get("intent") == "retained" and pause.get("accepted")
        )
        original_start = float(item["start"])
        original_end = float(item["end"])
        outgoing_cut = (
            index + 1 < len(keeps)
            and float(keeps[index + 1]["start"]) - original_end >= merge_gap
        )
        incoming_cut = (
            index > 0
            and original_start - float(keeps[index - 1]["end"]) >= merge_gap
        )

        if outgoing_cut:
            search_start = max(original_start, original_end - args.tail_search)
            series = load_region_db(samples, sr, search_start, original_end)
            runs = speech_runs(series, args.speech_db)
            handled_prep = False
            if len(runs) >= 2:
                previous, late = runs[-2], runs[-1]
                quiet_gap = late[0] - previous[1]
                late_duration = late[1] - late[0]
                endpoint_distance = max(0.0, original_end - late[1])
                if quiet_gap >= args.prep_gap and endpoint_distance <= args.endpoint_margin:
                    handled_prep = True
                    if late_duration <= args.max_auto_prep:
                        new_end = min(original_end, previous[1] + args.release)
                        if new_end < original_end - 0.01:
                            item["end"] = round(new_end, 3)
                            changes.append(
                                {
                                    "i": index,
                                    "field": "end",
                                    "from": original_end,
                                    "to": item["end"],
                                    "out": out_class,
                                    "reason": "cut_adjacent_late_energy_after_quiet",
                                    "late_energy_s": round(late_duration, 3),
                                    "requires_listening": True,
                                }
                            )
                    else:
                        unresolved.append(
                            {
                                "i": index,
                                "edge": "out",
                                "time": original_end,
                                "reason": "long_late_energy_after_quiet_ambiguous",
                                "late_energy_s": round(late_duration, 3),
                                "action": "set endpoint manually after listening",
                            }
                        )

            # A normal trailing quiet snap is safe only for tight/normal outgoing
            # classes. Section cadence is not compressed by default.
            if (
                not handled_prep
                and runs
                and out_class in ("surgical", "soft")
                and not reviewed_retained_pause
            ):
                last_end = runs[-1][1]
                new_end = min(original_end, last_end + args.release)
                if new_end < original_end - 0.01:
                    item["end"] = round(new_end, 3)
                    changes.append(
                        {
                            "i": index,
                            "field": "end",
                            "from": original_end,
                            "to": item["end"],
                            "out": out_class,
                            "reason": "trailing_quiet_at_cut",
                            "requires_listening": True,
                        }
                    )
            if not runs:
                unresolved.append(
                    {
                        "i": index,
                        "edge": "out",
                        "time": original_end,
                        "reason": "no_energy_run_near_authored_endpoint",
                        "action": "inspect endpoint manually",
                    }
                )

        if incoming_cut and in_class == "tight":
            search_end = min(float(item["end"]), original_start + args.head_search)
            series = load_region_db(samples, sr, max(0.0, original_start - 0.05), search_end)
            first = first_speech_time(series, args.speech_db)
            if first is not None:
                new_start = max(original_start, first - args.pre_attack)
                if new_start > original_start + 0.01:
                    item["start"] = round(new_start, 3)
                    changes.append(
                        {
                            "i": index,
                            "field": "start",
                            "from": original_start,
                            "to": item["start"],
                            "in": in_class,
                            "reason": "tight_attack_at_cut",
                            "requires_listening": True,
                        }
                    )
            else:
                unresolved.append(
                    {
                        "i": index,
                        "edge": "in",
                        "time": original_start,
                        "reason": "no_energy_attack_near_authored_endpoint",
                        "action": "inspect endpoint manually",
                    }
                )

        if float(item["end"]) <= float(item["start"]) + 0.05:
            item["start"], item["end"] = original_start, original_end
            unresolved.append(
                {
                    "i": index,
                    "reason": "unsafe_short_range_reverted",
                    "action": "set both endpoints manually",
                }
            )
        new_keeps.append(item)

    write_keeps_file(args.output, meta, new_keeps)
    summary = {
        "input": str(args.keeps),
        "output": str(args.output),
        "changes": changes,
        "change_count": len(changes),
        "unresolved": unresolved,
        "unresolved_count": len(unresolved),
        "manual_listening_required": bool(changes or unresolved),
        "claim": "energy candidates only; no automatic breath recognition",
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(
        f"tightened {len(changes)} edges; {len(unresolved)} unresolved -> {args.output}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
