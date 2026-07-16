import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validator = fileURLToPath(new URL('./validate-skill-metadata.mjs', import.meta.url));
const validDescription =
  'Coordinates focused validation for Agent Skills. Use this skill when checking skill metadata before publication. Do not use for unrelated Markdown documents.';

function runValidator(...operands) {
  return spawnSync(process.execPath, [validator, ...operands], { encoding: 'utf8' });
}

async function withTempDir(run) {
  const root = await mkdtemp(join(tmpdir(), 'validate-skill-metadata-'));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeSkill(root, directoryName, frontmatter, body = '# Skill\n') {
  const directory = join(root, directoryName);
  await mkdir(directory, { recursive: true });
  const source = join(directory, 'SKILL.md');
  await writeFile(source, `---\n${frontmatter}\n---\n\n${body}`, 'utf8');
  return source;
}

function plainFrontmatter(name, description = validDescription) {
  return `name: ${name}\ndescription: ${description}`;
}

test('accepts plain metadata and ignores body metavariables, sentinels, and fenced examples', async () => {
  await withTempDir(async (root) => {
    const source = await writeSkill(
      root,
      'plain-skill',
      plainFrontmatter('plain-skill'),
      [
        '# Plain skill',
        '',
        'Write progress to `<plan-slug>`, `<research-slug>`, and `<review-slug>`.',
        '',
        '```yaml',
        'name: my-skill',
        'description: [Capability summary]... REPLACE_ME',
        '```',
        '',
      ].join('\n'),
    );
    const nestedExample = join(root, 'plain-skill', 'examples', 'sample-skill');
    await mkdir(nestedExample, { recursive: true });
    await writeFile(join(nestedExample, 'SKILL.md'), '# Example content, not another catalog entry\n', 'utf8');

    for (const operand of [source, join(root, 'plain-skill'), root]) {
      const result = runValidator(operand);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Checked metadata for 1 skill; all metadata is valid\./);
      assert.equal(result.stderr, '');
    }
  });
});

test('accepts folded name and description scalars while traversing catalogs deterministically', async () => {
  await withTempDir(async (root) => {
    await writeSkill(
      root,
      'folded-skill',
      [
        'name: >-',
        '  folded-skill',
        'description: >-',
        '  Coordinates focused validation for Agent Skills. Use this skill whenever',
        '  metadata must be checked before publication. Do not use when validating',
        '  unrelated Markdown documents.',
      ].join('\n'),
    );
    await writeSkill(root, 'plain-skill', plainFrontmatter('plain-skill'));

    const result = runValidator(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Checked metadata for 2 skills; all metadata is valid\./);
  });
});

test('reports missing and malformed frontmatter with path-specific diagnostics', async () => {
  await withTempDir(async (root) => {
    const missingDirectory = join(root, 'missing-frontmatter');
    await mkdir(missingDirectory);
    const missing = join(missingDirectory, 'SKILL.md');
    await writeFile(missing, '# No frontmatter\n', 'utf8');

    const malformed = await writeSkill(
      root,
      'malformed-frontmatter',
      ['name: malformed-frontmatter', 'description: |', '  Unsupported literal scalar.'].join('\n'),
    );
    const missingName = await writeSkill(root, 'missing-name', `description: ${validDescription}`);
    const missingDescription = await writeSkill(root, 'missing-description', 'name: missing-description');

    const result = runValidator(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${malformed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: uses an unsupported scalar form`));
    assert.match(result.stderr, new RegExp(`${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:1:frontmatter: missing opening`));
    assert.match(result.stderr, new RegExp(`${missingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:1:name: missing required name field`));
    assert.match(result.stderr, new RegExp(`${missingDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:1:description: missing required description field`));
  });
});

test('rejects invalid or directory-mismatched names', async () => {
  await withTempDir(async (root) => {
    const mismatch = await writeSkill(root, 'expected-name', plainFrontmatter('different-name'));
    const invalid = await writeSkill(root, 'Invalid_Name', plainFrontmatter('Invalid_Name'));

    const result = runValidator(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${mismatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:2:name: does not match skill directory "expected-name"`));
    assert.match(result.stderr, new RegExp(`${invalid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:2:name: must be 1-64 lowercase`));
  });
});

test('rejects empty and overlong descriptions', async () => {
  await withTempDir(async (root) => {
    const empty = await writeSkill(root, 'empty-description', 'name: empty-description\ndescription:');
    const longDescription = `${'x'.repeat(1025)} Use this skill when metadata needs validation. Do not use for other work.`;
    const overlong = await writeSkill(root, 'long-description', plainFrontmatter('long-description', longDescription));

    const result = runValidator(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${empty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: must not be empty`));
    assert.match(result.stderr, new RegExp(`${overlong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: is \\d+ characters; maximum is 1024`));
  });
});

test('requires literal routing and a material non-use boundary', async () => {
  await withTempDir(async (root) => {
    const missingRouting = await writeSkill(
      root,
      'missing-routing',
      plainFrontmatter(
        'missing-routing',
        'Coordinates focused validation for Agent Skills. Use when metadata needs checking. Do not use for unrelated documents.',
      ),
    );
    const missingBoundary = await writeSkill(
      root,
      'missing-boundary',
      plainFrontmatter(
        'missing-boundary',
        'Coordinates focused validation for Agent Skills. Use this skill when metadata needs checking.',
      ),
    );
    const emptyBoundary = await writeSkill(
      root,
      'empty-boundary',
      plainFrontmatter(
        'empty-boundary',
        'Coordinates focused validation for Agent Skills. Use this skill when metadata needs checking. Do not use.',
      ),
    );

    const result = runValidator(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${missingRouting.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: must contain literal`));
    assert.match(result.stderr, new RegExp(`${missingBoundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: must contain a material`));
    assert.match(result.stderr, new RegExp(`${emptyBoundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3:description: must contain a material`));
  });
});

test('rejects only narrow starter sentinels in name and description frontmatter', async () => {
  await withTempDir(async (root) => {
    const cases = [
      ['my-skill', plainFrontmatter('my-skill'), 'my-skill'],
      [
        'summary-sentinel',
        plainFrontmatter(
          'summary-sentinel',
          `Summarizes the skill capability. ${validDescription}`,
        ),
        'Summarizes the skill capability',
      ],
      [
        'bracket-sentinel',
        plainFrontmatter('bracket-sentinel', `[Capability summary]. ${validDescription}`),
        '[Capability summary]',
      ],
      [
        'replace-sentinel',
        plainFrontmatter('replace-sentinel', `REPLACE_ME. ${validDescription}`),
        'REPLACE_ME',
      ],
      [
        'ellipsis-sentinel',
        plainFrontmatter('ellipsis-sentinel', `Coordinates validation... ${validDescription}`),
        'ellipsis',
      ],
    ];

    for (const [directory, frontmatter, sentinel] of cases) {
      const source = await writeSkill(root, directory, frontmatter);
      const result = runValidator(source);
      assert.equal(result.status, 1, `${directory}: ${result.stderr}`);
      assert.match(result.stderr, /contains unresolved starter sentinel/);
      assert.match(result.stderr, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

test('provides help and stable usage/read exit code 2', async () => {
  await withTempDir(async (root) => {
    const help = runValidator('--help');
    assert.equal(help.status, 0);
    assert.match(help.stdout, /^Usage: node scripts\/validate-skill-metadata\.mjs/);
    assert.equal(help.stderr, '');

    const noOperand = runValidator();
    assert.equal(noOperand.status, 2);
    assert.match(noOperand.stderr, /provide at least one SKILL\.md file/);

    const unknown = runValidator('--unknown');
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /^Unknown option: --unknown/);

    const missing = runValidator(join(root, 'does-not-exist'));
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /cannot inspect operand/);

    const emptyDirectory = join(root, 'empty');
    await mkdir(emptyDirectory);
    const empty = runValidator(emptyDirectory);
    assert.equal(empty.status, 2);
    assert.match(empty.stderr, /no SKILL\.md file found under operand/);

    const markdown = join(root, 'README.md');
    await writeFile(markdown, '# Not a skill\n', 'utf8');
    const wrongFile = runValidator(markdown);
    assert.equal(wrongFile.status, 2);
    assert.match(wrongFile.stderr, /operand is not a SKILL\.md file/);
  });
});

test('sorts diagnostics by path regardless of operand order and deduplicates files', async () => {
  await withTempDir(async (root) => {
    const alpha = await writeSkill(root, 'alpha-skill', plainFrontmatter('wrong-alpha'));
    const zeta = await writeSkill(root, 'zeta-skill', plainFrontmatter('wrong-zeta'));

    const first = runValidator(join(root, 'zeta-skill'), join(root, 'alpha-skill'), alpha);
    const second = runValidator(join(root, 'zeta-skill'), join(root, 'alpha-skill'), alpha);
    assert.equal(first.status, 1);
    assert.equal(first.stderr, second.stderr);
    assert.ok(first.stderr.indexOf(alpha) < first.stderr.indexOf(zeta), first.stderr);
    assert.match(first.stderr, /Checked metadata for 2 skills; 2 policy violations\./);
  });
});

test('bounds diagnostics while retaining the total violation count', async () => {
  await withTempDir(async (root) => {
    for (let index = 0; index < 55; index += 1) {
      const suffix = String(index).padStart(2, '0');
      await writeSkill(root, `skill-${suffix}`, plainFrontmatter(`other-${suffix}`));
    }

    const result = runValidator(root);
    assert.equal(result.status, 1);
    const diagnosticLines = result.stderr
      .split('\n')
      .filter((line) => /\/SKILL\.md:2:name:/.test(line));
    assert.equal(diagnosticLines.length, 50);
    assert.match(result.stderr, /\.\.\. 5 additional diagnostics omitted\./);
    assert.match(result.stderr, /Checked metadata for 55 skills; 55 policy violations\./);
  });
});
