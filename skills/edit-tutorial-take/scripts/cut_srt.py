#!/usr/bin/env python3
"""Rewrite an SRT onto a new timeline using a keep-list (no re-transcription).

For each keep range [s,e] in source time:
  - include cue overlap with that range
  - clip cue start/end to the range
  - shift onto contiguous output timeline

Also writes plain TXT (cue texts joined).

Stdout: summary JSON
Stderr: diagnostics
Exit 0 success, 2 usage/input error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# allow running alongside parse_srt without install
sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_srt import parse_srt  # noqa: E402


def s_to_ts(t: float) -> str:
    if t < 0:
        t = 0.0
    ms_total = int(round(t * 1000.0))
    ms = ms_total % 1000
    sec_total = ms_total // 1000
    s = sec_total % 60
    m_total = sec_total // 60
    m = m_total % 60
    h = m_total // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def load_keeps(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        keeps = data
    else:
        keeps = data.get("keeps") or data.get("segments")
    if not keeps:
        raise ValueError("keep-list has no keeps/segments")
    out = []
    for k in keeps:
        s = float(k["start"])
        e = float(k["end"])
        if e <= s:
            raise ValueError(f"bad keep range {s}-{e}")
        item = dict(k)
        item["start"] = s
        item["end"] = e
        if "note" not in item:
            item["note"] = ""
        out.append(item)
    # sort + overlap check
    out.sort(key=lambda x: x["start"])
    for a, b in zip(out, out[1:]):
        if b["start"] < a["end"] - 1e-6:
            raise ValueError(f"overlapping keeps: {a} vs {b}")
    return out


def slice_text_for_overlap(
    text: str, cue_start: float, cue_end: float, keep_start: float, keep_end: float
) -> str:
    """Approximate text slice when only part of a cue is kept.

    Uses character-proportional mapping (same caveat as time_at.py).
    """
    dur = max(cue_end - cue_start, 1e-6)
    if keep_start <= cue_start and keep_end >= cue_end:
        return text
    frac0 = min(1.0, max(0.0, (keep_start - cue_start) / dur))
    frac1 = min(1.0, max(0.0, (keep_end - cue_start) / dur))
    i0 = int(round(frac0 * len(text)))
    i1 = int(round(frac1 * len(text)))
    if i1 <= i0:
        return ""
    # snap to nearby word boundaries when possible
    chunk = text[i0:i1]
    if i0 > 0 and i0 < len(text) and text[i0 - 1].isalnum() and chunk[:1].isalnum():
        sp = chunk.find(" ")
        if 0 <= sp < 12:
            chunk = chunk[sp + 1 :]
    if i1 < len(text) and chunk[-1:].isalnum() and text[i1 : i1 + 1].isalnum():
        sp = chunk.rfind(" ")
        if sp > 0 and len(chunk) - sp < 12:
            chunk = chunk[:sp]
    return chunk.strip(" ,;:-")


def cut_cues(cues: list[dict], keeps: list[dict]) -> tuple[list[dict], list[str]]:
    new_cues: list[dict] = []
    texts: list[str] = []
    cursor = 0.0
    idx = 1
    for keep in keeps:
        ks, ke = keep["start"], keep["end"]
        for c in cues:
            # overlap of [c.start,c.end] with [ks,ke]
            os_ = max(c["start"], ks)
            oe = min(c["end"], ke)
            if oe - os_ <= 0.02:
                continue
            # shift into output timeline
            ns = cursor + (os_ - ks)
            ne = cursor + (oe - ks)
            text = slice_text_for_overlap(c["text"], c["start"], c["end"], os_, oe)
            if not text:
                continue
            new_cues.append(
                {
                    "i": idx,
                    "start": round(ns, 3),
                    "end": round(ne, 3),
                    "text": text,
                    "source_start": round(os_, 3),
                    "source_end": round(oe, 3),
                    "note": keep.get("note", ""),
                }
            )
            texts.append(text)
            idx += 1
        cursor += ke - ks
    return new_cues, texts


def write_srt(cues: list[dict], path: Path) -> None:
    blocks = []
    for c in cues:
        blocks.append(
            f"{c['i']}\n{s_to_ts(c['start'])} --> {s_to_ts(c['end'])}\n{c['text']}\n"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(blocks) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--srt", type=Path, required=True, help="Source SRT")
    ap.add_argument("--keeps", type=Path, required=True, help="Keep-list JSON")
    ap.add_argument("--out-srt", type=Path, required=True, help="Output SRT path")
    ap.add_argument("--out-txt", type=Path, default=None, help="Optional plain text path")
    args = ap.parse_args()

    if not args.srt.is_file():
        print(f"error: srt not found: {args.srt}", file=sys.stderr)
        return 2
    if not args.keeps.is_file():
        print(f"error: keeps not found: {args.keeps}", file=sys.stderr)
        return 2

    try:
        keeps = load_keeps(args.keeps)
    except Exception as exc:  # noqa: BLE001
        print(f"error: bad keep-list: {exc}", file=sys.stderr)
        return 2

    cues = parse_srt(args.srt.read_text(encoding="utf-8", errors="replace"))
    if not cues:
        print("error: no source cues", file=sys.stderr)
        return 2

    new_cues, texts = cut_cues(cues, keeps)
    write_srt(new_cues, args.out_srt)

    txt_path = args.out_txt
    if txt_path is None:
        txt_path = args.out_srt.with_suffix(".txt")
    # de-dup immediate exact repeats from adjacent cue splits
    cleaned: list[str] = []
    for t in texts:
        if cleaned and cleaned[-1] == t:
            continue
        cleaned.append(t)
    plain = re.sub(r"\s+", " ", " ".join(cleaned)).strip() + "\n"
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    txt_path.write_text(plain, encoding="utf-8")

    kept = sum(k["end"] - k["start"] for k in keeps)
    summary = {
        "source_srt": str(args.srt),
        "keeps": len(keeps),
        "kept_duration_s": round(kept, 3),
        "output_cues": len(new_cues),
        "out_srt": str(args.out_srt),
        "out_txt": str(txt_path),
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(
        f"cut srt: {len(new_cues)} cues, kept={kept:.1f}s -> {args.out_srt}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
