# Export

A deck exports to a vector PDF and to MP4 clips at any resolution. Both run off
`index.html` on disk — no dev server.

Contents: [PDF](#pdf) · [Video](#video) · [Timing reveals to narration](#timing-reveals-to-narration) ·
[The capture encoder](#the-capture-encoder) · [Traps](#traps) · [Auditing](#auditing)

## PDF

```sh
npm run pdf     # export/<deck>.pdf, one slide per landscape page
```

Vector text with embedded fonts, page box matching the deck's aspect ratio.
The `@media print` block in core does the work: slides stop being absolutely
stacked and flow one per page, and every stepped or animated node is forced to
its finished state.

Two things that must stay in that block:

- `background-attachment: fixed` is **not painted in paged media**. Any texture
  relying on it needs a `scroll` override or it silently disappears from the PDF.
- Every reveal needs an explicit "finished" override — word spans, marker
  highlights at `background-size: 100%`, parked morph titles, auto-play nodes.

## Video

```sh
npm run record            # 1080p: one clip per slide + a full run-through
npm run record:2k         # 2560x1440
npm run record:4k         # 3840x2160
node tools/record.mjs 5 7 # only those slide indices
node tools/record.mjs full
```

Per-slide clips are built for editing: each starts on the flat background,
fades the slide in, plays its entry animation, then walks its reveal steps with
a hold on each. Delivery is H.264, constant 30 fps, no audio track.

Pacing constants sit at the top of `record.mjs` (`AFTER_ENTER`, `PER_STEP`,
`TAIL`). A slide whose content is entirely stepped opens on an empty framed
slide — that is deliberate, it gives an in-point to cut on.

## Timing reveals to narration

When the deck is b-roll for a recorded voiceover, each reveal can be pinned to a
moment in the narration instead of the fixed pacing above. **Timings live in a
sidecar file, never in the markup** — one deck usually backs several videos, and
a timestamp only means something inside one of them.

`timings/03-the-agentic-loop.json`:

```json
{
  "video": "03-the-agentic-loop",
  "captions": "…/03-the-agentic-loop.srt",
  "slides": [
    { "slide": "one-lap", "note": "the four legs, as he narrates them",
      "in": "2:08.6", "cues": ["2:09.0", "2:12.5", "2:15.4", "2:18.0", "2:31.5"] }
  ]
}
```

| Field | Meaning |
|---|---|
| `video` | names the output folder: `export/video/<video>/<resolution>/` |
| `slide` | the target slide's `data-slide` attribute — the only export metadata in the deck |
| `in` | when the slide cuts in; the clip's first frame |
| `cues` | one time per reveal step, positional: `cues[0]` is step 1 |
| `out` | optional; defaults to the **next** slide's `in` |
| `note` | optional, echoed by `--plan` |

Times take any of `77.8`, `1:17.8`, `0:01:17.8`, `00:01:17,800`, so they can be
copied straight out of an `.srt`.

```sh
node tools/record.mjs --timing timings/03-the-agentic-loop.json --plan   # validate
node tools/record.mjs --timing timings/03-the-agentic-loop.json          # record
```

`--plan` resolves and validates the whole file without recording; out-of-order
cues, unknown slugs, and too many cues for a slide's step count all fail there,
naming the entry. Each run also writes `timings.json` beside the clips, saying
where every clip belongs and the offset of each reveal inside it.

**Timing is per step, not per element.** Everything sharing a `data-enter` value
reveals together; the `--stagger` cascade inside that group is cosmetic. To time
two elements independently, give them different `data-enter` numbers.

Two things would otherwise wreck the accuracy, and both are handled:

1. **Step latency.** Steps are queued *inside the page* against the clock that
   starts the slide, not driven one round-trip at a time from Node.
2. **Capture drift.** Playwright's recorder is not frame-accurate against wall
   clock — it pads still stretches with duplicate frames and falls behind on busy
   ones, drifting a few percent either way. A timed clip therefore brackets
   itself with two markers it can find again in the capture (the stage fading in
   at `in`, snapping away at `out`) and stretches that pair onto the declared
   duration. The correction factor is printed per clip.

Measured on a real deck: reveals land within one frame (33 ms) of their cue over
a 29-second clip. Do not "simplify" either mechanism away — a first attempt that
drove steps from Node and trimmed by wall clock drifted ~4% early.

`npm run audit` checks a timed export against its own `timings.json`. To verify
one *individual* reveal, measure the region it occupies:

```sh
ffmpeg -v error -i clip.mp4 -vf "crop=W:H:X:Y,signalstats,metadata=print:file=-" \
  -an -f null - | grep -E 'pts_time|YAVG'
```

The reveal starts where that region's `YAVG` begins to climb. Two traps: a crop
that catches the frame border or any always-visible element reads the stage
fade-in at 0.0s instead, and a cue marks when the *step* fires — an element
several units into a `--stagger` cascade legitimately appears later.

## The capture encoder

**This is the part that is not obvious and must not be undone.**

Playwright's recorder hard-codes its ffmpeg invocation:

```
-r 25  -c:v vp8  -qmin 0 -qmax 50 -crf 8  -deadline realtime -speed 8
-b:v 1M  -threads 1  -vf pad=W:H:0:0:gray,crop=W:H
```

One megabit at *any* resolution, 25 fps, and grey padding. On a dark deck at
1440p and above the near-neutral background loses its tint entirely — measured
`srgb(47,47,47)` against a true `srgb(43,46,51)` — and drifts frame to frame.
None of it is reachable through the API.

`installEncoderShim()` in `record.mjs` fixes it: Playwright resolves its
encoder through `PLAYWRIGHT_BROWSERS_PATH`, so the script writes a minimal
tree whose "ffmpeg" is a wrapper script that rewrites those arguments to a
lossless 4:4:4 H.264 intermediate at 30 fps, with padding in the deck's own
`--color-bg`, and forwards to the **system** ffmpeg. Playwright's bundled
build is VP8-only, so it cannot be used for this.

Verified end to end: background comes out at exactly the CSS value, through the
final CRF-18 delivery transcode.

Requires `ffmpeg` on `PATH` for the final MP4 transcode. The high-quality
capture wrapper is a POSIX shell script, so Windows uses Playwright's encoder;
keep Windows capture at 1080p.

## Traps

**The recording starts before your script runs.** Capture begins when the
browser context is created — before navigation. Whatever paints during page
load lands at the head of the clip, which showed up as the cover slide leaking
into unrelated clips. Hide the stage from the first paint with
`page.addInitScript`, and reveal it explicitly when the shot starts.

**Every code path must undo that hide.** The run-through does not go through
the per-slide reveal helper, so it recorded eighty seconds of blank stage. Its
0.29 MB file size was the only symptom.

**The first compositor frame is white.** Chrome's `--default-background-color`
does *not* fix it. Trim it in the transcode (`-ss 0.10`), which is inside the
lead-in anyway.

**Restarting entry animations can flash the finished slide.** See
[motion.md](motion.md) — filter to `CSSAnimation`.

## Auditing

```sh
npm run audit               # newest folder under export/video
```

Per clip: the background patch must equal `--color-bg`; no white or grey frames
at the head; no file far smaller than its siblings (a blank recording); plus
dimensions, real frame rate and duration. Contact sheets of the first second
are written beside the clips.

When the folder holds a `timings.json` — a narration-timed export — each clip is
also held to what it declared: its duration must match the `in`→`out` span
(within two frames), and it must contain at least as many visible changes as the
slide has steps. The first catches a capture correction that did not take, which
puts *every* reveal inside the clip out of place; the second catches a step that
never fired. Both are cheap and both have been shown to fire on deliberately
broken clips.

Run it after every recording. Three separate capture bugs in this pipeline's
history were invisible on casual playback and obvious in the audit — and one of
them was only visible on a contact sheet, not in any aggregate number. Treat a
numeric heuristic as a pointer to look, not as the verdict.
