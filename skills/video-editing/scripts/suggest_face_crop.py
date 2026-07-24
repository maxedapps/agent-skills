#!/usr/bin/env python3
"""Suggest a fixed face-cam crop from multiple sampled frames.

Stdlib + ffmpeg only:
- sample N frames across a time range
- estimate person bbox via loose skin-color + center prior on downscaled RGB
- take percentile envelope (not absolute max), add modest hand pad
- write crop_suggest.json + cropped preview (+ contact sheet when possible)

Stdout: JSON
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import probe_duration, run  # noqa: E402


def probe_size(video: Path) -> tuple[int, int]:
    p = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            str(video),
        ]
    )
    if p.returncode != 0:
        raise RuntimeError("could not probe video size")
    data = json.loads(p.stdout)
    st = data["streams"][0]
    return int(st["width"]), int(st["height"])


def frame_raw(video: Path, t: float, width: int, raw_path: Path) -> tuple[int, int]:
    p = run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{t:.3f}",
            "-i",
            str(video),
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-2,format=rgb24",
            "-f",
            "rawvideo",
            str(raw_path),
        ]
    )
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-1200:])
    size = raw_path.stat().st_size
    if size % (width * 3) != 0:
        raise RuntimeError(f"bad raw size {size}")
    h = size // (width * 3)
    return width, h


def is_skin(r: int, g: int, b: int) -> bool:
    # stricter to avoid beige walls / warm wood
    return (
        r > 105
        and g > 45
        and b > 30
        and r > g + 12
        and r > b + 12
        and (r - g) > 15
        and max(r, g, b) - min(r, g, b) > 25
        and b < 180
        and g < 200
    )


def bbox_from_raw(raw_path: Path, w: int, h: int) -> tuple[int, int, int, int] | None:
    """Estimate person crop from face-center in the upper frame.

    Uses only upper-central skin to find the head, then builds a fixed-ratio
    upper-body box around that center (avoids arm/gesture width explosion).
    """
    data = raw_path.read_bytes()
    xs: list[int] = []
    ys: list[int] = []
    # face band only
    x_lo, x_hi = int(0.25 * w), int(0.75 * w)
    y_lo, y_hi = int(0.04 * h), int(0.48 * h)
    for y in range(y_lo, y_hi, 2):
        row = y * w * 3
        for x in range(x_lo, x_hi, 2):
            i = row + x * 3
            r, g, b = data[i], data[i + 1], data[i + 2]
            if is_skin(r, g, b):
                xs.append(x)
                ys.append(y)
    if len(xs) < 35:
        return None
    xs.sort()
    ys.sort()

    def pct(arr: list[int], p: float) -> int:
        return arr[min(len(arr) - 1, max(0, int(p * (len(arr) - 1))))]

    fx0, fx1 = pct(xs, 0.15), pct(xs, 0.85)
    fy0, fy1 = pct(ys, 0.08), pct(ys, 0.85)
    face_w = max(1, fx1 - fx0)
    face_h = max(1, fy1 - fy0)
    # discard pathological full-width "faces"
    if face_w > 0.45 * w:
        # fall back to densest central third column
        cx = w // 2
        face_w = int(0.22 * w)
        fx0, fx1 = cx - face_w // 2, cx + face_w // 2
    cx = (fx0 + fx1) / 2.0
    # target crop ~ face width * 2.4 (shoulders + modest hands), height ~ 0.82 frame
    box_w = int(min(0.55 * w, max(2.4 * face_w, 0.38 * w)))
    box_h = int(0.82 * h)
    y0 = max(0, fy0 - int(0.35 * face_h))
    y1 = min(h - 1, y0 + box_h)
    y0 = max(0, y1 - box_h)
    x0 = max(0, int(cx - box_w / 2))
    x1 = min(w - 1, x0 + box_w)
    x0 = max(0, x1 - box_w)
    return x0, y0, x1, y1


def percentile(vals: list[float], p: float) -> float:
    s = sorted(vals)
    return s[min(len(s) - 1, max(0, int(p * (len(s) - 1))))]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--video", type=Path, required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--start", type=float, default=None)
    ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--samples", type=int, default=12)
    ap.add_argument("--hand-pad", type=float, default=0.05, help="Extra L/R pad fraction of width")
    args = ap.parse_args()

    if not args.video.is_file():
        print(f"error: video not found: {args.video}", file=sys.stderr)
        return 2

    dur = probe_duration(args.video) or 0.0
    if dur <= 1:
        print("error: could not probe duration", file=sys.stderr)
        return 2
    try:
        sw, sh = probe_size(args.video)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    t0 = args.start if args.start is not None else dur * 0.12
    t1 = args.end if args.end is not None else dur * 0.88
    if t1 <= t0:
        print("error: bad range", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    times = [t0 + (t1 - t0) * i / max(1, args.samples - 1) for i in range(args.samples)]
    boxes: list[tuple[float, float, float, float]] = []
    jpgs: list[Path] = []

    with tempfile.TemporaryDirectory(prefix="face-crop-") as td:
        td_path = Path(td)
        for i, t in enumerate(times):
            raw = td_path / f"{i}.rgb"
            jpg = args.out_dir / f"sample_{i:02d}_{t:.0f}s.jpg"
            try:
                w, h = frame_raw(args.video, t, 480, raw)
                run(
                    [
                        "ffmpeg",
                        "-y",
                        "-f",
                        "rawvideo",
                        "-pix_fmt",
                        "rgb24",
                        "-s",
                        f"{w}x{h}",
                        "-i",
                        str(raw),
                        "-frames:v",
                        "1",
                        "-update",
                        "1",
                        str(jpg),
                    ]
                )
                box = bbox_from_raw(raw, w, h)
            except Exception as exc:  # noqa: BLE001
                print(f"warn: t={t:.1f}s failed: {exc}", file=sys.stderr)
                continue
            jpgs.append(jpg)
            if not box:
                print(f"warn: no bbox t={t:.1f}s", file=sys.stderr)
                continue
            x0, y0, x1, y1 = box
            boxes.append((x0 / w * sw, y0 / h * sh, x1 / w * sw, y1 / h * sh))
            print(
                f"t={t:.1f}s src_bbox=({boxes[-1][0]:.0f},{boxes[-1][1]:.0f})-({boxes[-1][2]:.0f},{boxes[-1][3]:.0f})",
                file=sys.stderr,
            )

    fallback = False
    if len(boxes) < max(3, args.samples // 3):
        fallback = True
        cw = int(sw * 0.52)
        ch = int(sh * 0.82)
        cx = (sw - cw) // 2
        cy = int(sh * 0.02)
        crop = {"w": cw, "h": ch, "x": cx, "y": cy}
        print("warn: using centered fallback crop", file=sys.stderr)
    else:
        # median-ish center + percentile size (avoid one wide-gesture outlier)
        centers_x = [(b[0] + b[2]) / 2 for b in boxes]
        tops = [b[1] for b in boxes]
        widths = [b[2] - b[0] for b in boxes]
        heights = [b[3] - b[1] for b in boxes]
        cx = percentile(centers_x, 0.5)
        y0 = percentile(tops, 0.25)
        cw = percentile(widths, 0.60)  # not max width
        ch = percentile(heights, 0.70)
        # clamps: person-dominant PiP crop (avoid empty side space)
        cw = min(max(cw, 0.36 * sw), 0.52 * sw)
        ch = min(max(ch, 0.74 * sh), 0.88 * sh)
        pad = args.hand_pad * cw
        cw = min(sw, cw + 2 * pad)
        x0 = cx - cw / 2
        y0 = max(0.0, y0 - 0.01 * sh)
        cx_i = int(max(0, min(sw - int(cw), round(x0))))
        cy_i = int(max(0, min(sh - int(ch), round(y0))))
        cw_i = int(cw) - int(cw) % 2
        ch_i = int(ch) - int(ch) % 2
        cw_i = min(cw_i, sw - cx_i)
        ch_i = min(ch_i, sh - cy_i)
        crop = {"w": cw_i, "h": ch_i, "x": cx_i, "y": cy_i}

    ffmpeg_crop = f"{crop['w']}:{crop['h']}:{crop['x']}:{crop['y']}"
    preview = args.out_dir / "crop_preview.jpg"
    mid = times[len(times) // 2]
    run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{mid:.3f}",
            "-i",
            str(args.video),
            "-frames:v",
            "1",
            "-vf",
            f"crop={ffmpeg_crop},scale=720:-1",
            "-update",
            "1",
            str(preview),
        ]
    )

    sheet = args.out_dir / "crop_contact_sheet.jpg"
    if jpgs:
        n = min(6, len(jpgs))
        inputs: list[str] = []
        parts: list[str] = []
        for i in range(n):
            inputs.extend(["-i", str(jpgs[i])])
            parts.append(f"[{i}:v]scale=320:-1[s{i}]")
        parts.append("".join(f"[s{i}]" for i in range(n)) + f"tile={min(3,n)}x{(n+2)//3}[v]")
        run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(parts), "-map", "[v]", "-update", "1", str(sheet)])

    payload = {
        "video": str(args.video),
        "source_size": {"w": sw, "h": sh},
        "samples": args.samples,
        "bbox_success": len(boxes),
        "fallback": fallback,
        "crop": crop,
        "ffmpeg_crop": ffmpeg_crop,
        "preview": str(preview),
        "contact_sheet": str(sheet) if sheet.exists() else None,
        "guidance": [
            "Person should dominate the frame.",
            "Modest hand room only; occasional fingertip clipping is OK.",
            "Persistent empty space on one side is NOT OK — tighten/recenter.",
            "Confirm crop_preview.jpg before full face render.",
        ],
    }
    (args.out_dir / "crop_suggest.json").write_text(json.dumps(payload, indent=2) + "\n")
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"crop={ffmpeg_crop} preview={preview}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
