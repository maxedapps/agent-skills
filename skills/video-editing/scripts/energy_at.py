#!/usr/bin/env python3
"""Print local RMS energy envelope for refining cut points.

Input: 16-bit mono WAV (use extract_wav via analyze_audio / ffmpeg).
Stdout: lines of `time_s db_approx bar` (only above threshold by default)
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
import wave
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("wav", type=Path, help="16-bit PCM WAV (mono preferred)")
    ap.add_argument("--start", type=float, required=True, help="Region start seconds")
    ap.add_argument("--end", type=float, required=True, help="Region end seconds")
    ap.add_argument("--win", type=float, default=0.025, help="Window seconds (default 0.025)")
    ap.add_argument(
        "--min-db",
        type=float,
        default=-48.0,
        help="Only print windows at/above this dBFS-ish level (default -48)",
    )
    ap.add_argument(
        "--all",
        action="store_true",
        help="Print all windows including silence",
    )
    args = ap.parse_args()

    if args.end <= args.start:
        print("error: end must be > start", file=sys.stderr)
        return 2
    if not args.wav.is_file():
        print(f"error: wav not found: {args.wav}", file=sys.stderr)
        return 2

    with wave.open(str(args.wav), "rb") as wf:
        if wf.getsampwidth() != 2:
            print("error: only 16-bit PCM WAV supported", file=sys.stderr)
            return 2
        sr = wf.getframerate()
        ch = wf.getnchannels()
        nframes = wf.getnframes()
        dur = nframes / sr
        t0 = max(0.0, args.start)
        t1 = min(dur, args.end)
        if t1 <= t0:
            print("error: region outside file", file=sys.stderr)
            return 2
        wf.setpos(int(t0 * sr))
        n = int((t1 - t0) * sr)
        raw = wf.readframes(n)

    samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    if ch > 1:
        mono = []
        for i in range(0, len(samples), ch):
            mono.append(int(sum(samples[i : i + ch]) / ch))
        samples = mono

    hop = max(1, int(args.win * sr))
    printed = 0
    for i in range(0, len(samples) - hop + 1, hop):
        chunk = samples[i : i + hop]
        acc = sum(x * x for x in chunk) / len(chunk)
        # rough dBFS relative to full-scale int16
        db = 20 * math.log10(math.sqrt(acc) / 32768.0 + 1e-12)
        t = t0 + i / sr
        if args.all or db >= args.min_db:
            bar = "#" * max(0, int((db + 50) * 1.2))
            print(f"{t:8.2f} {db:6.1f} {bar}")
            printed += 1

    print(
        f"region={t0:.3f}-{t1:.3f}s sr={sr} win={args.win} printed={printed}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
