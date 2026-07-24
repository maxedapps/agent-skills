#!/usr/bin/env python3
"""Extract analysis WAV and/or report silence / early activity.

Stdout: JSON summary (or silence lines with --silence-text)
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=False, text=True, capture_output=True)


def extract_wav(video: Path, wav: Path, ar: int = 16000) -> None:
    wav.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        str(ar),
        "-ac",
        "1",
        str(wav),
    ]
    p = run(cmd)
    if p.returncode != 0:
        print(p.stderr[-2000:], file=sys.stderr)
        raise SystemExit(f"ffmpeg extract failed ({p.returncode})")


def silence_detect(wav: Path, noise_db: float, duration: float, max_s: float | None) -> list[dict]:
    cmd = ["ffmpeg", "-i", str(wav)]
    if max_s is not None:
        cmd += ["-t", str(max_s)]
    cmd += [
        "-af",
        f"silencedetect=noise={noise_db}dB:d={duration}",
        "-f",
        "null",
        "-",
    ]
    p = run(cmd)
    text = p.stderr
    events: list[dict] = []
    cur: dict | None = None
    for line in text.splitlines():
        m = re.search(r"silence_start:\s*([0-9.]+)", line)
        if m:
            cur = {"start": float(m.group(1))}
            continue
        m = re.search(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)", line)
        if m and cur is not None:
            cur["end"] = float(m.group(1))
            cur["duration"] = float(m.group(2))
            events.append(cur)
            cur = None
    return events


def probe_duration(path: Path) -> float | None:
    p = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ]
    )
    if p.returncode != 0:
        return None
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--video", type=Path, help="Source video (for extract)")
    ap.add_argument("--wav", type=Path, help="Existing or target wav path")
    ap.add_argument(
        "--extract",
        action="store_true",
        help="Extract mono 16k WAV from --video to --wav",
    )
    ap.add_argument("--noise-db", type=float, default=-35.0)
    ap.add_argument("--silence-d", type=float, default=0.3, help="Min silence duration")
    ap.add_argument(
        "--max-s",
        type=float,
        default=None,
        help="Only analyze first N seconds (silence)",
    )
    ap.add_argument(
        "--silence-text",
        action="store_true",
        help="Print silence events as text instead of JSON",
    )
    args = ap.parse_args()

    wav = args.wav
    if args.extract:
        if not args.video or not wav:
            print("error: --extract requires --video and --wav", file=sys.stderr)
            return 2
        if not args.video.is_file():
            print(f"error: video not found: {args.video}", file=sys.stderr)
            return 2
        print(f"extracting wav -> {wav}", file=sys.stderr)
        extract_wav(args.video, wav)

    if wav is None or not wav.is_file():
        print("error: wav missing; pass --wav and optionally --extract", file=sys.stderr)
        return 2

    events = silence_detect(wav, args.noise_db, args.silence_d, args.max_s)
    # first non-silence estimate
    first_sound = 0.0
    if events and events[0].get("start", 1) <= 0.05:
        first_sound = events[0].get("end", 0.0)

    summary = {
        "wav": str(wav),
        "duration_s": probe_duration(wav),
        "silence_events": events,
        "estimated_first_sound_s": first_sound,
        "noise_db": args.noise_db,
        "silence_d": args.silence_d,
        "max_s": args.max_s,
    }

    if args.silence_text:
        print(f"estimated_first_sound_s={first_sound:.3f}")
        for e in events:
            if "end" in e:
                print(
                    f"silence {e['start']:.3f}-{e['end']:.3f} dur={e['duration']:.3f}"
                )
            else:
                print(f"silence_start {e['start']:.3f}")
    else:
        json.dump(summary, sys.stdout, indent=2)
        sys.stdout.write("\n")

    print(f"silence_events={len(events)} first_sound~{first_sound:.3f}s", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
