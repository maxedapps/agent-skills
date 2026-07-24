#!/usr/bin/env python3
"""Shared helpers for edit-tutorial-take scripts."""

from __future__ import annotations

import json
import math
import struct
import subprocess
import wave
from pathlib import Path


def run(cmd: list[str], check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


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


def load_keeps_file(path: Path) -> tuple[dict | list, list[dict]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        keeps = data
        meta: dict | list = {"keeps": keeps}
    else:
        keeps = data.get("keeps") or data.get("segments")
        if not keeps:
            raise ValueError("keep-list has no keeps/segments")
        meta = data
    out: list[dict] = []
    for k in keeps:
        s = float(k["start"])
        e = float(k["end"])
        if e <= s:
            raise ValueError(f"bad keep range {s}-{e}")
        item = dict(k)
        item["start"] = s
        item["end"] = e
        out.append(item)
    out.sort(key=lambda x: x["start"])
    for a, b in zip(out, out[1:]):
        if b["start"] < a["end"] - 1e-6:
            raise ValueError(f"overlapping keeps: {a['start']}-{a['end']} vs {b['start']}-{b['end']}")
    return meta, out


def write_keeps_file(path: Path, meta: dict | list, keeps: list[dict]) -> None:
    if isinstance(meta, list):
        payload: dict | list = keeps
    else:
        payload = dict(meta)
        payload["keeps"] = keeps
        payload.pop("segments", None)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def read_wav_mono(path: Path, max_s: float | None = None) -> tuple[int, list[int]]:
    with wave.open(str(path), "rb") as wf:
        if wf.getsampwidth() != 2:
            raise ValueError("only 16-bit PCM WAV supported")
        sr = wf.getframerate()
        ch = wf.getnchannels()
        n = wf.getnframes()
        if max_s is not None:
            n = min(n, int(max_s * sr))
        raw = wf.readframes(n)
    samples = list(struct.unpack("<" + "h" * (len(raw) // 2), raw))
    if ch > 1:
        mono = []
        for i in range(0, len(samples), ch):
            mono.append(int(sum(samples[i : i + ch]) / ch))
        samples = mono
    return sr, samples


def envelope(samples: list[int], hop: int = 64) -> tuple[list[float], float]:
    """Return mean-abs envelope and envelope sample rate (input assumed 16k if hop=64 -> 250Hz)."""
    out: list[float] = []
    for i in range(0, len(samples) - hop, hop):
        chunk = samples[i : i + hop]
        out.append(sum(abs(x) for x in chunk) / len(chunk))
    return out, 16000.0 / hop


def normalize(xs: list[float]) -> list[float]:
    if not xs:
        return xs
    m = sum(xs) / len(xs)
    c = [x - m for x in xs]
    v = math.sqrt(sum(x * x for x in c) / len(c)) + 1e-9
    return [x / v for x in c]


def db_series(samples: list[int], sr: int, win_s: float = 0.02) -> list[tuple[float, float]]:
    hop = max(1, int(win_s * sr))
    out: list[tuple[float, float]] = []
    for i in range(0, len(samples) - hop + 1, hop):
        chunk = samples[i : i + hop]
        acc = sum(x * x for x in chunk) / len(chunk)
        db = 20 * math.log10(math.sqrt(acc) / 32768.0 + 1e-12)
        out.append((i / sr, db))
    return out


def extract_wav_from_media(media: Path, wav: Path, ar: int = 16000) -> None:
    wav.parent.mkdir(parents=True, exist_ok=True)
    p = run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(media),
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            str(ar),
            "-ac",
            "1",
            str(wav),
        ]
    )
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-2000:])


# Pad policy seconds by edge class
PAD_IN = {"tight": 0.02, "natural": 0.05}
PAD_OUT = {"surgical": 0.02, "soft": 0.06, "section": 0.18}
