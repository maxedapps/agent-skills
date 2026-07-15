import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validator = fileURLToPath(new URL('./validate-skill-links.mjs', import.meta.url));

function runValidator(...paths) {
  return spawnSync(process.execPath, [validator, ...paths], { encoding: 'utf8' });
}

async function withTempDir(run) {
  const root = await mkdtemp(join(tmpdir(), 'validate-skill-links-'));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('ignores links in multiline code spans and indented code while checking adjacent links', async () => {
  await withTempDir(async (root) => {
    await writeFile(join(root, 'target.md'), '# Target\n', 'utf8');
    await writeFile(
      join(root, 'source.md'),
      [
        '`multiline code span',
        '[ignored span link](missing-span.md)',
        'closes here`',
        '',
        '    [ignored space-indented link](missing-space-indented.md)',
        '\t[ignored tab-indented link](missing-tab-indented.md)',
        '',
        '- List item',
        '    [broken nested-list link](missing-nested.md)',
        '      [ignored code inside list](missing-list-code.md)',
        '',
        '  - Indented list item',
        '      [broken indented-list link](missing-indented-list.md)',
        '',
        '[valid link](target.md)',
        '[broken link](missing-real.md)',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = runValidator(join(root, 'source.md'));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing-real\.md/);
    assert.doesNotMatch(result.stderr, /missing-span\.md/);
    assert.doesNotMatch(result.stderr, /missing-space-indented\.md/);
    assert.doesNotMatch(result.stderr, /missing-tab-indented\.md/);
    assert.doesNotMatch(result.stderr, /missing-list-code\.md/);
    assert.match(result.stderr, /missing-nested\.md/);
    assert.match(result.stderr, /missing-indented-list\.md/);
    assert.match(result.stderr, /Checked 4 local Markdown links/);
  });
});

test('handles list-shaped code, container-relative fences, and paragraph code-span boundaries', async () => {
  await withTempDir(async (root) => {
    await writeFile(
      join(root, 'source.md'),
      [
        '    - [ignored top-level list-shaped code](missing-top-list-code.md)',
        '',
        '- Item',
        '      - [ignored code inside list](missing-list-shaped-code.md)',
        '    ```md',
        '    [ignored nested fence link](missing-nested-fence.md)',
        '    ```',
        '    [broken list continuation](missing-list-continuation.md)',
        '',
        '`unmatched paragraph opener',
        '',
        '[broken across paragraph boundary](missing-across-paragraph.md)',
        '',
        'closing `',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = runValidator(join(root, 'source.md'));
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /missing-top-list-code\.md/);
    assert.doesNotMatch(result.stderr, /missing-list-shaped-code\.md/);
    assert.doesNotMatch(result.stderr, /missing-nested-fence\.md/);
    assert.match(result.stderr, /missing-list-continuation\.md/);
    assert.match(result.stderr, /missing-across-paragraph\.md/);
    assert.match(result.stderr, /Checked 2 local Markdown links/);
  });
});

test('does not pair code spans across nonblank interrupting block boundaries', async () => {
  await withTempDir(async (root) => {
    const cases = [
      ['heading.md', '# [broken heading link](missing-heading.md)', 'missing-heading.md'],
      ['list.md', '- [broken list link](missing-list.md)', 'missing-list.md'],
      ['quote.md', '> [broken quote link](missing-quote.md)', 'missing-quote.md'],
      ['html-block.md', '<div>[broken HTML-block link](missing-html-block.md)</div>', 'missing-html-block.md'],
    ];

    for (const [filename, blockLine, missingTarget] of cases) {
      const source = join(root, filename);
      await writeFile(
        source,
        ['`unmatched paragraph opener', blockLine, 'closing `', ''].join('\n'),
        'utf8',
      );
      const result = runValidator(source);
      assert.equal(result.status, 1, `${filename}: ${result.stderr}`);
      assert.match(result.stderr, new RegExp(missingTarget.replace('.', '\\.')));
      assert.match(result.stderr, /Checked 1 local Markdown link in 1 Markdown file/);
    }
  });
});

test('allows multiline code spans across noninterrupting inline HTML and ordered continuation text', async () => {
  await withTempDir(async (root) => {
    const cases = [
      ['inline-html.md', '<span>[ignored inline-HTML link](missing-inline-html.md)</span>'],
      ['ordered-continuation.md', '2. [ignored ordered continuation](missing-ordered-continuation.md)'],
      ['definition-continuation.md', '[ignored-label]: missing-definition.md'],
    ];

    for (const [filename, middleLine] of cases) {
      const source = join(root, filename);
      await writeFile(
        source,
        ['`multiline code span', middleLine, 'closes here`', ''].join('\n'),
        'utf8',
      );
      const result = runValidator(source);
      assert.equal(result.status, 0, `${filename}: ${result.stderr}`);
      assert.doesNotMatch(result.stdout, /missing-/);
      assert.match(result.stdout, /Checked 0 local Markdown links in 1 Markdown file/);
    }
  });
});

test('matches exact multiline backtick delimiters and leaves unmatched backticks literal', async () => {
  await withTempDir(async (root) => {
    await writeFile(
      join(root, 'source.md'),
      [
        '``multiline code with `inner` backticks',
        '[ignored exact-delimiter link](missing-exact.md)',
        'closes here``',
        '',
        'An unmatched ` backtick is literal.',
        '[broken after unmatched backtick](missing-after-unmatched.md)',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = runValidator(join(root, 'source.md'));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing-after-unmatched\.md/);
    assert.doesNotMatch(result.stderr, /missing-exact\.md/);
    assert.match(result.stderr, /Checked 1 local Markdown link in 1 Markdown file/);
  });
});
