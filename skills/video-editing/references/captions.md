# Captions for tutorial-take editing

## TOC
- Preferred caption tool
- Commands
- Iteration policy (critical)
- Final captions + deliverables
- Fallbacks

## Preferred caption tool

Use Academind local captions when available:

Repo: `~/development/projects/academind-tools`  
Package: `@academind/generate-captions`  
Requires: `ELEVENLABS_API_KEY` in that repo’s `.env`

```bash
cd ~/development/projects/academind-tools
pnpm --filter @academind/generate-captions cli -- \
  "/ABS/PATH/video.mp4" \
  --formats srt,txt \
  --output "/ABS/PATH/work/captions" \
  --model scribe_v2
```

Force regenerate: add `--force`.

## Local Qwen STT (`stt`) + standard terms

When using the Apple Silicon Qwen CLI (`~/development/projects/stt`) instead of (or in addition to) ElevenLabs:

- **Standard terms asset:** [`assets/terms.txt`](../assets/terms.txt) — Academind people/product/AI names for soft vocabulary bias.
- Copy into the project (or pass the skill path with `--terms`). Do not hand-maintain a divergent default list per project unless the shoot needs extra terms.

```bash
SK_TERMS=~/development/projects/maxed-skills/skills/video-editing/assets/terms.txt
# optional project overlay: append shoot-specific lines to work/captions/terms.txt
cp "$SK_TERMS" work/captions/terms.txt

cd ~/development/projects/stt
uv run stt "/ABS/PATH/video.mp4" \
  -o "/ABS/PATH/work/captions" \
  --terms "/ABS/PATH/work/captions/terms.txt" \
  --overwrite
```

`stt` writes `<stem>.srt`, `<stem>.txt`, `<stem>.vtt`, and `<stem>.words.json`. Prefer the `.srt` + `.txt` for the edit loop; keep extra formats only if useful.

## Iteration policy (critical)

**Do not re-caption the clean cut on every edit pass.**

| When | Action |
|---|---|
| Start of job | Caption **source once** → SRT+TXT |
| While refining keep-list | Rewrite SRT with `cut_srt.py` / `build_filter.py --srt` |
| Join QA | `extract_joins.py` + energy; optional |
| After final timeline is locked | Ensure a **final .srt** matching deliverable timeline (cut-SRT verified, or one ASR pass) |

## Final captions + deliverables

- **Default ship:** `deliverables/*.srt` with the final mp4
- **VTT:** only if requested → `scripts/srt_to_vtt.py final.srt -o final.vtt`
- **TXT:** only if requested → export plain transcript from final captions
- Never maintain VTT by hand; always derive from final SRT

See `deliverables.md`.

## Why cut-SRT is enough mid-loop

Cutting the source SRT through the keep-list answers:

- Did false intros disappear?
- Is the narrative complete?
- Did I drop a whole section?

`cut_srt.py` proportionally slices partial-cue text (approximate). It does not catch all audible seam glitches—use energy/joins; optional one final ASR.

## Fallbacks

If academind-tools is unavailable, prefer local `stt` (Qwen) with [`assets/terms.txt`](../assets/terms.txt), or ask which STT to use. Do not silently switch stacks unless allowed.

## On-disk caption locations

```text
work/captions/           # source captions (once)
work/edit/clean-preview.*  # cut-SRT iteration
work/edit/final.srt        # locked timeline captions
deliverables/*.srt         # shipped
```
