---
name: video-editing
description: >-
  Edits raw tutorial/talking-head recordings into one publishable continuous take
  and generates timed captions, subtitles, or plain transcripts for audio/video.
  Use this skill when the user asks to clean up, cut restarts from, edit down, or
  finalize a recording, or to create captions, subtitles, SRT/VTT, or a transcript,
  including caption-only or transcript-only jobs with no video edit. Do not use for
  silence-removal-only exports, general VFX, narrative multi-cam editing, or
  audio/music editing unless timed speech editing or transcription is requested.
compatibility: >-
  Requires ffmpeg/ffprobe for media inspection and Python 3 for bundled caption
  and editing scripts. Caption/transcript generation prefers local `stt` on PATH;
  otherwise ask the user (see references/captions.md).
metadata:
  short-description: Edit tutorial takes or create captions and transcripts
---

# Video Editing, Captions, and Transcripts

## Critical rules

- **Choose the mode first:**
  - Editing requested: read [`references/workflow.md`](references/workflow.md) + [`references/decision-rules.md`](references/decision-rules.md).
  - Captions/transcript only: read [`references/captions.md`](references/captions.md) + [`references/deliverables.md`](references/deliverables.md); do not run the editing pipeline.
- **Captions:** prefer `stt` if on PATH; else **ask user** (suggest install `stt` / existing SRT / ElevenLabs). Generate from the source once. Never silently switch providers.
- **Ship:** follow [`references/deliverables.md`](references/deliverables.md). Editing defaults to **2K mp4 + SRT**; caption/transcript-only jobs deliver only requested text/timed-text files.
- **Face cam:** read [`references/face-pip.md`](references/face-pip.md) before any PiP work.
- **Glitches:** read [`references/failure-modes.md`](references/failure-modes.md) when output has caption, join, render, sync, or crop problems.
- For editing, source of truth is **timed speech (SRT)**, not silence detection.
- Keep **successful performances**, including clean attacks/releases. Never leave prep-breath / mouth-start into a deleted attempt (`out: surgical`).
- Use bundled [`scripts/`](scripts/). Re-encode cuts. Put all temps under `work/`.

## Canonical pipelines

```text
edit: inspect → caption source once → parse SRT → draft keep-list
  → classify_joins → tighten_edges (wav)
  → build_filter + cut-SRT preview → scan_flubs + read prose
  → render master → optional face PiP (sync + crop suggest + overlay)
  → final SRT → export 2K deliverable → cleanup_work

captions/transcript only: inspect → choose caption provider → transcribe source once
  → validate requested formats against source → deliver requested files → cleanup
```

### Essential commands

```bash
SK=.agents/skills/video-editing/scripts

python3 $SK/parse_srt.py work/captions/srt/NAME.srt --format report
python3 $SK/classify_joins.py --keeps work/edit/keep-list.json --output work/edit/keep-list.json --force
python3 $SK/tighten_edges.py --keeps work/edit/keep-list.json --wav work/analysis/audio.wav --output work/edit/keep-list.json
python3 $SK/build_filter.py --video SRC.mp4 --keeps work/edit/keep-list.json --out-dir work/edit --srt work/captions/srt/NAME.srt
python3 $SK/scan_flubs.py work/edit/clean-preview.txt --strict
bash $SK/render_clean.sh --video SRC.mp4 --filter work/edit/filter.txt --output work/edit/master-4k.mp4

# optional face:
python3 $SK/sync_audio_offset.py --screen SRC.mp4 --face FACE.mov
python3 $SK/suggest_face_crop.py --video FACE.mov --out-dir work/face/crop --start ... --end ...

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
| [`references/failure-modes.md`](references/failure-modes.md) | Fixes |
| [`assets/keep-list.schema.json`](assets/keep-list.schema.json) | keep-list shape (`in`/`out`) |
| [`assets/keep-list.example.json`](assets/keep-list.example.json) | Example keeps |
| [`assets/edit-report.md`](assets/edit-report.md) | Final report template |
| [`assets/terms.txt`](assets/terms.txt) | Standard STT domain terms (`stt --terms`) |
| [`scripts/`](scripts/) | All tools (`--help`) |

## Validation before done

- Editing: `deliverables/` has **2K mp4 + SRT** only, plus requested VTT/TXT
- Captions/transcript only: requested SRT/VTT/TXT files parse/read correctly and match the unedited source timeline/content; no copied video unless requested
- Edited preview/final transcript is one continuous take; `scan_flubs --strict` clean enough
- Surgical joins have no dangling prep silence/motion
- Face PiP (if any): verified offset; crop preview person-dominant
- Temps cleaned; sources preserved; no sample frames left in root

## Constraints

- Do not strip every pause. Do not maximize compression.
- Do not silently switch caption providers.
- Do not run keep-list, render, or video-export steps for caption/transcript-only work.
- Do not ship intermediates (face-track, waveforms, 4K masters, raw STT metadata) as deliverables.
