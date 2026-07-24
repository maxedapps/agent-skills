---
name: video-editing
description: >-
  Edits tutorial/talking-head recordings, adds reusable tutorial callouts or lower
  thirds, and creates captions or transcripts. Use this skill when the user asks
  to clean up a take, cut restarts, highlight or track an on-screen region/text,
  add a lower third, render an annotated clip, or create SRT/VTT/TXT. Do not use
  for silence-removal-only exports, cinematic/general VFX, arbitrary object
  detection, narrative multi-cam editing, or unrelated audio/music editing.
compatibility: >-
  Requires ffmpeg/ffprobe and Python 3. Motion graphics additionally require
  Pillow; local OCR requires macOS Apple Vision plus a Swift toolchain. Captions
  prefer local `stt`; otherwise ask the user (see references/captions.md).
metadata:
  short-description: Edit tutorials, add callouts, or create captions
---

# Video Editing, Motion Graphics, Captions, and Transcripts

## Critical rules

- **Choose the mode first:**
  - Editing: read [`references/workflow.md`](references/workflow.md) + [`references/decision-rules.md`](references/decision-rules.md).
  - Tutorial graphics/annotated clip: read [`references/motion-graphics.md`](references/motion-graphics.md) + [`references/deliverables.md`](references/deliverables.md). Graphics-only work does not require STT/SRT.
  - Captions/transcript only: read [`references/captions.md`](references/captions.md) + [`references/deliverables.md`](references/deliverables.md); do not run editing or graphics pipelines.
- **Captions:** prefer `stt` if on PATH; else **ask user** (suggest install `stt` / existing SRT / ElevenLabs). Generate from the source once. Never silently switch providers.
- **Ship:** follow [`references/deliverables.md`](references/deliverables.md). Editing defaults to **2K mp4 + SRT**; graphics-only preserves requested clip/source geometry; captions-only delivers requested timed text.
- **Face cam:** read [`references/face-pip.md`](references/face-pip.md) before any PiP work.
- **Glitches:** read [`references/failure-modes.md`](references/failure-modes.md) for caption, join, graphics, render, sync, or crop problems.
- For editing, source of truth is **timed speech (SRT)**, not silence detection.
- Keep successful performances and short natural breaths inside uninterrupted speech.
- At every jump cut, remove adjacent orphaned breath/prep/motion belonging to deleted material; join the last clean release to the next clean attack.
- Keep pauses short for smooth flow, especially mid-sentence and between related sentences. Cadence thresholds propose listening review—never universal silence deletion. Jump cuts are allowed.
- Listen to assembled/rendered seams and run final cadence QA on actual clean-output audio plus final/preview SRT.
- Use bundled [`scripts/`](scripts/). Re-encode cuts. Put all temps under `work/`.

## Canonical pipelines

```text
edit: inspect → caption source once → parse SRT → draft keep-list
  → classify_joins → tighten_edges (wav)
  → build_filter + cut-SRT preview → scan_flubs + read prose
  → render master → audition assembled seams → audit clean-output pauses
  → optional face PiP (sync + crop suggest + overlay)
  → final SRT → export 2K deliverable → cleanup_work

graphics only: inspect → select clip/target → configure preset → short preview
  → inspect entry/hold/track/exit → render requested clip → verify streams → cleanup

captions/transcript only: inspect → choose caption provider → transcribe source once
  → validate requested formats against source → deliver requested files → cleanup
```

### Essential commands

```bash
SK=.agents/skills/video-editing/scripts

python3 $SK/parse_srt.py work/captions/srt/NAME.srt --format report
python3 $SK/classify_joins.py --keeps work/edit/keep-list.json --output work/edit/keep-list.json
python3 $SK/tighten_edges.py --keeps work/edit/keep-list.json --wav work/analysis/audio.wav --output work/edit/keep-list.json
python3 $SK/build_filter.py --video SRC.mp4 --keeps work/edit/keep-list.json --out-dir work/edit --srt work/captions/srt/NAME.srt
python3 $SK/scan_flubs.py work/edit/clean-preview.txt --strict
bash $SK/render_clean.sh --video SRC.mp4 --filter work/edit/filter.txt --output work/edit/master-4k.mp4
python3 $SK/extract_joins.py --video work/edit/master-4k.mp4 --plan work/edit/edit-plan.json --timeline output --out-dir work/joins
python3 $SK/audit_pauses.py --media work/edit/master-4k.mp4 --srt work/edit/clean-preview.srt --plan work/edit/edit-plan.json --strict

# optional face:
python3 $SK/sync_audio_offset.py --screen SRC.mp4 --face FACE.mov
python3 $SK/suggest_face_crop.py --video FACE.mov --out-dir work/face/crop --start ... --end ...

# graphics-only or post-edit master annotation:
python3 $SK/render_graphics.py --input SRC.mp4 --config work/graphics/job.json --output deliverables/CLIP.mp4

bash $SK/export_final_video.sh --input work/edit/master-4k.mp4 --output deliverables/NAME-final.mp4
cp work/edit/final.srt deliverables/NAME-final.srt
# optional: python3 $SK/srt_to_vtt.py deliverables/NAME-final.srt -o deliverables/NAME-final.vtt
bash $SK/cleanup_work.sh --project-root . --also-masters
# caption/transcript-only cleanup after delivery: add --caption-work
```

## Resources

| Path | When |
|---|---|
| [`references/workflow.md`](references/workflow.md) | Full phases + script index |
| [`references/decision-rules.md`](references/decision-rules.md) | Keep/drop + edge classes |
| [`references/captions.md`](references/captions.md) | STT + cut-SRT policy |
| [`references/deliverables.md`](references/deliverables.md) | 2K/SRT/VTT/TXT + cleanup |
| [`references/face-pip.md`](references/face-pip.md) | Sync, crop, PiP |
| [`references/motion-graphics.md`](references/motion-graphics.md) | Targets, presets, OCR, tracking, rendering, QA |
| [`references/failure-modes.md`](references/failure-modes.md) | Fixes |
| [`assets/motion-presets.json`](assets/motion-presets.json) | Reusable spotlight/lower-third defaults |
| [`assets/graphics-job.example.json`](assets/graphics-job.example.json) | Replaceable graphics job shape |
| [`assets/keep-list.schema.json`](assets/keep-list.schema.json) | Semantic joins/cadence, edge hygiene, padding, and accepted pauses |
| [`assets/keep-list.example.json`](assets/keep-list.example.json) | Example semantic joins and reviewed pause exceptions |
| [`assets/edit-report.md`](assets/edit-report.md) | Final report template |
| [`assets/terms.txt`](assets/terms.txt) | Standard STT domain terms (`stt --terms`) |
| [`scripts/`](scripts/) | All tools (`--help`) |

## Validation before done

- Editing: `deliverables/` has **2K mp4 + SRT** only, plus requested VTT/TXT
- Graphics-only: requested MP4 range, dimensions/FPS/audio, text/fonts, target containment, and entry/hold/exit frames verified; no SRT unless requested
- Captions/transcript only: requested SRT/VTT/TXT files parse/read correctly and match the unedited source timeline/content; no copied video unless requested
- Edited preview/final transcript is one continuous take; `scan_flubs --strict` clean enough
- Every assembled jump-cut seam was listened to; no cut-adjacent orphaned breath/prep remains
- Clean-output pause candidates were reviewed; intentional retained pauses are documented and natural internal breaths remain
- Face PiP (if any): verified offset; crop preview person-dominant
- Temps cleaned; sources preserved; no sample frames left in root

## Constraints

- Do not strip every pause. Do not maximize compression.
- Do not silently switch caption providers.
- Do not run keep-list, graphics, render, or video-export steps for caption/transcript-only work.
- Do not claim OCR can discover arbitrary objects; require text, a rectangle, keyframes, or a separate detector.
- Do not ship intermediates (face-track, overlay PNGs, OCR dumps, waveforms, 4K masters, raw STT metadata) as deliverables.
