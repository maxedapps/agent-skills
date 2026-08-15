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

const COMPLETE_PATH = /^(?!\/)(?!\.\/)(?!~)[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

function allMatches(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function headingTexts(html) {
  return allMatches(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/g).map((inner) =>
    inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
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

test('critical points use native details/summary cards', () => {
  const card = first(
    html,
    /<details class="hot" id="hot-[^"]+">([\s\S]*?)<\/details>/,
    'details.hot#hot-<slug>'
  );
  assert.match(card, /^\s*<summary>/);
  assert.match(card, /<span class="badge b-hot">/);
  assert.match(card, /<b>\{\{Critical point\}\}<\/b>/);
  assert.match(card, /<span class="why">/);
  assert.match(card, /<div class="hot-body">/);
  for (const heading of ['Failure if wrong', 'Protected by', 'Files involved', 'Key code']) {
    assert.match(card, new RegExp(`<h4>${heading}</h4>`));
  }
});

test('Critical points heading follows Big picture immediately', () => {
  const headings = headingTexts(html);
  const bigPicture = headings.findIndex((text) => /big picture/i.test(text));
  const criticalPoints = headings.findIndex((text) => /^Critical points\b/.test(text));
  assert.notEqual(bigPicture, -1, 'Big picture heading');
  assert.notEqual(criticalPoints, -1, 'Critical points heading');
  assert.equal(criticalPoints, bigPicture + 1);
  assert.ok(
    headings.findIndex((text) => /^Critical findings\b/.test(text)) > criticalPoints,
    'Critical findings stay distinct and later'
  );
});

test('path elements expose complete repository-root-relative POSIX paths', () => {
  const paths = attributeValues(html, 'data-path');
  assert.ok(paths.length > 0, 'expected [data-path] elements');
  assert.ok(paths.includes('README.md'), 'root files such as README.md are valid');
  for (const value of paths) {
    assert.match(value, COMPLETE_PATH, value);
    if (value.includes('/')) {
      assert.ok(value.split('/').length >= 2, value);
    }
  }
});

test('canonical snippet slots are nested, uniquely keyed, and within the five-snippet budget', () => {
  const card = first(
    html,
    /<details class="hot" id="hot-[^"]+">([\s\S]*?)<\/details>/,
    'critical-point card'
  );
  assert.match(card, /<div class="hot-body">[\s\S]*<pre class="hl" data-code-key="/);

  const keys = attributeValues(html, 'data-code-key');
  assert.ok(keys.length > 0, 'expected data-code-key slots');
  assert.equal(new Set(keys).size, keys.length, 'data-code-key values must be unique');

  const snippets = html.match(/<pre class="hl\b[^"]*"/g) ?? [];
  assert.ok(snippets.length <= 5, `pre.hl count is ${snippets.length}`);
});

test('every data-pop and data-goto target resolves', () => {
  const pops = attributeValues(html, 'data-pop');
  const gotos = attributeValues(html, 'data-goto');
  assert.ok(pops.includes('pop-files'));
  assert.ok(gotos.includes('#hot-example'));

  for (const id of pops) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const target of gotos) {
    assert.match(target, /^#[A-Za-z][\w:-]*$/);
    assert.match(html, new RegExp(`id="${target.slice(1)}"`), target);
  }
});

test('pop-files inventory lists complete path, status, delta, and role', () => {
  const dialog = first(html, /<dialog id="pop-files">([\s\S]*?)<\/dialog>/, '#pop-files');
  assert.match(
    dialog,
    /<th>Path<\/th>\s*<th>Status<\/th>\s*<th>Delta<\/th>\s*<th>Role<\/th>/
  );
  assert.match(dialog, /data-path="README.md"/);
});

test('inline JavaScript is present and parseable', () => {
  const scripts = allMatches(html, /<script>([\s\S]*?)<\/script>/g);
  assert.ok(scripts.length > 0, 'expected an inline script');
  for (const source of scripts) {
    assert.doesNotThrow(() => new Function(source));
    assert.match(source, /closest\("details"\)/);
  }
});
