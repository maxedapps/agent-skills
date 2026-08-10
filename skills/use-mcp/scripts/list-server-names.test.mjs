import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import test from 'node:test';

const script = fileURLToPath(new URL('./list-server-names.mjs', import.meta.url));

async function withFakeMcporter(source, run) {
  const root = await mkdtemp(join(tmpdir(), 'use-mcp-list-'));
  const fakePath = join(root, process.platform === 'win32' ? 'mcporter.cmd' : 'mcporter');
  const executable = process.platform === 'win32'
    ? `@echo off\n"${process.execPath}" "${join(root, 'fake.mjs')}" %*\n`
    : `#!/bin/sh\nexec "${process.execPath}" "${join(root, 'fake.mjs')}" "$@"\n`;
  try {
    await writeFile(join(root, 'fake.mjs'), source, 'utf8');
    await writeFile(fakePath, executable, 'utf8');
    if (process.platform !== 'win32') await chmod(fakePath, 0o755);
    await run({ ...process.env, PATH: `${root}${delimiter}${process.env.PATH ?? ''}` });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runScript(args, env) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });
}

test('emits names and source only while withholding sensitive definitions', async () => {
  const fake = `
const source = process.argv.at(-1);
const payload = source === 'local'
  ? { servers: [{ name: 'linear', baseUrl: 'https://example.test/?token=TOP_SECRET', headers: { Authorization: 'Bearer TOP_SECRET' } }] }
  : { servers: [{ name: 'docs', command: 'secret-command', args: ['--token', 'TOP_SECRET'], env: { TOKEN: 'TOP_SECRET' } }] };
console.log(JSON.stringify(payload));
`;
  await withFakeMcporter(fake, async (env) => {
    const result = runScript([], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      servers: [
        { name: 'docs', source: 'import' },
        { name: 'linear', source: 'local' },
      ],
    });
    assert.doesNotMatch(result.stdout, /TOP_SECRET|baseUrl|headers|command|args|env/);
    assert.equal(result.stderr, '');
  });
});

test('does not relay child stdout or stderr when mcporter fails', async () => {
  const fake = `
console.log('TOP_SECRET_STDOUT');
console.error('TOP_SECRET_STDERR');
process.exit(1);
`;
  await withFakeMcporter(fake, async (env) => {
    const result = runScript(['--source', 'local'], env);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Unable to enumerate local MCP server names safely/);
    assert.doesNotMatch(result.stderr, /TOP_SECRET/);
  });
});

test('fails closed on malformed payloads and supports help', async () => {
  const fake = `console.log('{"servers":[{"baseUrl":"TOP_SECRET"}]}');`;
  await withFakeMcporter(fake, async (env) => {
    const malformed = runScript(['--source', 'import'], env);
    assert.equal(malformed.status, 1);
    assert.equal(malformed.stdout, '');
    assert.doesNotMatch(malformed.stderr, /TOP_SECRET/);
  });

  const help = runScript(['--help'], process.env);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Usage:/);
  assert.equal(help.stderr, '');

  const usage = runScript(['--source', 'other'], process.env);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /Expected only --source local\|import\|all/);
});
