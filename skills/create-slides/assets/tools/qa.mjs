/*
 * Browser QA for a deck. Run before calling any deck finished.
 *
 *   node tools/qa.mjs
 *
 * Checks, in a real browser, against index.html on disk:
 *   navigation   every step forward and back, boundary crossings, no wrap
 *   title lock   recurring border/band labels sit at one Y across all slides
 *   composition  each slide body fits its frame and is vertically symmetric
 *   motion       prefers-reduced-motion fully reveals every slide, no blur
 *   responsive   still laid out at a small window
 *   console      no errors or failed requests
 *
 * Exits non-zero on the first failing group, so it can gate a commit.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('Usage: node tools/qa.mjs\n\nRuns browser-based runtime, composition, motion, responsive, and console checks.');
  process.exit(0);
}

const ROOT = process.cwd();
const DECK = pathToFileURL(path.join(ROOT, 'index.html')).href;
const pass = [];
const fail = [];
const note = (ok, label, detail = '') => (ok ? pass : fail).push(`${label}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') {
    if (!m.text().includes('favicon')) errors.push(`${m.type()}: ${m.text()}`);
  }
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`HTTP ${r.status()} ${r.url()}`);
});

await page.goto(DECK, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

// --- navigation ---------------------------------------------------------
const nav = await page.evaluate(() => {
  const c = SlidesRuntime.controller;
  const press = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const total = c.finalSteps.reduce((a, b) => a + b + 1, 0) + 5;
  for (let i = 0; i < total; i++) press('ArrowRight');
  const end = JSON.stringify(c.getState());
  press('ArrowRight');
  const noWrapEnd = JSON.stringify(c.getState()) === end;
  for (let i = 0; i < total; i++) press('ArrowLeft');
  const start = JSON.stringify(c.getState());
  press('ArrowLeft');
  const noWrapStart = JSON.stringify(c.getState()) === start;
  // crossing a boundary backwards must land on the previous slide's final step
  while (c.getState().slide < 1) c.send('nextSlide');
  press('ArrowLeft');
  const back = c.getState();
  return {
    slides: c.finalSteps.length,
    finalSteps: c.finalSteps,
    end: JSON.parse(end),
    start: JSON.parse(start),
    noWrapEnd,
    noWrapStart,
    boundaryOk: back.step === c.finalSteps[back.slide],
  };
});
note(nav.end.slide === nav.slides - 1, 'reaches the last slide');
note(nav.start.slide === 0 && nav.start.step === 0, 'returns to the first slide');
note(nav.noWrapEnd && nav.noWrapStart, 'does not wrap at either end');
note(nav.boundaryOk, 'backward boundary lands on the previous slide’s final step');

// --- composition --------------------------------------------------------
const comp = await page.evaluate(() => {
  const stage = document.querySelector('.stage').getBoundingClientRect();
  const labels = [...document.querySelectorAll('[data-qa-title], .frame__tag, .slide-heading h2')];
  const ys = labels.map((t) => {
    t.classList.add('is-measuring');
    const r = t.getBoundingClientRect();
    t.classList.remove('is-measuring');
    return Math.round((r.top + r.height / 2 - stage.top) * 10) / 10;
  });
  const bodies = [...document.querySelectorAll('.slide-body')].map((b) => {
    const i = b.parentElement.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    return {
      fits: r.height <= i.height + 1,
      symmetric: Math.abs(r.top - i.top - (i.bottom - r.bottom)) < 2,
    };
  });
  return { titleYs: [...new Set(ys)], bodies };
});
note(comp.titleYs.length <= 1, 'recurring titles share one Y', comp.titleYs.join(' / '));
note(comp.bodies.every((b) => b.fits), 'every slide body fits its frame');
note(comp.bodies.every((b) => b.symmetric), 'every slide body is vertically centred');

// --- reduced motion -----------------------------------------------------
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload();
await page.waitForTimeout(300);
const rm = await page.evaluate(() => {
  const c = SlidesRuntime.controller;
  const revealed = [];
  for (let i = 0; i < c.finalSteps.length; i++) {
    while (c.getState().slide < i) c.send('nextSlide');
    for (let s = 0; s < c.finalSteps[i]; s++) c.send('next');
    revealed.push(
      [...document.querySelectorAll('.slide[data-state="current"] [data-enter]')].every(
        (n) => n.dataset.stepState === 'active',
      ),
    );
  }
  const words = [...document.querySelectorAll('.reveal-words .w')];
  return {
    allRevealed: revealed.every(Boolean),
    noBlur: words.every((w) => getComputedStyle(w).filter === 'none'),
    visible: words.every((w) => getComputedStyle(w).opacity === '1'),
  };
});
note(rm.allRevealed, 'reduced motion reveals every slide');
note(rm.noBlur && rm.visible, 'reduced motion drops the blur/scale reveal');
await page.emulateMedia({ reducedMotion: 'no-preference' });

// --- small viewport -----------------------------------------------------
await page.setViewportSize({ width: 900, height: 700 });
await page.reload();
await page.waitForTimeout(400);
const small = await page.evaluate(() =>
  [...document.querySelectorAll('.slide-body')].every(
    (b) => b.getBoundingClientRect().height <= b.parentElement.getBoundingClientRect().height + 1,
  ),
);
note(small, 'still fits at 900x700');

note(errors.length === 0, 'console and network clean', errors.slice(0, 3).join(' | '));

await browser.close();

for (const p of pass) console.log(`  ok    ${p}`);
for (const f of fail) console.log(`  FAIL  ${f}`);
console.log(`\n${pass.length} passed, ${fail.length} failed  (${nav.slides} slides, steps ${nav.finalSteps.join(',')})`);
process.exit(fail.length ? 1 : 0);
