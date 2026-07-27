/*
 * Audits exported clips. Run after every recording — three separate capture
 * bugs in this pipeline's history were invisible on a casual playback and
 * obvious here.
 *
 *   node tools/audit-video.mjs                 # newest folder in export/video
 *   node tools/audit-video.mjs export/video/1440p
 *
 * Per clip:
 *   background   a flat corner patch must equal the deck's --color-bg.
 *                Drift or a collapse to neutral grey means the capture encoder
 *                is quantising the background (see references/export.md).
 *   head frames  no white or grey frames at the head — those are the browser's
 *                pre-paint surface or ffmpeg's padding colour leaking in.
 *   blank clip   a file far smaller than its siblings is usually a clip that
 *                recorded an empty stage.
 *   spec         dimensions, real frame rate, duration.
 *
 * Contact sheets of the first second are written next to the clips as
 * <name>.sheet.png so a ghost frame can be seen rather than inferred.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync, statSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log(`Usage: node tools/audit-video.mjs [video-directory]

Audits MP4 clips in the given directory, or the newest export/video subdirectory.`);
  process.exit(0);
}

const ROOT = process.cwd();

function deckBackground() {
  const stack = [ROOT];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'export' || e.name === 'dist') continue;
      const p = path.join(cur, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!e.name.endsWith('.css')) continue;
      const m = /--color-bg:\s*#([0-9a-fA-F]{6})/.exec(readFileSync(p, 'utf8'));
      if (m) {
        const h = m[1];
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      }
    }
  }
  return null;
}

function dir() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  const base = path.join(ROOT, 'export', 'video');
  if (!existsSync(base)) throw new Error('no export/video — record something first');
  const subs = readdirSync(base).filter((d) => statSync(path.join(base, d)).isDirectory());
  if (!subs.length) return base;
  return path.join(base, subs.sort((a, b) => statSync(path.join(base, b)).mtimeMs - statSync(path.join(base, a)).mtimeMs)[0]);
}

/** Mean colour of a crop, one pixel per frame. */
function scan(file, crop, pix = 'rgb24') {
  const out = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', `${crop},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', pix, '-'],
    { maxBuffer: 1 << 28 },
  );
  const step = pix === 'rgb24' ? 3 : 1;
  const px = [];
  for (let i = 0; i + step <= out.length; i += step) px.push([...out.slice(i, i + step)]);
  return px;
}

const target = dir();
const bg = deckBackground();
const clips = readdirSync(target).filter((f) => f.endsWith('.mp4')).sort();
if (!clips.length) throw new Error(`no mp4s in ${target}`);

console.log(`auditing ${clips.length} clips in ${path.relative(ROOT, target)}`);
console.log(bg ? `deck background: rgb(${bg.join(',')})` : '! no --color-bg found; skipping colour check');

const sizes = clips.map((c) => statSync(path.join(target, c)).size);
const median = [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)];
const problems = [];
const tmp = mkdtempSync(path.join(tmpdir(), 'sheet-'));

for (const [i, clip] of clips.entries()) {
  const file = path.join(target, clip);
  const issues = [];

  const spec = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate',
    '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ], { encoding: 'utf8' }).trim().split('\n');

  // a corner patch that is background on every template
  const px = scan(file, 'crop=iw/32:ih/32:8:8');
  if (bg) {
    const off = px.filter((p) => p.some((v, k) => Math.abs(v - bg[k]) > 4));
    if (off.length) issues.push(`background drifts (e.g. rgb(${off[0].join(',')}))`);
    const neutral = px.filter((p) => p[0] === p[1] && p[1] === p[2]).length;
    if (bg[0] !== bg[2] && neutral > px.length * 0.2) issues.push('background lost its tint (chroma collapse)');
  }
  const head = px.slice(0, 12);
  if (head.some((p) => p.every((v) => v > 200))) issues.push('white frame at the head');

  if (sizes[i] < median * 0.25) issues.push(`only ${(sizes[i] / 1024).toFixed(0)} KB — recorded a blank stage?`);

  console.log(`  ${issues.length ? 'FAIL' : 'ok  '}  ${clip.padEnd(52)} ${spec.join(' ')}`);
  for (const x of issues) console.log(`          ${x}`);
  if (issues.length) problems.push(clip);

  // contact sheet of the first second, for anything the numbers cannot see
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', file,
      '-vf', "select='lt(n,30)*not(mod(n,5))',scale=420:-1,tile=6x1", '-frames:v', '1',
      path.join(target, clip.replace(/\.mp4$/, '.sheet.png'))]);
  } catch { /* sheets are a nicety */ }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${clips.length - problems.length}/${clips.length} clean`);
if (problems.length) {
  console.log('contact sheets written next to the clips — inspect the flagged ones');
  process.exit(1);
}
