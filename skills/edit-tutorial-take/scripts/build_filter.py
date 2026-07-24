#!/usr/bin/env python3
"""Build ffmpeg filter_complex + edit plan from a keep-list JSON.

Also optionally rewrites captions onto the clean timeline via cut_srt logic.

Stdout: summary JSON
Stderr: diagnostics
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import PAD_IN, PAD_OUT  # noqa: E402
from cut_srt import cut_cues, load_keeps, write_srt  # noqa: E402
from parse_srt import parse_srt  # noqa: E402


def probe_duration(path: Path) -> float | None:
    p = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    if p.returncode != 0:
        return None
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def _pad_for_keep(k: dict, *, default_in: float, default_out: float) -> tuple[float, float]:
    """Resolve per-keep pads from in/out edge classes."""
    in_cls = k.get("in") or "natural"
    out_cls = k.get("out") or "soft"
    pin = PAD_IN.get(str(in_cls), default_in)
    pout = PAD_OUT.get(str(out_cls), default_out)
    # explicit numeric overrides win if present
    if k.get("pad_in") is not None:
        pin = float(k["pad_in"])
    if k.get("pad_out") is not None:
        pout = float(k["pad_out"])
    return pin, pout


def finalize_ranges(
    keeps: list[dict],
    *,
    pad_in: float,
    pad_out: float,
    merge_gap: float,
    src_dur: float,
) -> list[dict]:
    # merge tiny gaps first on raw keeps (preserve stricter edge tags)
    merged: list[dict] = []
    for k in keeps:
        if merged and k["start"] - merged[-1]["end"] < merge_gap:
            prev = merged[-1]
            prev["end"] = k["end"]
            note = prev.get("note") or ""
            extra = k.get("note") or ""
            if extra:
                prev["note"] = (note + " | " + extra).strip(" |")
            # keep the more surgical out / tighter in when merging
            rank_out = {"surgical": 0, "soft": 1, "section": 2}
            if rank_out.get(str(k.get("out")), 9) < rank_out.get(str(prev.get("out")), 9):
                prev["out"] = k.get("out")
            if k.get("in") == "tight":
                prev["in"] = "tight"
        else:
            merged.append(dict(k))

    final: list[dict] = []
    for i, k in enumerate(merged):
        pin, pout = _pad_for_keep(k, default_in=pad_in, default_out=pad_out)
        s = max(0.0, float(k["start"]) - pin)
        e = min(src_dur, float(k["end"]) + pout)
        if final:
            s = max(s, final[-1]["end"] + 0.001)
        if i + 1 < len(merged):
            # never eat into the next keep; leave a hairline gap for surgical joins
            nxt_pin, _ = _pad_for_keep(merged[i + 1], default_in=pad_in, default_out=pad_out)
            limit = float(merged[i + 1]["start"]) - nxt_pin - 0.01
            e = min(e, limit)
        if e <= s:
            s, e = float(k["start"]), float(k["end"])
        final.append(
            {
                "start": round(s, 3),
                "end": round(e, 3),
                "dur": round(e - s, 3),
                "note": k.get("note", ""),
                "in": k.get("in"),
                "out": k.get("out"),
                "pad_in_applied": round(pin, 3),
                "pad_out_applied": round(pout, 3),
            }
        )
    return final


def write_filter(ranges: list[dict], path: Path) -> None:
    parts: list[str] = []
    for i, r in enumerate(ranges):
        s, e = r["start"], r["end"]
        parts.append(
            f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS,format=yuv420p[v{i}]"
        )
        parts.append(
            f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
            f"aresample=async=1:first_pts=0[a{i}]"
        )
    n = len(ranges)
    concat = "".join(f"[v{i}][a{i}]" for i in range(n))
    parts.append(f"{concat}concat=n={n}:v=1:a=1[outv][outa]")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(";\n".join(parts) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--video", type=Path, required=True, help="Source video")
    ap.add_argument("--keeps", type=Path, required=True, help="Keep-list JSON")
    ap.add_argument(
        "--out-dir",
        type=Path,
        required=True,
        help="Directory for filter.txt + edit-plan.json",
    )
    ap.add_argument("--pad-in", type=float, default=0.03, help="Fallback in-pad if keep has no in class")
    ap.add_argument(
        "--pad-out",
        type=float,
        default=0.05,
        help="Fallback out-pad if keep has no out class (prefer out tags)",
    )
    ap.add_argument("--merge-gap", type=float, default=0.15)
    ap.add_argument(
        "--source-duration",
        type=float,
        default=None,
        help="Override probed duration (seconds)",
    )
    ap.add_argument(
        "--srt",
        type=Path,
        default=None,
        help="Optional source SRT to rewrite onto clean timeline",
    )
    ap.add_argument(
        "--out-srt",
        type=Path,
        default=None,
        help="Optional output SRT path (default: out-dir/clean-preview.srt)",
    )
    ap.add_argument(
        "--out-txt",
        type=Path,
        default=None,
        help="Optional output TXT path (default: beside out-srt)",
    )
    ap.add_argument(
        "--output-video",
        type=Path,
        default=None,
        help="Optional planned output video path recorded in plan",
    )
    args = ap.parse_args()

    if not args.video.is_file():
        print(f"error: video not found: {args.video}", file=sys.stderr)
        return 2
    if not args.keeps.is_file():
        print(f"error: keeps not found: {args.keeps}", file=sys.stderr)
        return 2

    try:
        raw_keeps = load_keeps(args.keeps)
    except Exception as exc:  # noqa: BLE001
        print(f"error: bad keep-list: {exc}", file=sys.stderr)
        return 2

    # optional top-level pad overrides in keep file
    meta = json.loads(args.keeps.read_text(encoding="utf-8"))
    if isinstance(meta, dict):
        pad_in = float(meta.get("pad_in", args.pad_in))
        pad_out = float(meta.get("pad_out", args.pad_out))
        merge_gap = float(meta.get("merge_gap", args.merge_gap))
    else:
        pad_in, pad_out, merge_gap = args.pad_in, args.pad_out, args.merge_gap

    src_dur = args.source_duration or probe_duration(args.video)
    if src_dur is None:
        print("error: could not probe duration; pass --source-duration", file=sys.stderr)
        return 2

    ranges = finalize_ranges(
        raw_keeps,
        pad_in=pad_in,
        pad_out=pad_out,
        merge_gap=merge_gap,
        src_dur=src_dur,
    )
    if not ranges:
        print("error: no ranges", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    filter_path = args.out_dir / "filter.txt"
    plan_path = args.out_dir / "edit-plan.json"
    write_filter(ranges, filter_path)

    kept = sum(r["dur"] for r in ranges)
    out_video = args.output_video
    if out_video is None and isinstance(meta, dict) and meta.get("output"):
        out_video = Path(meta["output"])

    plan = {
        "source": str(args.video.resolve()),
        "output": str(out_video) if out_video else None,
        "source_duration_s": round(src_dur, 3),
        "kept_duration_s": round(kept, 3),
        "removed_duration_s": round(src_dur - kept, 3),
        "pad_in": pad_in,
        "pad_out": pad_out,
        "merge_gap": merge_gap,
        "segments": ranges,
        "filter": str(filter_path.resolve()),
    }
    plan_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")

    preview = None
    if args.srt:
        if not args.srt.is_file():
            print(f"error: srt not found: {args.srt}", file=sys.stderr)
            return 2
        cues = parse_srt(args.srt.read_text(encoding="utf-8", errors="replace"))
        # Use finalized ranges for caption preview (matches rendered media better)
        keep_for_caps = [{"start": r["start"], "end": r["end"], "note": r["note"]} for r in ranges]
        new_cues, texts = cut_cues(cues, keep_for_caps)
        out_srt = args.out_srt or (args.out_dir / "clean-preview.srt")
        out_txt = args.out_txt or out_srt.with_suffix(".txt")
        write_srt(new_cues, out_srt)
        plain = " ".join(texts)
        import re

        out_txt.write_text(re.sub(r"\s+", " ", plain).strip() + "\n", encoding="utf-8")
        preview = {"out_srt": str(out_srt), "out_txt": str(out_txt), "cues": len(new_cues)}

    summary = {
        "segments": len(ranges),
        "kept_duration_s": round(kept, 3),
        "removed_duration_s": round(src_dur - kept, 3),
        "filter": str(filter_path),
        "plan": str(plan_path),
        "caption_preview": preview,
    }
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(
        f"segments={len(ranges)} kept={kept:.1f}s removed={src_dur-kept:.1f}s -> {filter_path}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
