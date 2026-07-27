/*
 * Records the deck as MP4s — 1080p by default, 2K or 4K on request.
 *
 *   node tools/record.mjs                    # 1080p: a clip per slide + full run
 *   node tools/record.mjs --size 1440        # 2K (2560x1440)
 *   node tools/record.mjs --size 2160        # 4K (3840x2160)
 *   node tools/record.mjs --size 1080 --size 2160   # several at once
 *   node tools/record.mjs 5 6 7              # only those slide indices (0-based)
 *   node tools/record.mjs --size 2160 full   # only the run-through, in 4K
 *   node tools/record.mjs --timing timings/03-intro.json     # timed to narration
 *   node tools/record.mjs --timing timings/03-intro.json --plan   # schedule only
 *
 * Each resolution lands in its own folder, e.g. export/video/2160p/.
 *
 * Each per-slide clip starts on the flat background, fades the slide in, plays
 * its entry animation, then walks its reveal steps with a pause on each — so
 * the clip can be dropped straight into an edit as b-roll.
 *
 * TIMED CLIPS — see references/export.md. A sidecar file pins every reveal of
 * every slide to a moment in one video's narration:
 *
 *   { "video": "03-intro",
 *     "slides": [ { "slide": "one-lap", "in": "2:08.6",
 *                   "cues": ["2:09.0", "2:12.5", "2:15.4"] } ] }
 *
 * Times are on the SAME clock as that video's caption file; slides are named by
 * their data-slide attribute, so the deck's markup stays free of export data and
 * one deck can back several videos. The clip is trimmed so its first frame IS
 * the cut-in, and the steps are fired from inside the page against one clock, so
 * they land where they were written (within a frame). Without --timing, every
 * slide keeps the fixed pacing below.
 *
 * Capture quality: Playwright hard-codes its recorder to VP8 at 1 Mbps, 25fps,
 * padding with grey — which at 1440p and above collapses the near-neutral
 * background to flat grey and makes it drift frame to frame. Playwright resolves
 * its encoder through PLAYWRIGHT_BROWSERS_PATH, so installEncoderShim() below
 * hands it a wrapper that rewrites those arguments to a lossless 4:4:4 H.264
 * intermediate and forwards to the system ffmpeg. (Playwright's own bundled
 * ffmpeg is VP8-only, so it cannot be used for this.) The intermediate is then
 * transcoded to a delivery H.264 MP4 at a constant 30fps.
 */
import { mkdirSync, rmSync, readdirSync, existsSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const DECK = pathToFileURL(path.join(ROOT, 'index.html')).href;
const VIDEO_ROOT = path.join(ROOT, 'export', 'video');
const RAW = path.join(ROOT, 'export', '.raw');

// Everything in the deck is sized in em off a viewport-relative root, so the
// composition is identical at every one of these — only the pixels change.
const PRESETS = {
  1080: { w: 1920, h: 1080 },
  1440: { w: 2560, h: 1440 },
  2160: { w: 3840, h: 2160 },
};

// Pacing (ms)
const SETTLE = 400; // let the positioned slide finish before we start filming
const AFTER_ENTER = 1600; // entry animation + a beat to read
const PER_STEP = 2400; // hold on each revealed step
const TAIL = 1800; // hold at the end
const FULL_ENTER = 1400;
const FULL_STEP = 2000;

const argv = process.argv.slice(2);
if (argv.includes('--help')) {
  console.log(`Usage: node tools/record.mjs [--size 1080|1440|2160|WxH] [--timing FILE] [--plan]
                            [slide-index ...|full]

Without slide indices, records one clip per slide plus a full run-through.
Outputs MP4 files under export/video/<resolution>/. Slide indices are 0-based.

--timing FILE  time every reveal to one video's narration; clips land in
               export/video/<video>/<resolution>/ (see references/export.md)
--plan         print the schedule and record nothing`);
  process.exit(0);
}
const sizes = [];
const rest = [];
const planOnly = argv.includes('--plan');
let timingFile = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--plan') continue;
  if (argv[i] === '--timing') {
    timingFile = argv[++i];
    if (!timingFile) {
      console.error('--timing needs a path, e.g. --timing timings/03-intro.json');
      process.exit(1);
    }
  } else if (argv[i] === '--size') {
    const v = argv[++i];
    const preset = PRESETS[v];
    const custom = /^(\d+)x(\d+)$/.exec(v || '');
    if (preset) sizes.push({ label: `${v}p`, ...preset });
    else if (custom) sizes.push({ label: `${custom[1]}x${custom[2]}`, w: +custom[1], h: +custom[2] });
    else {
      console.error(`unknown --size "${v}" (use ${Object.keys(PRESETS).join(' | ')} | WxH)`);
      process.exit(1);
    }
  } else rest.push(argv[i]);
}
if (!sizes.length) sizes.push({ label: '1080p', ...PRESETS[1080] });

const onlyFull = rest[0] === 'full';
const wanted = rest.filter((a) => /^\d+$/.test(a)).map(Number);

rmSync(RAW, { recursive: true, force: true });


// --- capture encoder override -------------------------------------------

// Padding colour must match the deck, or a padded edge shows as a grey band.
// Read --color-bg out of whatever stylesheets the deck ships.
function deckBackground() {
  for (const dir of ['.', 'core', 'templates']) {
    const base = path.join(ROOT, dir);
    if (!existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const cur = stack.pop();
      for (const e of readdirSync(cur, { withFileTypes: true })) {
        const p = path.join(cur, e.name);
        if (e.isDirectory()) { stack.push(p); continue; }
        if (!e.name.endsWith('.css')) continue;
        const m = /--color-bg:\s*#([0-9a-fA-F]{6})/.exec(readFileSync(p, 'utf8'));
        if (m) return '0x' + m[1].toLowerCase();
      }
    }
  }
  return '0x000000';
}

const PAD = deckBackground();
const FPS = 30;

function systemFfmpeg() {
  try {
    const locator = process.platform === 'win32' ? 'where' : 'which';
    return execFileSync(locator, ['ffmpeg'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}

/**
 * Builds a minimal PLAYWRIGHT_BROWSERS_PATH tree whose ffmpeg is a wrapper
 * script. Returns the path, or null if we should fall back to Playwright's
 * own (low quality) encoder.
 */
function installEncoderShim() {
  const real = systemFfmpeg();
  if (!real) throw new Error('system ffmpeg is required for MP4 recording; install it and retry');
  const binName = process.platform === 'darwin' ? 'ffmpeg-mac'
    : process.platform === 'win32' ? 'ffmpeg-win64.exe'
    : 'ffmpeg-linux';
  if (process.platform === 'win32') {
    console.warn('!! Windows: the encoder wrapper is a POSIX shell script, so the capture\n!! falls back to Playwright\'s low-quality VP8 encode. See references/export.md.');
    return null;
  }

  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
    : path.join(os.homedir(), '.cache', 'ms-playwright'));
  const revs = existsSync(cache)
    ? readdirSync(cache).filter((d) => d.startsWith('ffmpeg-'))
    : [];
  if (!revs.length) {
    console.warn('! no ffmpeg revision in the Playwright cache — using its default encoder');
    return null;
  }

  const root = path.join(ROOT, 'node_modules', '.cache', 'pw-ffmpeg-hq');
  const script = `#!/bin/bash
# Generated by tools/record.mjs. Playwright calls this instead of its own
# ffmpeg; we swap its fixed "-c:v vp8 -b:v 1M -r 25 ... pad=:gray" encode for a
# lossless 4:4:4 intermediate and forward to the system ffmpeg.
args=(); skip=0
for a in "$@"; do
  if [ $skip -gt 0 ]; then skip=$((skip-1)); continue; fi
  case "$a" in
    -c:v) args+=(-c:v libx264 -preset ultrafast -qp 0 -pix_fmt yuv444p); skip=1 ;;
    -qmin|-qmax|-crf|-deadline|-speed|-b:v|-threads) skip=1 ;;
    -r) args+=(-r ${FPS}); skip=1 ;;
    *gray*) args+=("\${a//gray/${PAD}}") ;;
    *.webm) args+=(-f matroska "$a") ;;
    *) args+=("$a") ;;
  esac
done
exec ${real} "\${args[@]}"
`;
  for (const rev of revs) {
    const dir = path.join(root, rev);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, binName), script);
    chmodSync(path.join(dir, binName), 0o755);
    writeFileSync(path.join(dir, 'INSTALLATION_COMPLETE'), '');
    writeFileSync(path.join(dir, 'DEPENDENCIES_VALIDATED'), '');
  }
  return root;
}

const shimRoot = installEncoderShim();
if (shimRoot) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = shimRoot;
  console.log('capture encoder: lossless 4:4:4 H.264 via system ffmpeg');
}

// Imported after the env var is set, so Playwright resolves the shim.
const { chromium } = await import('playwright');

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

// --- narration timing ----------------------------------------------------

/** "1:17.8" | "00:01:17,800" | "77.8" -> seconds. Throws on anything else. */
function parseTime(value, where) {
  const raw = String(value).trim().replace(',', '.');
  const m = /^(?:(?:(\d+):)?(\d+):)?(\d+(?:\.\d+)?)$/.exec(raw);
  if (!m) throw new Error(`${where}: cannot read the time "${value}" (use s, m:ss.s or h:mm:ss.s)`);
  const [, h, min, sec] = m;
  return (+(h || 0)) * 3600 + (+(min || 0)) * 60 + parseFloat(sec);
}

const showTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

/**
 * Reads a sidecar timing file and turns each entry into an absolute schedule:
 * at[0] is the cut-in, at[n] is when step n reveals, out is when the clip ends.
 * Slides are addressed by their data-slide attribute, so the deck's markup
 * carries no export metadata and one deck can back several videos.
 */
function loadTiming(file) {
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  if (!spec.video) throw new Error(`${file}: "video" is required — it names the output folder`);
  if (!Array.isArray(spec.slides) || !spec.slides.length) {
    throw new Error(`${file}: "slides" must be a non-empty array`);
  }

  const known = new Map();
  deck.slugs.forEach((s, i) => {
    if (!s) return;
    if (known.has(s)) throw new Error(`two slides share data-slide="${s}"`);
    known.set(s, i);
  });

  const entries = spec.slides.map((entry, n) => {
    const where = `${path.basename(file)} slides[${n}]`;
    if (!entry.slide) throw new Error(`${where}: "slide" is required`);
    const index = known.get(entry.slide);
    if (index === undefined) {
      throw new Error(
        `${where}: no slide carries data-slide="${entry.slide}"` +
          (known.size ? ` (deck has: ${[...known.keys()].join(', ')})` : ' — no slide has data-slide yet'),
      );
    }
    if (entry.in === undefined) throw new Error(`${where} (${entry.slide}): "in" is required`);

    const final = deck.finalSteps[index];
    const cues = entry.cues || [];
    if (cues.length > final) {
      throw new Error(`${where} (${entry.slide}): ${cues.length} cues, but the slide has ${final} step(s)`);
    }
    const at = [parseTime(entry.in, `${where} in`)];
    for (let s = 1; s <= final; s++) {
      if (cues[s - 1] === undefined) {
        console.warn(`! ${where} (${entry.slide}): no cue for step ${s} — holding ${PER_STEP}ms after the previous one`);
        at[s] = at[s - 1] + PER_STEP / 1000;
        continue;
      }
      at[s] = parseTime(cues[s - 1], `${where} cues[${s - 1}]`);
      if (at[s] < at[s - 1]) {
        throw new Error(
          `${where} (${entry.slide}): cue ${s} (${cues[s - 1]}) lands before the previous reveal (${showTime(at[s - 1])})`,
        );
      }
    }
    return { index, slug: entry.slide, note: entry.note, out: entry.out, at, final, where };
  });

  // `out` defaults to the next slide's cut-in, so a run of slides only needs
  // its boundaries written once.
  entries.forEach((e, n) => {
    const next = entries[n + 1];
    const out = e.out !== undefined
      ? parseTime(e.out, `${e.where} out`)
      : next
        ? next.at[0]
        : e.at[e.final] + TAIL / 1000;
    if (out < e.at[e.final]) {
      throw new Error(
        `${e.where} (${e.slug}): the clip ends at ${showTime(out)}, before its last reveal (${showTime(e.at[e.final])})` +
          (e.out === undefined ? ' — the next slide cuts in too early' : ''),
      );
    }
    e.plan = { at: e.at, out, duration: out - e.at[0] };
  });

  return { video: spec.video, entries };
}

const browser = await chromium.launch({
  channel: 'chrome',
  // Without this the very first captured frame is Chrome's white page default,
  // which lands as a one-frame white flash at the head of every clip.
  args: [`--default-background-color=${PAD.slice(2)}`],
});

// One throwaway page just to read the deck's structure.
const probe = await browser.newPage();
await probe.goto(DECK, { waitUntil: 'load' });
await probe.evaluate(() => document.fonts.ready);
const deck = await probe.evaluate(() => ({
  title: document.title,
  labels: [...document.querySelectorAll('.slide')].map((s) => s.getAttribute('aria-label')),
  finalSteps: SlidesRuntime.controller.finalSteps,
  morphTargets: [...document.querySelectorAll('.slide')]
    .map((slide, index) => (slide.querySelector('[data-morph-to]') ? index : -1))
    .filter((index) => index > 0),
  // The only export metadata the deck carries: a stable handle per slide, so a
  // timing file can name one without depending on its position.
  slugs: [...document.querySelectorAll('.slide')].map((s) => s.getAttribute('data-slide')),
}));
await probe.close();

const deckSlug = slug(deck.title) || slug(path.basename(ROOT)) || 'deck';
for (const index of wanted) {
  if (index >= deck.labels.length) throw new Error(`slide index ${index} is out of range (0-${deck.labels.length - 1})`);
}
console.log(`deck: ${deck.labels.length} slides`);

let timing = null;
if (timingFile) {
  try {
    timing = loadTiming(timingFile);
  } catch (err) {
    // A bad timing file is an authoring mistake, not a crash — say what is
    // wrong and stop, rather than burying it in a stack trace.
    console.error(`\nerror: ${err.message}`);
    await browser.close();
    process.exit(1);
  }
  console.log(`timing: ${timing.video} — ${timing.entries.length} slide(s)`);
}

if (planOnly) {
  if (timing) {
    for (const e of timing.entries) {
      const legs = e.plan.at
        .slice(1)
        .map((t, k) => `      step ${k + 1}  ${showTime(t)}  (+${(t - e.plan.at[0]).toFixed(1)}s)`)
        .join('\n');
      console.log(
        `${String(e.index + 1).padStart(2, '0')}  ${e.slug}  —  ${deck.labels[e.index]}` +
          (e.note ? `\n      ${e.note}` : '') +
          `\n      in     ${showTime(e.plan.at[0])}\n${legs}\n` +
          `      out    ${showTime(e.plan.out)}  → clip ${e.plan.duration.toFixed(1)}s`,
      );
    }
    const first = timing.entries[0].plan.at[0];
    const last = timing.entries[timing.entries.length - 1].plan.out;
    console.log(`\ncovers ${showTime(first)}–${showTime(last)} of ${timing.video}`);
  } else {
    for (let i = 0; i < deck.labels.length; i++) {
      console.log(
        `${String(i + 1).padStart(2, '0')}  ${deck.labels[i]}\n` +
          `      fixed pacing — ${deck.finalSteps[i]} step(s) @ ${PER_STEP}ms`,
      );
    }
  }
  await browser.close();
  process.exit(0);
}

async function newRecordingPage(name, size) {
  const dir = path.join(RAW, `${size.label}-${name}`);
  // Capture starts with the context, so this is the clip's rough t=0 — used to
  // trim the head of a timed clip back to its cut-in.
  const tCtx = Date.now();
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    recordVideo: { dir, size: { width: size.w, height: size.h } },
  });
  const page = await ctx.newPage();
  // Recording begins with the context, before we can position anything — so
  // the stage must be hidden from the very first paint, or the cover slide
  // leaks into the head of the clip while the page loads.
  await page.addInitScript(() => {
    const hide = () => {
      const s = document.createElement('style');
      s.id = 'rec-hide';
      s.textContent = '.stage{opacity:0 !important}';
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.documentElement) hide();
    else document.addEventListener('readystatechange', hide, { once: true });
  });
  await page.goto(DECK, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, dir, tCtx };
}

const rawFile = (dir) => {
  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error(`no webm produced in ${dir}`);
  return path.join(dir, webm);
};

function transcode(file, outFile, { start = 0.1, end = null, scale = 1 } = {}) {
  const filter = end === null && scale === 1
    ? null
    : `trim=start=${start.toFixed(4)}${end === null ? '' : `:end=${end.toFixed(4)}`},` +
      `setpts=(PTS-STARTPTS)*${scale.toFixed(6)}`;
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-i', file,
      // The first compositor frame is Chrome's white page default; drop it.
      ...(filter ? ['-vf', filter] : ['-ss', start.toFixed(3)]),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', '30', '-fps_mode', 'cfr',
      '-movflags', '+faststart', '-an',
      outFile,
    ],
    { stdio: 'inherit' },
  );
}

// --- capture-clock correction --------------------------------------------
//
// Playwright's recorder is not frame-accurate against wall clock: it pads
// static stretches with duplicated frames and falls behind during busy ones,
// so the captured clip drifts by a few percent either way. A timed clip
// therefore brackets itself with two markers it can find again in the capture
// — the stage fading in at the cut-in, and the stage snapping away at the
// cut-out — and the pair is stretched onto the declared duration.

/** Per-frame average luma of a capture, as [captureSeconds, YAVG] pairs. */
function frameLuma(file) {
  const out = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-an', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const frames = [];
  let t = null;
  for (const line of out.split('\n')) {
    const time = /pts_time:([\d.]+)/.exec(line);
    if (time) { t = +time[1]; continue; }
    const y = /YAVG=([\d.]+)/.exec(line);
    if (y && t !== null) { frames.push([t, +y[1]]); t = null; }
  }
  return frames;
}

/** Capture-clock times of the two markers, or null when they can't be read. */
function findMarkers(frames, eps = 0.02) {
  if (frames.length < 12) return null;
  // The head is the hidden stage: a still, flat background. Skip a few frames
  // first — the very first one can still be the browser's own default paint.
  const head = frames.slice(3, 9).map((f) => f[1]).sort((a, b) => a - b);
  const base = head[Math.floor(head.length / 2)];
  const cut = frames.findIndex((f, i) => i >= 3 && Math.abs(f[1] - base) > eps);
  if (cut < 0) return null;
  let out = -1;
  for (let i = frames.length - 1; i > cut; i--) {
    if (Math.abs(frames[i][1] - frames[i - 1][1]) > eps) { out = i; break; }
  }
  if (out <= cut) return null;
  return { cut: frames[cut][0], out: frames[out][0] };
}

/**
 * Park on `slide` with the stage hidden, then fade it in and replay its entry
 * animations. Returns the wall-clock moment of the cut, i.e. the clip's
 * intended first frame.
 *
 * `timeline` queues the reveal steps (ms from the cut) inside the page against
 * the same clock that starts the fade — no round trip per step, so a cue written
 * at 2:18.0 fires at 2:18.0 rather than drifting a little further out on each
 * step. Its `endMs` snaps the stage away again, marking the cut-out.
 */
async function enterSlide(page, slide, { viaPrevious = false, timeline = null } = {}) {
  await page.evaluate(
    ([target, viaPrev]) => {
      const stage = document.querySelector('.stage');
      stage.style.transition = 'none';
      stage.style.opacity = '0';
      // Hidden slides must not linger through the cut.
      const style = document.createElement('style');
      style.id = 'rec-style';
      style.textContent =
        '.slide:not([data-state="current"]){opacity:0!important;visibility:hidden!important;transition:none!important}';
      document.head.appendChild(style);

      const c = SlidesRuntime.controller;
      const park = viaPrev ? target - 1 : target;
      while (c.getState().slide > park) c.send('prevSlide');
      while (c.getState().slide < park) c.send('nextSlide');
      if (viaPrev) for (let i = 0; i < c.finalSteps[park]; i++) c.send('next');
    },
    [slide, viaPrevious],
  );
  await wait(SETTLE + (viaPrevious ? 600 : 0));

  await page.evaluate(
    ([viaPrev, plan]) => {
      const stage = document.querySelector('.stage');
      stage.style.transition = 'none';
      stage.style.opacity = '0';
      document.getElementById('rec-hide')?.remove();
      void stage.offsetWidth; // flush, so the fade starts from 0
      const cut = performance.now();
      stage.style.transition = 'opacity 380ms cubic-bezier(0.22, 0.9, 0.35, 1)';
      stage.style.opacity = '1';
      if (plan) {
        const c = SlidesRuntime.controller;
        // Every timer is set against `cut`, so a slow step cannot push the ones
        // after it out of place.
        const at = (ms, fn) => setTimeout(fn, Math.max(0, cut + ms - performance.now()));
        plan.steps.forEach((ms) => at(ms, () => c.send('next')));
        at(plan.endMs, () => {
          stage.style.transition = 'none';
          stage.style.opacity = '0';
        });
      }
      if (viaPrev) return;
      // Restart the entry animations so they are inside the shot — keyframe
      // animations ONLY. Restarting a CSSTransition would replay it from its
      // start value: the stepped nodes are mid "revealed -> hidden" transition
      // at this point, so replaying those flashes the slide's fully revealed
      // content on screen and fades it out again.
      const cur = document.querySelector('.slide[data-state="current"]');
      cur.getAnimations({ subtree: true })
        .filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation)
        .forEach((a) => {
          try { a.cancel(); a.play(); } catch {}
        });
    },
    [viaPrevious, timeline],
  );
  const cutAt = Date.now();

  if (viaPrevious) {
    await wait(900);
    // Let the hidden-slide override go, so the morph reads as a real handover.
    await page.evaluate(() => document.getElementById('rec-style')?.remove());
    await page.evaluate(() => SlidesRuntime.controller.send('nextSlide'));
  }
  return cutAt;
}

async function recordSlide(i, size, outDir, plan = null) {
  const label = slug(deck.labels[i] || '') || `slide-${i + 1}`;
  const name = `${String(i + 1).padStart(2, '0')}-${label}`;
  const { ctx, page, dir, tCtx } = await newRecordingPage(name, size);

  const viaPrevious = deck.morphTargets.includes(i);
  const timeline = plan
    ? { steps: plan.at.slice(1).map((t) => (t - plan.at[0]) * 1000), endMs: plan.duration * 1000 }
    : null;
  const cutAt = await enterSlide(page, i, { viaPrevious, timeline });

  if (plan) {
    // The steps run on the page's own timers; here we only hold the recording
    // open past the cut-out, so the closing marker is captured with a few still
    // frames after it.
    await wait(cutAt + plan.duration * 1000 + 700 - Date.now());
  } else {
    await wait(AFTER_ENTER);
    for (let s = 0; s < deck.finalSteps[i]; s++) {
      await page.evaluate(() => SlidesRuntime.controller.send('next'));
      await wait(PER_STEP);
    }
    await wait(TAIL);
  }

  await ctx.close();
  const out = path.join(outDir, `${name}.mp4`);
  const raw = rawFile(dir);

  let how = `${deck.finalSteps[i]} step${deck.finalSteps[i] === 1 ? '' : 's'}`;
  if (!plan) {
    transcode(raw, out);
  } else {
    const markers = findMarkers(frameLuma(raw));
    if (!markers) {
      console.warn(`! ${name}: could not find the timing markers — falling back to the wall clock`);
      transcode(raw, out, { start: Math.max(0.1, (cutAt - tCtx) / 1000) });
    } else {
      const scale = plan.duration / (markers.out - markers.cut);
      transcode(raw, out, { start: markers.cut, end: markers.out, scale });
      how = `timed ${showTime(plan.at[0])}–${showTime(plan.out)}, capture ${(1 / scale).toFixed(3)}x corrected`;
    }
  }
  console.log(`  ${name}.mp4  (${how})`);
  return plan
    ? {
        clip: `${name}.mp4`,
        slide: i + 1,
        label: deck.labels[i],
        in: showTime(plan.at[0]),
        out: showTime(plan.out),
        duration: +plan.duration.toFixed(2),
        steps: plan.at.slice(1).map((t, k) => ({
          step: k + 1,
          cue: showTime(t),
          offset: +(t - plan.at[0]).toFixed(2),
        })),
      }
    : null;
}

async function recordFull(size, outDir) {
  const { ctx, page, dir } = await newRecordingPage('full', size);
  // The run-through does not go through enterSlide, so it has to drop the
  // pre-paint hide itself — otherwise it records a blank stage end to end.
  await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    stage.style.transition = 'none';
    stage.style.opacity = '0';
    document.getElementById('rec-hide')?.remove();
    void stage.offsetWidth;
    stage.style.transition = 'opacity 380ms cubic-bezier(0.22, 0.9, 0.35, 1)';
    stage.style.opacity = '1';
  });
  await wait(700);
  for (let i = 0; i < deck.labels.length; i++) {
    if (i > 0) {
      await page.evaluate(() => SlidesRuntime.controller.send('nextSlide'));
    }
    await wait(FULL_ENTER);
    for (let s = 0; s < deck.finalSteps[i]; s++) {
      await page.evaluate(() => SlidesRuntime.controller.send('next'));
      await wait(FULL_STEP);
    }
    await wait(700);
  }
  await wait(1200);
  await ctx.close();
  const fileName = `${deckSlug}-full.mp4`;
  const out = path.join(outDir, fileName);
  transcode(rawFile(dir), out);
  console.log(`  ${fileName}`);
}

for (const size of sizes) {
  // A timing file belongs to one video, so its clips get their own folder.
  const outDir = timing
    ? path.join(VIDEO_ROOT, timing.video, size.label)
    : path.join(VIDEO_ROOT, size.label);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n── ${size.label} (${size.w}x${size.h}) ──`);

  if (!onlyFull) {
    const list = timing
      ? timing.entries.filter((e) => !wanted.length || wanted.includes(e.index))
      : (wanted.length ? wanted : deck.labels.map((_, i) => i)).map((i) => ({ index: i, plan: null }));
    console.log(`recording ${list.length} slide clip(s)…`);
    const manifest = [];
    for (const e of list) {
      const entry = await recordSlide(e.index, size, outDir, e.plan);
      if (entry) manifest.push(entry);
    }
    // Where every timed clip belongs on the timeline, and when each of its
    // reveals fires — so the edit (or the next agent) can check the result.
    // Merged with what is already there, so re-recording a few slides does not
    // drop the rest.
    if (manifest.length) {
      const file = path.join(outDir, 'timings.json');
      const kept = existsSync(file)
        ? JSON.parse(readFileSync(file, 'utf8')).clips.filter((c) => !manifest.some((m) => m.clip === c.clip))
        : [];
      const clips = [...kept, ...manifest].sort((a, b) => a.slide - b.slide);
      writeFileSync(file, JSON.stringify({ video: timing.video, clips }, null, 2));
      console.log(`  timings.json  (${manifest.length} updated, ${clips.length} total)`);
    }
  }
  // The run-through is a whole-deck artefact; a per-video timing run skips it.
  if (!wanted.length && !timing) {
    console.log('recording full run-through…');
    await recordFull(size, outDir);
  }
  console.log(`→ ${path.relative(ROOT, outDir)}`);
}

await browser.close();
rmSync(RAW, { recursive: true, force: true });
console.log('\ndone');
