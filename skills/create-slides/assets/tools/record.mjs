/*
 * Records the deck as MP4s — 1080p by default, 2K or 4K on request.
 *
 *   node tools/record.mjs                    # 1080p: a clip per slide + full run
 *   node tools/record.mjs --size 1440        # 2K (2560x1440)
 *   node tools/record.mjs --size 2160        # 4K (3840x2160)
 *   node tools/record.mjs --size 1080 --size 2160   # several at once
 *   node tools/record.mjs 5 6 7              # only those slide indices (0-based)
 *   node tools/record.mjs --size 2160 full   # only the run-through, in 4K
 *
 * Each resolution lands in its own folder, e.g. export/video/2160p/.
 *
 * Each per-slide clip starts on the flat background, fades the slide in, plays
 * its entry animation, then walks its reveal steps with a pause on each — so
 * the clip can be dropped straight into an edit as b-roll.
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
  console.log(`Usage: node tools/record.mjs [--size 1080|1440|2160|WxH] [slide-index ...|full]

Without slide indices, records one clip per slide plus a full run-through.
Outputs MP4 files under export/video/<resolution>/. Slide indices are 0-based.`);
  process.exit(0);
}
const sizes = [];
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--size') {
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
}));
await probe.close();

const deckSlug = slug(deck.title) || slug(path.basename(ROOT)) || 'deck';
for (const index of wanted) {
  if (index >= deck.labels.length) throw new Error(`slide index ${index} is out of range (0-${deck.labels.length - 1})`);
}
console.log(`deck: ${deck.labels.length} slides`);

async function newRecordingPage(name, size) {
  const dir = path.join(RAW, `${size.label}-${name}`);
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
  return { ctx, page, dir };
}

function transcode(dir, outFile) {
  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error(`no webm produced in ${dir}`);
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-i', path.join(dir, webm),
      // The first compositor frame is Chrome's white page default; drop it.
      '-ss', '0.10',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', '30', '-fps_mode', 'cfr',
      '-movflags', '+faststart', '-an',
      outFile,
    ],
    { stdio: 'inherit' },
  );
}

/** Park on `slide` with the stage hidden, then fade it in and replay its entry animations. */
async function enterSlide(page, slide, { viaPrevious = false } = {}) {
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
    ([viaPrev]) => {
      const stage = document.querySelector('.stage');
      stage.style.transition = 'none';
      stage.style.opacity = '0';
      document.getElementById('rec-hide')?.remove();
      void stage.offsetWidth; // flush, so the fade starts from 0
      stage.style.transition = 'opacity 380ms cubic-bezier(0.22, 0.9, 0.35, 1)';
      stage.style.opacity = '1';
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
    [viaPrevious],
  );

  if (viaPrevious) {
    await wait(900);
    // Let the hidden-slide override go, so the morph reads as a real handover.
    await page.evaluate(() => document.getElementById('rec-style')?.remove());
    await page.evaluate(() => SlidesRuntime.controller.send('nextSlide'));
  }
}

async function recordSlide(i, size, outDir) {
  const label = slug(deck.labels[i] || '') || `slide-${i + 1}`;
  const name = `${String(i + 1).padStart(2, '0')}-${label}`;
  const { ctx, page, dir } = await newRecordingPage(name, size);

  const viaPrevious = deck.morphTargets.includes(i);
  await enterSlide(page, i, { viaPrevious });
  await wait(AFTER_ENTER);

  for (let s = 0; s < deck.finalSteps[i]; s++) {
    await page.evaluate(() => SlidesRuntime.controller.send('next'));
    await wait(PER_STEP);
  }
  await wait(TAIL);

  await ctx.close();
  const out = path.join(outDir, `${name}.mp4`);
  transcode(dir, out);
  console.log(`  ${name}.mp4  (${deck.finalSteps[i]} step${deck.finalSteps[i] === 1 ? '' : 's'})`);
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
  transcode(dir, out);
  console.log(`  ${fileName}`);
}

for (const size of sizes) {
  const outDir = path.join(VIDEO_ROOT, size.label);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n── ${size.label} (${size.w}x${size.h}) ──`);

  if (!onlyFull) {
    const list = wanted.length ? wanted : deck.labels.map((_, i) => i);
    console.log(`recording ${list.length} slide clip(s)…`);
    for (const i of list) await recordSlide(i, size, outDir);
  }
  if (!wanted.length) {
    console.log('recording full run-through…');
    await recordFull(size, outDir);
  }
  console.log(`→ ${path.relative(ROOT, outDir)}`);
}

await browser.close();
rmSync(RAW, { recursive: true, force: true });
console.log('\ndone');
