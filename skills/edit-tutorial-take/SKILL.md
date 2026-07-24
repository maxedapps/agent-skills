---
name: edit-tutorial-take
description: >-
  Turns raw tutorial/talking-head recordings into one publishable continuous take
  by removing false starts, stumbles, abandoned lines, and bad dead air; optional
  face-cam PiP sync/composite; ships optimized 2K mp4 + SRT (VTT/TXT on request).
  Use this skill when the user wants to clean up, cut restarts from, edit down,
  finalize, or caption-deliver a tutorial/lesson screen recording. Do not use for
  captions-only jobs without editing, silence-removal-only exports, general VFX,
  multi-cam films, or music/podcast edits without a timed speech keep-list.
compatibility: >-
  Requires ffmpeg/ffprobe and Python 3. Caption generation prefers
  ~/development/projects/academind-tools generate-captions (ElevenLabs).
metadata:
  short-description: Clean tutorial takes; ship 2K mp4 + SRT
---

# Edit Tutorial Take

## Critical rules

- **Read first:** [`references/workflow.md`](references/workflow.md) + [`references/decision-rules.md`](references/decision-rules.md).
- **Captions:** [`references/captions.md`](references/captions.md) — source once; iterate with cut-SRT.
- **Ship:** [`references/deliverables.md`](references/deliverables.md) — default **2K mp4 + SRT**; VTT/TXT only on request; **cleanup temps before finish**.
- **Face cam:** [`references/face-pip.md`](references/face-pip.md) before any PiP work.
- **Glitches:** [`references/failure-modes.md`](references/failure-modes.md).
- Source of truth is **timed speech (SRT)**, not silence detection.
- Keep **successful performances**, including clean attacks/releases. Never leave prep-breath / mouth-start into a deleted attempt (`out: surgical`).
- Use bundled [`scripts/`](scripts/). Re-encode cuts. Put all temps under `work/`.

## Canonical pipeline

```text
inspect → caption source once → parse SRT → draft keep-list
  → classify_joins → tighten_edges (wav)
  → build_filter + cut-SRT preview → scan_flubs + read prose
  → render master → optional face PiP (sync + crop suggest + overlay)
  → final SRT → export 2K deliverable → cleanup_work
```

### Essential commands

```bash
SK=.agents/skills/edit-tutorial-take/scripts

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
| [`scripts/`](scripts/) | All tools (`--help`) |

## Validation before done

- `deliverables/` has **2K mp4 + srt** only (plus requested VTT/TXT)
- Preview/final transcript is one continuous take; `scan_flubs --strict` clean enough
- Surgical joins have no dangling prep silence/motion
- Face PiP (if any): verified offset; crop preview person-dominant
- `cleanup_work` run; sources preserved; no sample frames left in root

## Constraints

- Do not strip every pause. Do not maximize compression.
- Do not silently switch caption providers.
- Do not ship intermediates (face-track, waveforms, 4K masters) as deliverables.
