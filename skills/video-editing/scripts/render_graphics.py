#!/usr/bin/env python3
"""Render reusable tutorial spotlights and lower thirds from a JSON job.

Stdout: one JSON result. Stderr: diagnostics. Exit 0 success, 2 usage/config,
3 dependency/render failure. Times are output-clip-relative; rectangles are
normalized top-left [x, y, width, height].
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:  # pragma: no cover - exercised by dependency failure only
    Image = ImageDraw = ImageFilter = ImageFont = None  # type: ignore[assignment]

HERE = Path(__file__).resolve().parent
PRESETS_PATH = HERE.parent / "assets" / "motion-presets.json"


def fail(message: str, code: int = 2) -> int:
    print(f"error: {message}", file=sys.stderr)
    return code


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True)


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def probe(path: Path) -> dict[str, Any]:
    p = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-show_entries", "stream=codec_type,width,height,r_frame_rate",
        "-of", "json", str(path),
    ])
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-1200:] or "ffprobe failed")
    data = json.loads(p.stdout)
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    if not video:
        raise ValueError("input has no video stream")
    num, den = str(video.get("r_frame_rate", "0/1")).split("/", 1)
    fps = float(num) / float(den)
    if fps <= 0:
        raise ValueError("could not determine FPS")
    return {
        "duration": float(data["format"]["duration"]),
        "width": int(video["width"]), "height": int(video["height"]), "fps": fps,
        "audio": any(s.get("codec_type") == "audio" for s in data.get("streams", [])),
    }


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def smooth(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def ease_out(value: float) -> float:
    value = clamp(value)
    return 1 - (1 - value) ** 3


def parse_color(value: str) -> tuple[int, int, int]:
    text = value.lstrip("#")
    if len(text) != 6:
        raise ValueError(f"invalid color {value!r}; expected #RRGGBB")
    try:
        return tuple(int(text[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
    except ValueError as exc:
        raise ValueError(f"invalid color {value!r}") from exc


def valid_rect(rect: Any) -> list[float]:
    if not isinstance(rect, list) or len(rect) != 4:
        raise ValueError("rect must be [x,y,width,height]")
    vals = [float(v) for v in rect]
    x, y, w, h = vals
    if min(vals) < 0 or w <= 0 or h <= 0 or x + w > 1.000001 or y + h > 1.000001:
        raise ValueError(f"normalized rect out of bounds: {rect}")
    return vals


def rect_at(target: dict[str, Any], time_s: float) -> list[float]:
    mode = target.get("mode", "rect")
    if mode == "rect":
        return valid_rect(target.get("rect"))
    if mode != "keyframes":
        raise ValueError(f"unsupported target mode: {mode}")
    frames = target.get("keyframes")
    if not isinstance(frames, list) or not frames:
        raise ValueError("keyframes target requires non-empty keyframes")
    points = sorted((float(k["time"]), valid_rect(k["rect"])) for k in frames)
    if time_s <= points[0][0]:
        return points[0][1]
    if time_s >= points[-1][0]:
        return points[-1][1]
    for (ta, ra), (tb, rb) in zip(points, points[1:]):
        if ta <= time_s <= tb:
            q = (time_s - ta) / (tb - ta)
            return [a + (b - a) * q for a, b in zip(ra, rb)]
    return points[-1][1]


def sample_arc(cx: float, cy: float, radius: float, a0: float, a1: float) -> list[tuple[float, float]]:
    return [
        (cx + radius * math.cos(math.radians(a0 + (a1 - a0) * i / 18)),
         cy + radius * math.sin(math.radians(a0 + (a1 - a0) * i / 18)))
        for i in range(1, 19)
    ]


def rounded_clockwise_path(box: tuple[float, float, float, float], radius: float) -> list[tuple[float, float]]:
    x0, y0, x1, y1 = box
    radius = max(0.0, min(radius, (x1 - x0) / 2, (y1 - y0) / 2))
    points = [(x0 + radius, y0), (x1 - radius, y0)]
    points += sample_arc(x1 - radius, y0 + radius, radius, -90, 0)
    points += [(x1, y1 - radius)]
    points += sample_arc(x1 - radius, y1 - radius, radius, 0, 90)
    points += [(x0 + radius, y1)]
    points += sample_arc(x0 + radius, y1 - radius, radius, 90, 180)
    points += [(x0, y0 + radius)]
    points += sample_arc(x0 + radius, y0 + radius, radius, 180, 270)
    return points


def partial_path(points: list[tuple[float, float]], progress: float) -> list[tuple[float, float]]:
    if progress <= 0:
        return []
    lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:])]
    target = sum(lengths) * clamp(progress)
    out = [points[0]]
    walked = 0.0
    for a, b, length in zip(points, points[1:], lengths):
        if walked + length <= target:
            out.append(b)
            walked += length
            continue
        if target > walked and length:
            q = (target - walked) / length
            out.append((a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q))
        break
    return out


def font_from(spec: dict[str, Any], size: int, config_dir: Path):
    raw = spec.get("path")
    if not raw:
        raise ValueError("lower-third font path is required")
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = config_dir / path
    if not path.is_file():
        raise ValueError(f"font not found: {path}")
    font = ImageFont.truetype(str(path), size)
    variation = spec.get("variation")
    if variation:
        try:
            font.set_variation_by_name(str(variation))
        except Exception as exc:  # noqa: BLE001
            try:
                names = [n.decode(errors="replace") for n in font.get_variation_names()]
            except Exception:  # noqa: BLE001
                names = []
            raise ValueError(f"font variation {variation!r} unavailable; choices={names}") from exc
    return font


def alpha_scaled(image, opacity: float):
    out = image.copy()
    out.putalpha(image.getchannel("A").point(lambda a: round(a * clamp(opacity))))
    return out


def build_panel(width: int, height: int, radius: int, scale: float):
    margin = round(42 * scale)
    image = Image.new("RGBA", (width + 2 * margin, height + 2 * margin), (0, 0, 0, 0))
    box = (margin, margin, margin + width, margin + height)
    shadow = Image.new("L", image.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (box[0] + round(8 * scale), box[1] + round(16 * scale),
         box[2] + round(8 * scale), box[3] + round(16 * scale)),
        radius=radius + round(2 * scale), fill=165,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(24 * scale)))
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0)); layer.putalpha(shadow)
    image = Image.alpha_composite(image, layer)
    panel = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(panel).rounded_rectangle(box, radius=radius, fill=(20, 20, 25, 242), outline=(255, 255, 255, 27), width=max(1, round(2 * scale)))
    return Image.alpha_composite(image, panel), margin


def lower_state(time_s: float, start: float, end: float, animation: dict[str, Any]) -> dict[str, float]:
    panel_in = ease_out((time_s - start) / float(animation.get("panelInSeconds", 0.46)))
    exit_seconds = float(animation.get("exitSeconds", 0.64))
    panel_out = 1 - smooth((time_s - (end - exit_seconds * 0.72)) / (exit_seconds * 0.72))
    accent_in = ease_out((time_s - start - float(animation.get("accentDelaySeconds", 0.08))) / float(animation.get("accentInSeconds", 0.42)))
    accent_out = 1 - smooth((time_s - (end - exit_seconds * 0.81)) / (exit_seconds * 0.63))
    text_seconds = float(animation.get("textInSeconds", 0.42))
    name_in = ease_out((time_s - start - float(animation.get("nameDelaySeconds", 0.16))) / text_seconds)
    subtitle_in = ease_out((time_s - start - float(animation.get("subtitleDelaySeconds", 0.27))) / text_seconds)
    name_out = 1 - smooth((time_s - (end - exit_seconds * 0.84)) / (exit_seconds * 0.56))
    subtitle_out = 1 - smooth((time_s - (end - exit_seconds)) / (exit_seconds * 0.53))
    return {"panel": panel_in * panel_out, "panel_in": panel_in, "panel_out": panel_out,
            "accent": accent_in * accent_out, "name": name_in * name_out,
            "subtitle": subtitle_in * subtitle_out, "name_in": name_in,
            "name_out": name_out, "subtitle_in": subtitle_in, "subtitle_out": subtitle_out}


def render_lower(canvas, overlay: dict[str, Any], time_s: float, width: int, height: int, config_dir: Path, cache: dict[int, Any]):
    start, end = float(overlay["start"]), float(overlay["end"])
    if not (start <= time_s < end):
        return canvas
    style, animation = overlay.get("style", {}), overlay.get("animation", {})
    scale = height / 1440.0
    panel_w, panel_h = round(float(style.get("panelWidthPx", 1050)) * scale), round(float(style.get("panelHeightPx", 218)) * scale)
    radius = round(float(style.get("radiusPx", 28)) * scale)
    key = id(overlay)
    if key not in cache:
        fonts = overlay.get("fonts", {})
        cache[key] = (
            *build_panel(panel_w, panel_h, radius, scale),
            font_from(fonts.get("name", {}), round(float(style.get("nameSizePx", 64)) * scale), config_dir),
            font_from(fonts.get("subtitle", {}), round(float(style.get("subtitleSizePx", 38)) * scale), config_dir),
        )
    panel, margin, name_font, subtitle_font = cache[key]
    state = lower_state(time_s, start, end, animation)
    pos = overlay.get("position", [0.043, 0.758])
    x0, y0 = float(pos[0]) * width, float(pos[1]) * height
    x = x0 - 34 * scale * (1 - state["panel_in"]) + 34 * scale * (1 - state["panel_out"])
    y = y0 + 10 * scale * (1 - state["panel_in"]) + 8 * scale * (1 - state["panel_out"])
    canvas.alpha_composite(alpha_scaled(panel, state["panel"]), (round(x - margin), round(y - margin)))
    accent = parse_color(str(style.get("accent", "#fa923f")))
    top, bottom = y + 35 * scale, y + panel_h - 35 * scale
    center, half = (top + bottom) / 2, (bottom - top) * state["accent"] / 2
    if half > 0.5:
        accent_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(accent_layer).rounded_rectangle(
            (round(x + 28 * scale), round(center - half), round(x + 36 * scale), round(center + half)),
            radius=max(1, round(4 * scale)), fill=(*accent, round(255 * state["accent"])),
        )
        canvas = Image.alpha_composite(canvas, accent_layer)
    content = overlay.get("content", {})
    tx = round(x + 70 * scale)
    name_y = round(y + 42 * scale + 16 * scale * (1 - state["name_in"]) - 12 * scale * (1 - state["name_out"]))
    sub_y = round(y + 123 * scale + 13 * scale * (1 - state["subtitle_in"]) - 10 * scale * (1 - state["subtitle_out"]))
    text_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(text_layer)
    d.text((tx, name_y), str(content.get("name", "")), font=name_font, fill=(248, 248, 250, round(255 * state["name"])))
    d.text((tx, sub_y), str(content.get("subtitle", "")), font=subtitle_font, fill=(205, 208, 218, round(255 * state["subtitle"])))
    return Image.alpha_composite(canvas, text_layer)


def render_spotlight(canvas, overlay: dict[str, Any], time_s: float, width: int, height: int):
    start, end = float(overlay["start"]), float(overlay["end"])
    if not (start <= time_s < end):
        return canvas
    style, animation = overlay.get("style", {}), overlay.get("animation", {})
    scale = height / 1440.0
    enter_s, exit_s = float(animation.get("enterSeconds", 0.73)), float(animation.get("exitSeconds", 0.4))
    draw_p = smooth((time_s - start) / enter_s)
    exit_v = 1 - smooth((time_s - (end - exit_s)) / exit_s)
    dim_p = smooth((time_s - start) / min(enter_s, 0.37)) * exit_v
    rect = rect_at(overlay.get("target", {}), time_s)
    x0, y0, rw, rh = rect
    card = (x0 * width, y0 * height, (x0 + rw) * width, (y0 + rh) * height)
    gap = float(style.get("gapPx", 1)) * scale
    border_w = max(1, round(float(style.get("borderWidthPx", 8)) * scale))
    grow = 10 * scale * (1 - exit_v)
    centerline = (card[0] - gap - border_w / 2 - grow, card[1] - gap - border_w / 2 - grow,
                  card[2] + gap + border_w / 2 + grow, card[3] + gap + border_w / 2 + grow)
    radius = float(style.get("radiusPx", 28)) * scale + grow
    hole = (centerline[0] - border_w / 2, centerline[1] - border_w / 2,
            centerline[2] + border_w / 2, centerline[3] + border_w / 2)
    mask = Image.new("L", (width, height), round(float(style.get("dimAlpha", 150)) * dim_p))
    ImageDraw.Draw(mask).rounded_rectangle(hole, radius=radius + border_w / 2, fill=0)
    dim = Image.new("RGBA", (width, height), (0, 0, 0, 0)); dim.putalpha(mask)
    canvas = Image.alpha_composite(canvas, dim)
    if style.get("shadow"):
        sm = Image.new("L", (width, height), 0)
        ImageDraw.Draw(sm).rounded_rectangle((hole[0] + 4 * scale, hole[1] + 10 * scale, hole[2] + 4 * scale, hole[3] + 10 * scale), radius=radius, fill=round(120 * exit_v))
        sm = sm.filter(ImageFilter.GaussianBlur(round(16 * scale)))
        sh = Image.new("RGBA", (width, height), (0, 0, 0, 0)); sh.putalpha(sm)
        canvas = Image.alpha_composite(canvas, sh)
    points = partial_path(rounded_clockwise_path(centerline, radius), draw_p)
    if len(points) >= 2:
        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
        color = (*parse_color(str(style.get("color", "#fa923f"))), round(255 * exit_v))
        d.line(points, fill=color, width=border_w, joint="curve")
        tx, ty = points[-1]; rr = border_w / 2
        d.ellipse((tx - rr, ty - rr, tx + rr, ty + rr), fill=color)
        canvas = Image.alpha_composite(canvas, layer)
    return canvas


def validate_job(job: dict[str, Any], source: dict[str, Any], presets: dict[str, Any], config_dir: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    clip = job.get("clip")
    if not isinstance(clip, dict):
        raise ValueError("job requires clip object")
    start, duration = float(clip.get("start", 0)), float(clip.get("duration", 0))
    if start < 0 or duration <= 0 or start + duration > source["duration"] + 0.05:
        raise ValueError("clip start/duration is outside source")
    raw = job.get("overlays")
    if not isinstance(raw, list) or not raw:
        raise ValueError("job requires non-empty overlays")
    overlays = []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("overlay must be an object")
        name = item.get("preset")
        if name not in presets:
            raise ValueError(f"unknown preset: {name}")
        merged = deep_merge(presets[name], item)
        a, b = float(merged.get("start", -1)), float(merged.get("end", -1))
        if a < 0 or b <= a or b > duration + 1e-6:
            raise ValueError(f"overlay range {a}-{b} outside clip duration {duration}")
        if merged["type"] == "spotlight":
            rect_at(merged.get("target", {}), a)
        elif merged["type"] == "lower-third":
            if not merged.get("content", {}).get("name"):
                raise ValueError("lower-third requires content.name")
            position = merged.get("position", [])
            if not isinstance(position, list) or len(position) != 2 or any(float(v) < 0 or float(v) > 1 for v in position):
                raise ValueError("lower-third position must be normalized [x,y]")
            style, fonts = merged.get("style", {}), merged.get("fonts", {})
            scale = source["height"] / 1440.0
            font_from(fonts.get("name", {}), round(float(style.get("nameSizePx", 64)) * scale), config_dir)
            font_from(fonts.get("subtitle", {}), round(float(style.get("subtitleSizePx", 38)) * scale), config_dir)
        else:
            raise ValueError(f"unsupported overlay type: {merged['type']}")
        overlays.append(merged)
    return {"start": start, "duration": duration}, overlays


def compose_command(input_path: Path, output: Path, overlay_pattern: Path, clip: dict[str, Any], fps: float, encoder: str, bitrate: str) -> list[str]:
    cmd = ["ffmpeg", "-y", "-ss", f"{clip['start']:.6f}", "-t", f"{clip['duration']:.6f}", "-i", str(input_path),
           "-framerate", f"{fps:.8f}", "-i", str(overlay_pattern),
           "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]", "-map", "[v]", "-map", "0:a:0?", "-t", f"{clip['duration']:.6f}"]
    if encoder == "h264_videotoolbox":
        cmd += ["-c:v", encoder, "-b:v", bitrate, "-allow_sw", "1"]
    else:
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20"]
    cmd += ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(output)]
    return cmd


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True)
    ap.add_argument("--config", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--work-dir", type=Path, default=Path("work/graphics"))
    ap.add_argument("--encoder", choices=["libx264", "h264_videotoolbox"], default="libx264")
    ap.add_argument("--video-bitrate", default="10M")
    ap.add_argument("--overlay-only", action="store_true")
    ap.add_argument("--keep-work", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if Image is None:
        return fail("Pillow is required: python3 -m pip install Pillow", 3)
    if not args.input.is_file() or not args.config.is_file():
        return fail("--input and --config must exist")
    if args.output.exists() and not args.force:
        return fail(f"output exists (use --force): {args.output}")
    try:
        source = probe(args.input)
        job = json.loads(args.config.read_text(encoding="utf-8"))
        presets = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
        clip, overlays = validate_job(job, source, presets, args.config.parent)
    except (ValueError, KeyError, json.JSONDecodeError, RuntimeError) as exc:
        return fail(str(exc))
    frames = round(clip["duration"] * source["fps"])
    overlay_dir = args.work_dir / "overlay"
    pattern = overlay_dir / "frame-%06d.png"
    command = compose_command(args.input, args.output, pattern, clip, source["fps"], args.encoder, args.video_bitrate)
    summary = {"input": str(args.input), "output": str(args.output), "clip": clip,
               "source": source, "frames": frames, "overlays": len(overlays),
               "overlay_dir": str(overlay_dir), "command": command}
    if args.dry_run:
        json.dump({**summary, "dry_run": True}, sys.stdout, indent=2); sys.stdout.write("\n")
        return 0
    if overlay_dir.exists():
        if not args.force:
            return fail(f"overlay work exists (use --force): {overlay_dir}")
        shutil.rmtree(overlay_dir)
    overlay_dir.mkdir(parents=True)
    cache: dict[int, Any] = {}
    try:
        for index in range(frames):
            time_s = index / source["fps"]
            canvas = Image.new("RGBA", (source["width"], source["height"]), (0, 0, 0, 0))
            for overlay in overlays:
                if overlay["type"] == "spotlight":
                    canvas = render_spotlight(canvas, overlay, time_s, source["width"], source["height"])
                else:
                    canvas = render_lower(canvas, overlay, time_s, source["width"], source["height"], args.config.parent, cache)
            canvas.save(overlay_dir / f"frame-{index + 1:06d}.png", compress_level=6)
        if args.overlay_only:
            json.dump({**summary, "overlay_only": True}, sys.stdout, indent=2); sys.stdout.write("\n")
            return 0
        args.output.parent.mkdir(parents=True, exist_ok=True)
        p = subprocess.run(command)
        if p.returncode != 0:
            return fail(f"ffmpeg exited {p.returncode}", 3)
        result = probe(args.output)
        json.dump({**summary, "result": result}, sys.stdout, indent=2); sys.stdout.write("\n")
        return 0
    except (ValueError, OSError) as exc:
        return fail(str(exc), 3)
    finally:
        if overlay_dir.exists() and not args.keep_work and not args.overlay_only:
            shutil.rmtree(overlay_dir)


if __name__ == "__main__":
    raise SystemExit(main())
