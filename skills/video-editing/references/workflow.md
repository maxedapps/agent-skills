# Workflow — edit a raw tutorial take

## TOC
- Preconditions
- Layout
- Phases A–J
- Script index
- Stop conditions

## Preconditions

- `ffmpeg` / `ffprobe`, Python 3
- Read `decision-rules.md` before keep-list edits
- Read `captions.md` before STT
- Read `deliverables.md` before shipping
- Read `face-pip.md` if face cam
- Read `failure-modes.md` on glitches

## Layout

```text
project/
  SOURCE...
  deliverables/     # user-facing only
  work/
    captions/       # source captions
    analysis/       # wav only as needed
    edit/           # keep-list, filter, plan, previews
    face/           # optional PiP intermediates
    joins/          # boundary QA
```

## Phases

### A — Inspect
`ffprobe` sources. Create `work/` + `deliverables/`.

### B — Optional audio map
`analyze_audio.py --extract` for first-sound context only.

### C — Caption source once
Follow `captions.md`: use local `stt` if on PATH; otherwise **ask the user** how to obtain SRT+TXT (do not silently pick a cloud tool). Land files at `work/captions/srt/` + `work/captions/txt/`.

### D — Parse SRT
```bash
python3 scripts/parse_srt.py work/captions/srt/NAME.srt --format report \
  --gaps 2 --opening "let's talk" --write-cues work/edit/cues.json
```
Mark real-take start, restarts, stumps, abandoned branches.

### E — Draft keep-list
Author `work/edit/keep-list.json` (`assets/keep-list.schema.json`).

Order: drop pre-take → abandoned sections → restart winners → intra-cue surgery (`time_at` / `energy_at`) → edge classes.

### F — Classify + tighten edges
```bash
python3 scripts/classify_joins.py --keeps work/edit/keep-list.json --output work/edit/keep-list.json --force
python3 scripts/tighten_edges.py \
  --keeps work/edit/keep-list.json \
  --wav work/analysis/audio.wav \
  --output work/edit/keep-list.json
```
Manually override tags when gap heuristic is wrong (closely related clauses with longer think pause still `surgical` if a restart was removed between them).

### G — Build + validate without re-ASR
```bash
python3 scripts/build_filter.py \
  --video SOURCE.mp4 \
  --keeps work/edit/keep-list.json \
  --out-dir work/edit \
  --srt work/captions/srt/NAME.srt \
  --out-srt work/edit/clean-preview.srt \
  --out-txt work/edit/clean-preview.txt \
  --output-video work/edit/master-4k.mp4

python3 scripts/scan_flubs.py work/edit/clean-preview.txt --strict
# read clean-preview.txt end-to-end

python3 scripts/extract_joins.py --video SOURCE.mp4 --keeps work/edit/keep-list.json --out-dir work/joins
```
Iterate E–G until prose is one performance and surgical tails are clean.

### H — Render master
```bash
bash scripts/render_clean.sh \
  --video SOURCE.mp4 \
  --filter work/edit/filter.txt \
  --output work/edit/master-4k.mp4
```

### I — Optional face PiP
1. `sync_audio_offset.py --screen SOURCE.mp4 --face FACE.mov` → require verify_delta ≈ 0
2. `suggest_face_crop.py --video FACE.mov --out-dir work/face/crop --start <real-take-face> --end <end>`
3. Visually confirm `crop_preview.jpg` (person-dominant; modest hand room)
4. Sequential face window extract (cropped/scaled) → cut with offset keeps → overlay
5. Spot-check lip sync + joins on face
Details: `face-pip.md`

### J — Final captions, export, cleanup
```bash
# lock final.srt (verified cut-SRT or one ASR on final timeline)
cp work/edit/clean-preview.srt work/edit/final.srt   # if verified

bash scripts/export_final_video.sh \
  --input work/edit/master-4k.mp4 \
  --output deliverables/NAME-final.mp4

cp work/edit/final.srt deliverables/NAME-final.srt
# only if requested:
# python3 scripts/srt_to_vtt.py deliverables/NAME-final.srt -o deliverables/NAME-final.vtt

bash scripts/cleanup_work.sh --project-root . --also-masters
```
Report with `assets/edit-report.md`.

## Script index

| Script | Purpose |
|---|---|
| `parse_srt.py` | Cues, gaps, openings, flub cues |
| `analyze_audio.py` | Extract wav / silence map |
| `time_at.py` | Proportional cue timestamp guess |
| `energy_at.py` | RMS envelope printout |
| `classify_joins.py` | Tag `in`/`out` from gaps |
| `tighten_edges.py` | Snap edges via energy (kill prep tails) |
| `cut_srt.py` | Keep-list → rewritten SRT/TXT |
| `build_filter.py` | Keep-list → filter + plan (+ cut SRT); respects edge pads |
| `scan_flubs.py` | Residual flub patterns |
| `extract_joins.py` | Boundary WAV clips |
| `render_clean.sh` | Master render |
| `sync_audio_offset.py` | Face/screen audio offset |
| `suggest_face_crop.py` | Multi-frame crop suggestion + preview |
| `export_final_video.sh` | Default 2K deliverable encode |
| `srt_to_vtt.py` | SRT → VTT |
| `cleanup_work.sh` | Delete disposable edit artifacts; `--caption-work` removes caption-only work after delivery |
| `_common.py` | Shared helpers (not CLI) |

## Stop conditions

- `deliverables/` has 2K mp4 + srt (+ requested optionals only)
- One opening; complete arc; hard flubs clean enough
- No surgical dangling prep
- Face (if any): good offset + person-centered crop
- Temps cleaned; sources kept
