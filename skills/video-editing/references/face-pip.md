# Face track sync + picture-in-picture

## TOC
- When
- Sync
- Same keep-list
- Crop (critical)
- Efficient render
- Styling
- Validation

## When

User provides a second presenter recording with the **same take audio**, to composite onto the cleaned main video.

## Sync

```bash
python3 scripts/sync_audio_offset.py --screen SOURCE.mp4 --face FACE.mov
# → offset_s where face_time = screen_time + offset_s
# require ok=true / verify_delta_s ≈ 0
```

If weak/ambiguous correlation, stop and ask.

Map every keep: `face_start = screen_start + offset`.

## Same keep-list

Face uses the **same editorial keeps** as main (plus offset). Never independently re-edit face content.

## Crop (critical)

### Goal
Person-centered head + upper body. **Modest** hand room. Occasional fingertip clipping OK. **Persistent empty side space not OK.**

### Method
```bash
python3 scripts/suggest_face_crop.py \
  --video FACE.mov \
  --out-dir work/face/crop \
  --start <face real-take start> \
  --end <face end> \
  --samples 12
```
Then **look at** `crop_preview.jpg` (+ contact sheet). Adjust crop manually if needed before render.

Rules:
1. Sample many frames across the real take
2. Use percentile envelope, not absolute widest gesture
3. Small L/R pad only
4. Prefer subject-centered framing
5. Lock one fixed crop for the whole video

### Anti-pattern
One huge “safe” crop from a single frame → empty background dominates.

## Efficient render (large camera files)

Do **not** multi-trim randomly on multi‑GB originals.

1. Sequential extract of needed window, already cropped+scaled → `work/face/face-window.mp4`
2. Apply relative keeps → `work/face/face-track.mp4`
3. Overlay onto main master
4. Export 2K deliverable
5. Delete face intermediates in cleanup

## Styling defaults

- Bottom-right
- ~640–800 px wide on 4K master
- Dark purple border ≈ `#2E1065`, 6–10 px
- Subtle drop shadow
- Audio from **main** timeline only

## Validation

- 3–5 timestamps: lip sync OK
- Crop still good while gesturing; person dominates PiP
- Surgical joins: face does not start a deleted continuation
