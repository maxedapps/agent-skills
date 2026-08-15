import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templatePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'report-template.html'
);

function allMatches(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function attributeValues(html, name) {
  return allMatches(html, new RegExp(`\\b${name}="([^"]*)"`, 'g'));
}

function first(html, pattern, label) {
  const match = html.match(pattern);
  assert.ok(match, `expected ${label}`);
  return match[1] ?? match[0];
}

const html = await readFile(templatePath, 'utf8');

test('offline CSP and subresource safety reject remote loads', () => {
  const csp = first(
    html,
    /<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i,
    'strict offline CSP meta'
  );
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /style-src 'unsafe-inline'/);
  assert.match(csp, /script-src 'unsafe-inline'/);
  assert.match(csp, /img-src data:/);

  assert.doesNotMatch(html, /<link\b[^>]*rel=["']stylesheet["']/i);
  assert.doesNotMatch(html, /<(iframe|frame|form)\b/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/);

  for (const src of attributeValues(html, 'src')) {
    assert.match(src, /^data:/, src);
  }

  for (const href of attributeValues(html, 'href')) {
    if (href.startsWith('#')) continue;
    assert.match(href, /^https:/, href);
    assert.match(html, new RegExp(`<a\\b[^>]*href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }
});

test('links reject javascript: and other unsafe schemes', () => {
  assert.doesNotMatch(html, /javascript:/i);
  for (const href of attributeValues(html, 'href')) {
    assert.doesNotMatch(href, /^(javascript|data|vbscript):/i);
  }
});

test('inline JavaScript is parseable and event handlers stay in script', () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);

  const scripts = allMatches(html, /<script\b[^>]*>([\s\S]*?)<\/script>/g);
  assert.ok(scripts.length > 0, 'expected optional enhancement script');
  for (const source of scripts) {
    assert.doesNotThrow(() => new Function(source));
  }
  assert.match(scripts.join('\n'), /\.focus\s*\(/);
});

test('IDs are unique and every dialog, jump, and fragment target resolves', () => {
  const ids = attributeValues(html, 'id');
  assert.ok(ids.length > 0, 'expected id targets');
  assert.equal(new Set(ids).size, ids.length, 'id values must be unique');

  const idSet = new Set(ids);
  const pops = attributeValues(html, 'data-pop');
  const gotos = attributeValues(html, 'data-goto');
  const fragments = attributeValues(html, 'href').filter((href) => href.startsWith('#'));

  assert.ok(pops.length > 0, 'expected data-pop dialog hooks');
  assert.ok(gotos.length > 0, 'expected data-goto jumps');
  assert.ok(fragments.length > 0, 'expected fragment links');

  for (const id of pops) {
    assert.ok(idSet.has(id), id);
  }
  for (const target of gotos) {
    assert.match(target, /^#[A-Za-z][\w:-]*$/);
    assert.ok(idSet.has(target.slice(1)), target);
  }
  for (const href of fragments) {
    assert.ok(idSet.has(href.slice(1)), href);
  }
});

test('dialogs expose an accessible name and a labelled close control', () => {
  const dialogs = [...html.matchAll(/<dialog\b([^>]*)>([\s\S]*?)<\/dialog>/g)];
  assert.ok(dialogs.length > 0, 'expected at least one dialog');
  for (const [, attrs, body] of dialogs) {
    assert.match(attrs, /(?:aria-labelledby|aria-label)="/);
    assert.match(body, /\bdata-close\b/);
    assert.match(body, /aria-label="[^"]*[Cc]lose[^"]*"/);
  }
});

test('template keeps light/dark, reduced-motion, wrap, print, and no-JS nav safeguards', () => {
  assert.match(html, /prefers-color-scheme:\s*dark/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /:focus-visible/);
  assert.match(html, /overflow-wrap:\s*(anywhere|break-word)/);
  assert.match(html, /@media \(max-width:\s*320px\)/);
  assert.match(html, /overflow-x:\s*auto/);

  const style = first(html, /<style>([\s\S]*?)<\/style>/, 'inline style');
  const printAt = style.indexOf('@media print');
  assert.notEqual(printAt, -1, '@media print');
  const printBlock = style.slice(printAt, printAt + 1200);
  assert.match(printBlock, /dialog/);
  assert.match(printBlock, /details/);

  assert.match(html, /<header\b/);
  assert.match(html, /<nav\b[^>]*>[\s\S]*<a\s+href="#[^"]+"/);
  assert.match(html, /<main\b/);
  assert.match(html, /<footer\b/);
});

test('template stays a generic report, not a changes-report fork', () => {
  assert.match(html, /independently adapted from create-changes-report/i);
  assert.doesNotMatch(html, /<details class="hot"/);
  assert.doesNotMatch(html, /\bdata-path=/);
  assert.doesNotMatch(html, /\bdata-code-key=/);
  assert.doesNotMatch(html, /line delta/i);

  const tiles = html.match(/class="tile\b/g) ?? [];
  assert.ok(tiles.length >= 1 && tiles.length <= 6, `tile count is ${tiles.length}`);
});
