# Captions for tutorial-take editing

## TOC
- Provider selection (critical)
- Local `stt` (preferred when available)
- Iteration policy (critical)
- Final captions + deliverables
- On-disk layout

## Provider selection (critical)

Caption **generation** is external to the edit scripts. Choose a provider in this order — **do not silently switch** after the user already has captions or after a provider was chosen for the job.

### 1) Prefer local `stt` when available

Detect:

```bash
command -v stt
```

If `stt` is on `PATH` (global install from the `stt` repo via `uv tool install`), use it for Phase C source captions.

Repo / user docs: `~/development/projects/stt` (README is user-oriented).  
Standard terms: [`assets/terms.txt`](../assets/terms.txt).

### 2) If `stt` is not available → **ask the user**

Stop and ask how they want source captions produced. Suggest practical options:

| Option | When to suggest |
|---|---|
| **Install local `stt`** (Apple Silicon) | User is on an M-series Mac and wants local/private captions. Point at the `stt` repo README install section (`brew install ffmpeg uv`, clone, `uv tool install --editable .`). |
| **Provide an existing SRT (+ TXT if any)** | Captions already exist from a prior tool or vendor. Place/copy into `work/captions/srt/` (and `txt/` if present) and continue. |
| **ElevenLabs via academind-tools** | `~/development/projects/academind-tools` exists and `ELEVENLABS_API_KEY` is configured; user accepts cloud STT. |
| **Another STT they name** | Only if they specify it — do not invent a stack. |

Do **not** auto-fall-through to ElevenLabs or any other tool without the user choosing.

After the user picks, record that choice for the job and keep using the same source captions through the cut-SRT loop.

## Local `stt` (preferred when available)

### Command

```bash
SK=.agents/skills/video-editing   # or this skill’s install path
STEM=SOURCE_STEM                   # e.g. agent-skills-1
SRC="/ABS/PATH/${STEM}.mp4"

mkdir -p work/captions/srt work/captions/txt work/captions/_raw

# skill defaults; optional: append shoot-specific lines to work/captions/terms.txt first
TERMS="$SK/assets/terms.txt"
if [[ -f work/captions/terms.txt ]]; then
  TERMS=work/captions/terms.txt
else
  cp "$SK/assets/terms.txt" work/captions/terms.txt
  TERMS=work/captions/terms.txt
fi

stt "$SRC" \
  -o work/captions/_raw \
  --terms "$TERMS" \
  --overwrite

# normalize to the layout the rest of this skill expects
cp "work/captions/_raw/${STEM}.srt" "work/captions/srt/${STEM}.srt"
cp "work/captions/_raw/${STEM}.txt" "work/captions/txt/${STEM}.txt"
# optional keep: vtt / words.json under work/captions/_raw or work/captions/extra/
```

Notes:

- `stt` writes flat `<stem>.srt|.txt|.vtt|.words.json` into `-o`; this skill’s scripts expect `work/captions/srt/` + `work/captions/txt/`.
- Prefer **SRT + TXT** for the edit loop.
- Long videos: first model load can take minutes; stderr shows phases (`resolving models…`, `transcribing + aligning…`, …).
- Regenerate only with intent (and `--overwrite`); see iteration policy.

### ElevenLabs (only if user chose it)

```bash
cd ~/development/projects/academind-tools
pnpm --filter @academind/generate-captions cli -- \
  "/ABS/PATH/video.mp4" \
  --formats srt,txt \
  --output "/ABS/PATH/work/captions" \
  --model scribe_v2
```

Add `--force` to regenerate. Output layout is already `work/captions/srt|txt|…`.

## Iteration policy (critical)

**Do not re-caption the clean cut on every edit pass.**

| When | Action |
|---|---|
| Start of job | Caption **source once** → SRT+TXT under `work/captions/` |
| While refining keep-list | Rewrite SRT with `cut_srt.py` / `build_filter.py --srt` |
| Join QA | `extract_joins.py` + energy; optional |
| After final timeline is locked | Ensure a **final .srt** matching deliverable timeline (cut-SRT verified, or one ASR pass **only if needed**) |

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

## On-disk caption locations

```text
work/captions/terms.txt        # optional project terms (seeded from skill assets)
work/captions/_raw/            # optional stt flat outputs
work/captions/srt/NAME.srt     # source SRT (once) — used by parse/cut/build
work/captions/txt/NAME.txt     # source TXT
work/edit/clean-preview.*      # cut-SRT iteration
work/edit/final.srt            # locked timeline captions
deliverables/*.srt             # shipped
```
