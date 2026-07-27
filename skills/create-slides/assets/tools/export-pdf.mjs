/*
 * Exports the deck to a PDF, one slide per landscape 16:9 page.
 *
 *   node tools/export-pdf.mjs
 *
 * Reads index.html straight off disk, so no dev server is needed. The print
 * stylesheet in slides.css forces every stepped and animated node into its
 * finished state.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'export');

if (process.argv.includes('--help')) {
  console.log('Usage: node tools/export-pdf.mjs\n\nWrites export/<deck-title>.pdf from index.html.');
  process.exit(0);
}

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

// The deck's own aspect ratio, at 1x CSS pixels.
const WIDTH = 1440;
const HEIGHT = 810;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const slides = await page.evaluate(() => document.querySelectorAll('.slide').length);
const deckName = slug(await page.title()) || slug(path.basename(ROOT)) || 'deck';
const out = path.join(OUT_DIR, `${deckName}.pdf`);

await page.pdf({
  path: out,
  width: `${WIDTH}px`,
  height: `${HEIGHT}px`,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: false,
});

await browser.close();
console.log(`PDF written: ${path.relative(ROOT, out)} (${slides} slides)`);
