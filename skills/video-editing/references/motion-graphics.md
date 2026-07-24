# Tutorial motion graphics

Use this workflow for lower thirds and spotlight/highlight callouts. It is not a general VFX or object-detection pipeline.

## Contract

- Requirements: `ffmpeg`, `ffprobe`, Python 3, Pillow. Apple Vision OCR additionally requires macOS and a Swift toolchain.
- Times in a graphics job are on the **output clip timeline**. `clip.start` selects the source-time offset.
- Rectangles are normalized top-left `[x, y, width, height]`; keep them resolution-independent.
- Render against clean source frames. Never track a generated border or dim layer.
- Require explicit font files. For variable fonts, use the requested named variation; never silently substitute.
- Put configs, tracks, previews, and retained overlay frames under `work/graphics/`.

## Workflow

1. Probe source duration, dimensions, FPS, video/audio streams.
2. Choose the requested clip range. Render only that range when the user does not need a full-video export.
3. Acquire a target:
   - **Manual/screenshot:** inspect the supplied frame, identify the full element, and record a normalized rectangle.
   - **Known text:** extract clean frames and run `vision_ocr.swift`; select matching observations by text, confidence, and proximity to the prior rectangle.
   - **Moving target:** record normalized keyframes, sample every frame during rapid motion, interpolate short gaps, and fade out instead of drifting when confidence is lost.
4. Copy [`../assets/graphics-job.example.json`](../assets/graphics-job.example.json), keep only needed overlays, and replace all content/paths.
5. Render a short clip with `render_graphics.py`; inspect entry, settled hold, movement, exit, and one frame outside the active range.
6. Verify duration, dimensions, FPS, audio, exact text, target containment, dimming, and font appearance. Then clean `work/graphics/`.

## Presets

Defaults live in [`../assets/motion-presets.json`](../assets/motion-presets.json); job values override them.

- `spotlight-clean`: clear rounded target, dimmed surroundings, clockwise border draw from the top-left tangent, fade/expand exit. Configure color, 1px-or-other gap, width, radius, dim alpha, and optional shadow.
- `lower-third-modern`: charcoal rounded panel, soft shadow/keyline, center-growing accent, local panel slide/fade, staggered name/subtitle rise/fade, reversed exit. Configure content, fonts, position, color, size, and timing.

## Commands

```bash
SK=.agents/skills/video-editing

# Inspect / exact frame
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,width,height,r_frame_rate -of json SOURCE.mp4
ffmpeg -ss 536 -i SOURCE.mp4 -frames:v 1 -vsync 0 work/graphics/frame.png

# Local OCR; NDJSON includes normalized top-left rectangles
swift "$SK/scripts/vision_ocr.swift" --language en-US work/graphics/frame.png > work/graphics/ocr.ndjson

# Validate config and show composition plan
python3 "$SK/scripts/render_graphics.py" --input SOURCE.mp4 --config work/graphics/job.json --output deliverables/clip.mp4 --dry-run

# Render requested clip; use --keep-work while reviewing overlay frames
python3 "$SK/scripts/render_graphics.py" --input SOURCE.mp4 --config work/graphics/job.json --output deliverables/clip.mp4 --keep-work
```

## Failure rules

- OCR finds text but not the intended instance: use proximity to the previous rectangle or a manual keyframe; do not select by text alone.
- OCR confidence/gaps are poor: increase sampling or request a rectangle/reference. Do not invent a track.
- Arbitrary logo/object discovery: require a manual rectangle, reference, or separate detector; OCR is text-only.
- Letterboxing/scaling mismatch: map against native video pixels, not player-window coordinates.
- Font variation unavailable: fail and list available names.
- Full 4K overlay work is expensive: approve a short clip first and delete PNG sequences after delivery.
