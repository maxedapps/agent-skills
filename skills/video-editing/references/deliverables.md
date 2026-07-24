# Deliverables, export, and cleanup

## TOC
- Default deliverables
- Optional deliverables
- Export specs
- Work vs deliverable layout
- Cleanup contract
- Naming

## Default deliverables

Unless the user overrides:

| Artifact | Required | Notes |
|---|---|---|
| Final video (`.mp4`) | **Yes** | Optimized **2K (2560×1440)** H.264 + AAC |
| Captions (`.srt`) | **Yes** | Timeline must match the **final** video |
| Captions (`.vtt`) | No | Only if requested; derive from SRT via script |
| Transcript (`.txt`) | No | Only if requested; plain text from final captions |

Do **not** hand the user intermediate 4K masters, face tracks, analysis WAVs, waveforms, sample frames, or join previews unless they explicitly ask to keep working files.

## Optional deliverables

Produce only when asked:

- `.vtt` — `scripts/srt_to_vtt.py`
- `.txt` — from final SRT/TXT caption path
- Higher/lower resolution than 2K
- Separate “clean no-PiP” master
- Keep-list / edit-plan for reproducibility

## Export specs (defaults)

### Video
- Resolution: **2560×1440** (`scale=2560:1440`, keep SAR/DAR 16:9)
- Codec: H.264 (`h264_videotoolbox` preferred, else `libx264`)
- Video bitrate target: ~6–10 Mbps for 2K talking-head/screen (adjust if user wants smaller/larger)
- Audio: AAC stereo-or-mono as source, **192 kbps**, 48 kHz
- `+faststart` for web playback
- Frame-accurate re-encode (never stream-copy cut masters as the public deliverable)

### Captions
- Final `.srt` is mandatory with the video
- Prefer one final caption pass on the **deliverable timeline** (after all cuts/PiP), or a keep-list-cut SRT that is verified against the final
- `.vtt` must be generated from the final `.srt` (do not maintain two manual caption sources)

```bash
python3 scripts/srt_to_vtt.py final.srt -o final.vtt
```

## Work vs deliverable layout

```text
project/
  SOURCE.mp4                    # user source (keep)
  SOURCE-face.mov               # optional second source (keep)
  deliverables/                 # USER-FACING ONLY
    NAME.mp4
    NAME.srt
    NAME.vtt                    # only if requested
    NAME.txt                    # only if requested
  work/                         # TEMP / reproducible edit (deletable)
    captions/                   # source captions
    analysis/                   # wav, energy, contact sheets
    edit/                       # keep-list, filter, plan, previews
    face/                       # face window/track intermediates
    joins/                      # boundary QA clips
```

During the job, put all samples, waveforms, spectrograms, RMS dumps, face contact sheets, join WAVs, and intermediate encodes under `work/`.

## Cleanup contract

**Before finishing the task**, always:

1. Confirm `deliverables/` contains exactly what the user should keep (at minimum mp4 + srt).
2. Run:
   ```bash
   bash scripts/cleanup_work.sh --project-root . --also-masters
   ```
   This removes analysis media, face intermediates, joins, previews, and duplicate clean masters while keeping `deliverables/` and lean `work/edit/*.json`.
3. Do **not** delete user source media.
4. Do **not** delete `deliverables/`.
5. Report what was delivered and that temps were cleaned.

If disk is tight mid-job, clean analysis previews early after decisions are locked.

## Naming

Default:

```text
deliverables/<source-stem>-final.mp4
deliverables/<source-stem>-final.srt
```

If PiP/face composite: still one final name unless the user wants multiple variants.

## Finalize command pattern

```bash
# 2K optimized final from graded/composited master
bash scripts/export_final_video.sh \
  --input work/edit/master-4k.mp4 \
  --output deliverables/NAME-final.mp4

# captions already matching final timeline
cp work/edit/final.srt deliverables/NAME-final.srt

# only if requested
python3 scripts/srt_to_vtt.py deliverables/NAME-final.srt -o deliverables/NAME-final.vtt
```
