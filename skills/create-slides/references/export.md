# Export

A deck exports to a vector PDF and to MP4 clips at any resolution. Both run off
`index.html` on disk — no dev server.

Contents: [PDF](#pdf) · [Video](#video) · [The capture encoder](#the-capture-encoder) ·
[Traps](#traps) · [Auditing](#auditing)

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

Run it after every recording. Three separate capture bugs in this pipeline's
history were invisible on casual playback and obvious in the audit — and one of
them was only visible on a contact sheet, not in any aggregate number. Treat a
numeric heuristic as a pointer to look, not as the verdict.
