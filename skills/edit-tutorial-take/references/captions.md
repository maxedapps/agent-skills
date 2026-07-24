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

If academind-tools is unavailable, ask which STT to use. Do not silently switch stacks unless allowed.

## On-disk caption locations

```text
work/captions/           # source captions (once)
work/edit/clean-preview.*  # cut-SRT iteration
work/edit/final.srt        # locked timeline captions
deliverables/*.srt         # shipped
```
