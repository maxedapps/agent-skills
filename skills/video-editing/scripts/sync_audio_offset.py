#!/usr/bin/env python3
"""Estimate face_time = screen_time + offset via audio envelope correlation.

Accepts video/audio paths. Extracts temp WAVs if needed.

Stdout: JSON {offset_s, score, verify_delta_s, ...}
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import envelope, extract_wav_from_media, normalize, read_wav_mono, run  # noqa: E402


def ensure_wav(path: Path, tmp: Path) -> Path:
    if path.suffix.lower() == ".wav":
        return path
    out = tmp / f"{path.stem}.wav"
    print(f"extracting wav: {path.name} -> {out.name}", file=sys.stderr)
    extract_wav_from_media(path, out)
    return out


def corr_best(ref_env: list[float], long_env: list[float], rate: float, guess_s: float | None = None, window_s: float = 8.0):
    L = len(ref_env)
    if len(long_env) < L + 2:
        raise ValueError("long media shorter than reference window")
    if guess_s is None:
        lo, hi, coarse = 0, len(long_env) - L, max(1, int(0.1 * rate))
    else:
        g = int(guess_s * rate)
        span = int(window_s * rate)
        lo, hi, coarse = max(0, g - span), min(len(long_env) - L, g + span), max(1, int(0.02 * rate))

    best = None
    for off in range(lo, hi + 1, coarse):
        s = 0.0
        fe = long_env[off : off + L]
        for a, b in zip(ref_env, fe):
            s += a * b
        if best is None or s > best[0]:
            best = (s, off)
    assert best is not None
    # fine
    flo = max(0, best[1] - coarse * 2)
    fhi = min(len(long_env) - L, best[1] + coarse * 2)
    best2 = None
    for off in range(flo, fhi + 1):
        s = 0.0
        fe = long_env[off : off + L]
        for a, b in zip(ref_env, fe):
            s += a * b
        if best2 is None or s > best2[0]:
            best2 = (s, off)
    assert best2 is not None
    return best2[1] / rate, best2[0]


def slice_env(env: list[float], rate: float, start_s: float, dur_s: float) -> list[float]:
    a = int(start_s * rate)
    b = int((start_s + dur_s) * rate)
    return env[a:b]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--screen", type=Path, required=True, help="Screen/main media or wav")
    ap.add_argument("--face", type=Path, required=True, help="Face media or wav")
    ap.add_argument("--ref-start", type=float, default=None, help="Screen ref window start (auto if omitted)")
    ap.add_argument("--ref-dur", type=float, default=90.0, help="Reference window duration")
    ap.add_argument("--verify-start", type=float, default=None, help="Second screen window start")
    args = ap.parse_args()

    if not args.screen.is_file() or not args.face.is_file():
        print("error: media not found", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="sync-offset-") as td:
        tmp = Path(td)
        sw = ensure_wav(args.screen, tmp)
        fw = ensure_wav(args.face, tmp)
        sr_s, screen = read_wav_mono(sw)
        sr_f, face = read_wav_mono(fw)
        if sr_s != sr_f:
            print("error: sample rates differ after extract", file=sys.stderr)
            return 2

        env_s, rate = envelope(screen)
        env_f, _ = envelope(face)
        env_s = normalize(env_s)
        env_f = normalize(env_f)

        # auto pick a lively ref window on screen if not provided
        ref_start = args.ref_start
        if ref_start is None:
            win = int(args.ref_dur * rate)
            best_e = None
            step = max(1, int(5 * rate))
            for i in range(0, max(1, len(env_s) - win), step):
                e = sum(abs(x) for x in env_s[i : i + win])
                if best_e is None or e > best_e[0]:
                    best_e = (e, i / rate)
            ref_start = float(best_e[1]) if best_e else 0.0
            print(f"auto ref-start={ref_start:.2f}s", file=sys.stderr)

        ref = slice_env(env_s, rate, ref_start, args.ref_dur)
        if len(ref) < int(10 * rate):
            print("error: reference window too short/empty", file=sys.stderr)
            return 2
        ref = normalize(ref)

        match_in_face, score = corr_best(ref, env_f, rate)
        offset = match_in_face - ref_start

        verify_delta = None
        verify_start = args.verify_start
        if verify_start is None:
            # second window ~ half duration later if possible
            screen_dur = len(env_s) / rate
            cand = ref_start + max(120.0, args.ref_dur + 30.0)
            if cand + args.ref_dur < screen_dur - 5:
                verify_start = cand
        if verify_start is not None:
            ref2 = normalize(slice_env(env_s, rate, verify_start, min(args.ref_dur, 60.0)))
            m2, s2 = corr_best(ref2, env_f, rate, guess_s=verify_start + offset, window_s=6.0)
            offset2 = m2 - verify_start
            verify_delta = offset2 - offset
            print(
                f"verify start={verify_start:.2f} offset2={offset2:.3f} delta={verify_delta:.3f} score={s2:.1f}",
                file=sys.stderr,
            )

        payload = {
            "offset_s": round(offset, 3),
            "formula": "face_time = screen_time + offset_s",
            "score": score,
            "ref_start_s": round(ref_start, 3),
            "ref_dur_s": args.ref_dur,
            "match_in_face_s": round(match_in_face, 3),
            "verify_start_s": verify_start,
            "verify_delta_s": None if verify_delta is None else round(verify_delta, 3),
            "ok": verify_delta is None or abs(verify_delta) < 0.05,
        }
        json.dump(payload, sys.stdout, indent=2)
        sys.stdout.write("\n")
        print(
            f"offset={offset:.3f}s score={score:.1f} verify_delta={verify_delta}",
            file=sys.stderr,
        )
        return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
