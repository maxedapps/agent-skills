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
    graphics/       # optional configs, tracks, previews, overlay frames
```

## Phases

### A — Inspect
`ffprobe` sources. Create `work/` + `deliverables/`.

### B — Audio map
Extract the analysis WAV used for conservative cut-edge cleanup and final pause review:

```bash
python3 scripts/analyze_audio.py --video SOURCE.mp4 --wav work/analysis/audio.wav --extract
```

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

Order: drop pre-take → abandoned sections → restart winners → intra-cue surgery (`time_at` / `energy_at`) → semantic outgoing `join`/pause intent → physical `in`/`out` edge hygiene.

Use `join: repair|continuation|sentence|section` independently of source-gap length. Keep short internal breaths. Split distracting long pauses—especially mid-sentence or between related sentences—while retaining enough separation for natural phrasing. Record only listened-to intentional exceptions in `accepted_pauses` / `pause.accepted`.

### F — Classify + tighten edges
```bash
python3 scripts/classify_joins.py --keeps work/edit/keep-list.json --output work/edit/keep-list.json
python3 scripts/tighten_edges.py \
  --keeps work/edit/keep-list.json \
  --wav work/analysis/audio.wav \
  --output work/edit/keep-list.json
```
Source-gap classes are advisory; explicit semantic joins and edge tags survive. Do not use `--force` after authoring. `tighten_edges.py` conservatively changes only actual cut endpoints and reports ambiguous energy; it does not recognize breaths semantically. Listen to every changed or unresolved seam.

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

### H — Render master and approve cadence
```bash
bash scripts/render_clean.sh \
  --video SOURCE.mp4 \
  --filter work/edit/filter.txt \
  --output work/edit/master-4k.mp4

python3 scripts/extract_joins.py \
  --video work/edit/master-4k.mp4 \
  --plan work/edit/edit-plan.json \
  --timeline output --out-dir work/joins

python3 scripts/audit_pauses.py \
  --media work/edit/master-4k.mp4 \
  --srt work/edit/clean-preview.srt \
  --plan work/edit/edit-plan.json --strict
```

Listen to every assembled seam and pause candidate. Candidate defaults are about 0.7 s for repair/continuation, 1.0 s for a related sentence, 1.2 s ordinary, and 1.5 s for a section. They trigger review rather than automatic deletion. Keep short internal breaths; remove cut-adjacent orphan breath/prep at every jump cut. Document intentional exceptions, rebuild, and rerun strict audit.

### I — Optional face PiP
1. `sync_audio_offset.py --screen SOURCE.mp4 --face FACE.mov` → require verify_delta ≈ 0
2. `suggest_face_crop.py --video FACE.mov --out-dir work/face/crop --start <real-take-face> --end <end>`
3. Visually confirm `crop_preview.jpg` (person-dominant; modest hand room)
4. Sequential face window extract (cropped/scaled) → cut with offset keeps → overlay
5. Spot-check lip sync + joins on face
Details: `face-pip.md`

### J — Optional tutorial graphics, then final captions/export

After the edit timeline and optional PiP are locked, read `motion-graphics.md`. Apply graphics to the master so job times use the final timeline. Approve a short entry/hold/exit preview before a long render.

```bash
python3 scripts/render_graphics.py \
  --input work/edit/master-4k.mp4 \
  --config work/graphics/job.json \
  --output work/edit/master-graphics.mp4 \
  --keep-work
```

Use `master-graphics.mp4` as the export input when created. Graphics-only jobs skip phases B–I and render directly from the source.

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
| `classify_joins.py` | Preserve authored intent; annotate advisory source-gap edge suggestions |
| `tighten_edges.py` | Conservative actual-cut energy cleanup + unresolved reporting |
| `cut_srt.py` | Keep-list → rewritten SRT/TXT |
| `build_filter.py` | Keep-list → metadata-preserving filter + plan (+ cut SRT) |
| `scan_flubs.py` | Residual flub patterns |
| `extract_joins.py` | Rendered seams or assembled disjoint source tail/head WAVs |
| `audit_pauses.py` | Review-only clean-output silence/SRT cadence audit |
| `render_clean.sh` | Master render |
| `sync_audio_offset.py` | Face/screen audio offset |
| `suggest_face_crop.py` | Multi-frame crop suggestion + preview |
| `render_graphics.py` | Config-driven spotlight/lower-third clip composition |
| `vision_ocr.swift` | macOS local OCR → normalized top-left text rectangles |
| `export_final_video.sh` | Default 2K deliverable encode |
| `srt_to_vtt.py` | SRT → VTT |
| `cleanup_work.sh` | Delete disposable edit artifacts; `--caption-work` removes caption-only work after delivery |
| `_common.py` | Shared helpers (not CLI) |

## Stop conditions

- `deliverables/` has 2K mp4 + srt (+ requested optionals only)
- One opening; complete arc; hard flubs clean enough
- Every assembled jump-cut seam was listened to; no cut-adjacent orphaned prep/breath remains
- Clean-output internal/inter-cue pause candidates were reviewed; accepted exceptions are documented and section cadence is not breathless
- Face (if any): good offset + person-centered crop
- Graphics (if any): target/text/fonts and entry/hold/track/exit visually approved; streams/timing probed
- Temps cleaned; sources kept
