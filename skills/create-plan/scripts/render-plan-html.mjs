#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

function usage() {
  console.log(`Render a Markdown implementation plan to self-contained HTML with a hard-coded copy button.

Usage:
  node scripts/render-plan-html.mjs plan.md --out plan.html [--open]

Options:
  --out <path>   Output HTML path. Defaults to replacing .md with .html
  --open         Open the generated HTML file in the system browser
`)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.length === 0) {
  usage()
  process.exit(0)
}

const inputArg = args[0]
if (!inputArg || inputArg.startsWith('-')) {
  console.error('Missing input Markdown path.')
  usage()
  process.exit(1)
}

const outIndex = args.indexOf('--out')
if (outIndex >= 0 && (!args[outIndex + 1] || args[outIndex + 1].startsWith('-'))) {
  console.error('Missing value for --out.')
  usage()
  process.exit(2)
}

const inputPath = resolve(inputArg)
const outputPath = resolve(
  outIndex >= 0
    ? args[outIndex + 1]
    : inputPath.replace(/\.md$/i, '') + '.html',
)
const shouldOpen = args.includes('--open')

let markdown
try {
  markdown = await readFile(inputPath, 'utf8')
} catch (error) {
  const reason = error?.code === 'ENOENT'
    ? `Input Markdown file not found: ${inputPath}`
    : `Failed to read input Markdown file: ${error?.message || error}`
  console.error(reason)
  process.exit(error?.code === 'ENOENT' ? 2 : 1)
}
const renderedBody = renderMarkdown(markdown)
const title = escapeHtml(markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || 'Implementation plan')
const generatedAt = escapeHtml(new Date().toISOString())
const sourcePath = escapeHtml(displaySourcePath(
  await realpath(inputPath),
  await realpath(process.cwd()),
))
const copySource = jsonForScript(markdown)
const nonce = randomBytes(18).toString('base64url')

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, buildHtml({ title, generatedAt, sourcePath, renderedBody, copySource, nonce }), 'utf8')

if (shouldOpen) openHtml(outputPath)
console.log(outputPath)

function renderMarkdown(markdown) {
  const script = `
const input = await new Response(Bun.stdin.stream()).text();
process.stdout.write(Bun.markdown.html(input, {
  headings: { ids: true },
  noHtmlBlocks: true,
  noHtmlSpans: true,
  tagFilter: true,
}));
`
  const result = spawnSync('bun', ['--eval', script], {
    input: markdown,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  if (!result.error && result.status === 0) return result.stdout

  const reason = result.error?.message || result.stderr || `exit ${result.status}`
  console.error(`Warning: Bun markdown rendering unavailable (${reason}). Falling back to escaped plain text.`)
  return `<pre><code>${escapeHtml(markdown)}</code></pre>`
}

function buildHtml({ title, generatedAt, sourcePath, renderedBody, copySource, nonce }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; connect-src 'none'; font-src 'none'; frame-src 'none'; frame-ancestors 'none'; img-src 'none'; manifest-src 'none'; media-src 'none'; object-src 'none'; script-src 'nonce-${nonce}'; script-src-attr 'none'; style-src 'unsafe-inline'; form-action 'none'; worker-src 'none'">
<title>${title}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; background: #f6f7f9; color: #1f2937; }
main { max-width: 920px; margin: 48px auto; padding: 48px 56px; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08); }
.header-meta { margin: -18px 0 34px; color: #6b7280; font-size: 13px; }
.copy-button-wrap { position: fixed; top: 16px; right: 16px; z-index: 99999; }
.copy-button { border: 1px solid #d1d5db; border-radius: 999px; padding: 9px 14px; background: #fff; color: #111827; font: 600 13px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14); cursor: pointer; }
.copy-button:hover { background: #f9fafb; }
.copy-button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.copy-button[data-state="copied"] { background: #ecfdf5; border-color: #10b981; color: #065f46; }
.copy-button[data-state="error"] { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
h1, h2, h3, h4 { line-height: 1.25; color: #111827; }
h1 { margin-top: 0; font-size: 2.2rem; }
h2 { margin-top: 2.2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
h3 { margin-top: 1.7rem; }
a { color: #2563eb; }
code { padding: 0.15em 0.35em; border-radius: 0.35em; background: #f3f4f6; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
pre { overflow-x: auto; padding: 18px; border-radius: 12px; background: #111827; color: #f9fafb; }
pre code { padding: 0; background: transparent; color: inherit; }
blockquote { margin-left: 0; padding-left: 1rem; color: #4b5563; border-left: 4px solid #d1d5db; }
table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
th, td { border: 1px solid #d1d5db; padding: 8px 10px; }
th { background: #f3f4f6; }
li + li { margin-top: 0.25rem; }
input[type="checkbox"] { margin-right: 0.45rem; }
@media (prefers-color-scheme: dark) {
  body { background: #0b1020; color: #d1d5db; }
  main { background: #111827; border-color: #253044; box-shadow: none; }
  h1, h2, h3, h4 { color: #f9fafb; }
  h2 { border-top-color: #253044; }
  .header-meta { color: #9ca3af; }
  .copy-button { background: #111827; border-color: #374151; color: #f9fafb; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
  .copy-button:hover { background: #1f2937; }
  .copy-button[data-state="copied"] { background: #052e24; border-color: #10b981; color: #a7f3d0; }
  .copy-button[data-state="error"] { background: #450a0a; border-color: #ef4444; color: #fecaca; }
  code { background: #1f2937; }
  pre { background: #030712; }
  blockquote { color: #9ca3af; border-left-color: #4b5563; }
  th, td { border-color: #374151; }
  th { background: #1f2937; }
  a { color: #60a5fa; }
}
@media print { body { background: white; } main { box-shadow: none; border: 0; margin: 0; padding: 0; max-width: none; } .copy-button-wrap { display: none; } }
</style>
</head>
<body>
<div class="copy-button-wrap"><button class="copy-button" type="button" data-copy-response>Copy plan</button></div>
<main>
<div class="header-meta">Source: ${sourcePath}<br>Rendered: ${generatedAt}</div>
${renderedBody}
</main>
<script nonce="${nonce}">
(() => {
  const source = ${copySource};
  const button = document.querySelector('[data-copy-response]');
  if (!button) return;

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok) throw new Error('Copy command failed');
  }

  button.addEventListener('click', async () => {
    const original = button.textContent;
    try {
      await copyText(source);
      button.dataset.state = 'copied';
      button.textContent = 'Copied';
    } catch (error) {
      button.dataset.state = 'error';
      button.textContent = 'Copy failed';
      console.error(error);
    }
    window.setTimeout(() => {
      button.dataset.state = '';
      button.textContent = original;
    }, 1600);
  });
})();
</script>
</body>
</html>
`
}

function openHtml(path) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', path] : [path]
  const result = spawnSync(command, args, { stdio: 'ignore', detached: true })
  if (result.error) throw new Error(`Rendered HTML, but failed to open it: ${result.error.message}`)
}

function displaySourcePath(path, cwd) {
  const fromCwd = relative(cwd, path)
  const outsideCwd = fromCwd === '..' || fromCwd.startsWith(`..${sep}`) || isAbsolute(fromCwd)
  return outsideCwd ? basename(path) : fromCwd
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
