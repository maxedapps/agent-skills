import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'subagents.mjs');
const node = process.execPath;

function temp() {
  const root = mkdtempSync(path.join(tmpdir(), 'subagents-test-'));
  const bin = path.join(root, 'bin'), state = path.join(root, 'state');
  mkdirSync(bin); mkdirSync(state, { mode: 0o700 }); chmodSync(state, 0o700);
  return { root, bin, state };
}
function executable(file, body) { writeFileSync(file, `#!/bin/sh\nset -eu\n${body}\n`); chmodSync(file, 0o755); }
function cli(args, fixture, extraEnv = {}, timeout = 60000) {
  return new Promise((resolve) => {
    const env = { ...process.env, PATH: `${fixture.bin}:${process.env.PATH}` };
    for (const key of ['HERDR_ENV', 'HERDR_SOCKET_PATH', 'HERDR_WORKSPACE_ID', 'HERDR_TAB_ID', 'HERDR_PANE_ID']) delete env[key];
    Object.assign(env, extraEnv);
    const child = spawn(node, [script, ...args], { env });
    let stdout = '', stderr = '', timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      let json;
      try { json = JSON.parse(lines.at(-1)); } catch { json = null; }
      resolve({ status: timedOut ? null : code, signal, stdout, stderr, json, error: timedOut ? new Error('test CLI timeout') : undefined });
    });
  });
}
function git(cwd, args, env = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function repo(fixture) {
  const root = path.join(fixture.root, 'repo'); mkdirSync(root);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Test']); git(root, ['config', 'user.email', 'test@example.invalid']);
  writeFileSync(path.join(root, 'base.txt'), 'base\n'); git(root, ['add', '.']); git(root, ['commit', '-m', 'base']);
  return root;
}
function fakePi(fixture) {
  executable(path.join(fixture.bin, 'pi'), `
case "\${1:-}" in
  --help) echo 'pi usage: -p --tools --no-session --no-extensions --no-skills --no-prompt-templates --no-context-files'; exit 0 ;;
  --version) echo 'pi fake 1'; exit 0 ;;
esac
printf '%s\\n' "$*" >>"\${FAKE_TRACE:-/dev/null}"
cat >"\${FAKE_PROMPT:-/dev/null}"
case "\${FAKE_ACTION:-none}" in
  commit) printf 'worker\\n' > worker.txt; git add worker.txt; git commit -m worker >/dev/null ;;
  conflict) printf 'worker version\\n' > base.txt; git add base.txt; git commit -m worker-conflict >/dev/null ;;
  untracked) printf 'dirty\\n' > dirty.txt ;;
  output) printf 'line-1\\nline-2\\nline-3\\n' ;;
  sleep) sleep 10 ;;
esac
echo agent-ok`);
}
function herdrEnv(overrides = {}) {
  return {
    HERDR_ENV: '1', HERDR_SOCKET_PATH: 'sock', HERDR_WORKSPACE_ID: 'ws-parent',
    HERDR_TAB_ID: 'tab-parent', HERDR_PANE_ID: 'pane-parent', ...overrides,
  };
}
function fakeResolverHerdr(fixture, { status = '{"server":{"compatible":true,"socket":"sock"}}', current = '{"workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-parent"}', integration = 'pi: current (v5)' } = {}) {
  executable(path.join(fixture.bin, 'herdr'), `
printf '%s\\n' "$*" >>"\${HERDR_TRACE:-/dev/null}"
case "$1 \${2:-}" in
  '--help ') echo 'agent pane wait worktree --no-focus current run send-keys close agent-status create remove';;
  '--version ') echo 'herdr 0.7.4';;
  'agent --help') echo 'start get read --no-focus';;
  'pane --help') echo 'current get run send-keys close';;
  'wait --help') echo 'agent-status';;
  'worktree --help') echo 'create remove --no-focus';;
  'status --json') echo '${status}';;
  'pane current') echo '${current}';;
  'integration status') echo '${integration}';;
  *) echo 'unexpected launch' >&2; exit 91;;
esac`);
}
function runId(result) {
  assert.equal(result.status, 0, result.stderr);
  return result.json.runId;
}
function manifest(fixture, id) {
  return JSON.parse(readFileSync(path.join(fixture.state, 'runs', id, 'manifest.json'), 'utf8'));
}
async function waitForGone(fixture, id) {
  let result;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    result = await cli(['status', '--run', id, '--state-root', fixture.state], fixture);
    if (result.json?.runtime?.live === false && !result.json?.runtime?.ambiguous) return result;
  }
  assert.fail(`process group did not disappear: ${result?.stdout}`);
}

describe('subagents CLI', { concurrency: 3 }, async () => {
test('help exposes exactly seven commands and removed names or aliases are usage errors', { timeout: 300000 }, async () => {
  const f = temp();
  try {
    const help = await cli(['--help'], f);
    assert.equal(help.status, 0); assert.equal(help.json.ok, true);
    assert.deepEqual(help.json.help.commands, ['info', 'run', 'status', 'send', 'stop', 'integrate', 'clean']);
    assert.equal(help.json.help.usage, 'subagents.mjs <info|run|status|send|stop|integrate|clean> [options]');
    assert.doesNotMatch(JSON.stringify(help.json.help), /doctor|start|logs|--backend|\bbatch\b|\blist\b|\binspect\b/);
    assert.match(help.json.help.launch[0], /--harness pi\|claude\|codex\|grok\|kimi/);
    for (const removed of ['doctor', 'start', 'wait', 'logs', 'batch', 'list', 'inspect']) {
      for (const args of [[removed], [removed, '--help']]) {
        const result = await cli(args, f);
        assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`); assert.equal(result.json.category, 'usage');
      }
    }
    const backend = await cli(['run', '--backend', 'standalone'], f); assert.equal(backend.status, 2); assert.match(backend.json.error, /unknown option/);
    const noHarness = await cli(['run', '--role', 'scout', '--prompt', 'x'], f); assert.equal(noHarness.status, 2); assert.match(noHarness.json.error, /harness/);
    const noRole = await cli(['run', '--harness', 'pi', '--prompt', 'x'], f); assert.equal(noRole.status, 2); assert.match(noRole.json.error, /role/);
    const unsupported = await cli(['run', '--harness', 'kimi', '--role', 'scout', '--prompt', 'x', '--state-root', f.state], f);
    assert.equal(unsupported.status, 3); assert.match(unsupported.json.error, /Kimi readers/); assert.equal(existsSync(path.join(f.state, 'runs')), false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('info is no-model, isolates pair probes, and reports concise standalone capability reasons', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    const trace = path.join(f.root, 'probe.trace');
    executable(path.join(f.bin, 'pi'), `printf '%s\\n' "$*" >>"$PROBE_TRACE"; case "\${1:-}" in --help) echo '-p --tools --no-session';; --version) echo 'pi fake 1';; *) exit 90;; esac`);
    executable(path.join(f.bin, 'kimi'), `printf '%s\\n' "$*" >>"$PROBE_TRACE"; case "\${1:-}" in --help) echo '-p';; --version) echo 'kimi fake 1';; *) exit 90;; esac`);
    executable(path.join(f.bin, 'claude'), `printf '%s\\n' "$*" >>"$PROBE_TRACE"; case "\${1:-}" in --help) echo '-p only';; --version) echo fake;; *) exit 90;; esac`);
    const result = await cli(['info'], f, { PATH: f.bin, PROBE_TRACE: trace });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.json.backend, 'standalone'); assert.equal(result.json.reason, 'no-herdr-context');
    const byName = Object.fromEntries(result.json.harnesses.map((entry) => [entry.name, entry]));
    assert.deepEqual(byName.pi.roles, ['scout', 'research', 'worker']);
    assert.deepEqual(byName.kimi.roles, ['worker']); assert.equal(byName.kimi.blocked.scout, 'read-only-unproven'); assert.equal(byName.kimi.blocked.research, 'read-only-unproven');
    assert.deepEqual(byName.claude.roles, []); assert.equal(byName.claude.blocked.worker, 'required-capability-unproven');
    assert.equal(byName.codex.blocked.worker, 'executable-missing');
    assert.doesNotMatch(JSON.stringify(result.json), /pi fake|"stdout"|"probes"|"executable":/);
    const calls = readFileSync(trace, 'utf8').trim().split(/\r?\n/);
    assert.ok(calls.every((call) => call === '--help' || call === '--version'));
    assert.equal(existsSync(path.join(f.state, 'runs')), false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('automatic resolution chooses standalone with no markers even when Herdr is installed', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); fakeResolverHerdr(f); const trace = path.join(f.root, 'herdr.trace');
    const result = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'standalone', '--state-root', f.state], f, { HERDR_TRACE: trace });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.json.backend, 'standalone');
    assert.equal('manifest' in result.json, false);
    assert.deepEqual(manifest(f, result.json.runId).runtime.backendEvidence, { reason: 'no-herdr-context', markers: 'none' });
    assert.equal(existsSync(trace), false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('partial or invalid Herdr evidence blocks before state, Git, or runtime creation', { concurrency: true, timeout: 300000 }, async (t) => {
  const cases = [
    { name: 'partial markers', env: { HERDR_ENV: '1' }, fake: false, reason: 'herdr-markers-partial' },
    { name: 'empty marker', env: { HERDR_ENV: '' }, fake: false, reason: 'herdr-markers-partial' },
    { name: 'missing executable', env: herdrEnv(), fake: false, reason: 'herdr-executable-missing' },
    { name: 'malformed status JSON', env: herdrEnv(), config: { status: 'not-json' }, reason: 'herdr-json-invalid' },
    { name: 'socket mismatch', env: herdrEnv(), config: { status: '{"server":{"compatible":true,"socket":"other"}}' }, reason: 'herdr-socket-or-compatibility-unproven' },
    { name: 'version compatibility mismatch', env: herdrEnv(), config: { status: '{"server":{"compatible":false,"socket":"sock"}}' }, reason: 'herdr-socket-or-compatibility-unproven' },
    { name: 'topology mismatch', env: herdrEnv(), config: { current: '{"workspace_id":"other","tab_id":"tab-parent","pane_id":"pane-parent"}' }, reason: 'herdr-topology-mismatch' },
    { name: 'stale integration', env: herdrEnv(), config: { integration: 'pi: stale (v4)' }, reason: null },
  ];
  for (const entry of cases) await t.test(entry.name, async () => {
    const f = temp();
    try {
      fakePi(f); if (entry.fake !== false) fakeResolverHerdr(f, entry.config);
      const repository = repo(f), trace = path.join(f.root, 'herdr.trace');
      const beforeBranches = git(repository, ['branch', '--format=%(refname)']);
      const beforeWorktrees = git(repository, ['worktree', 'list', '--porcelain']);
      const env = { ...entry.env, HERDR_TRACE: trace };
      if (entry.name === 'missing executable') env.PATH = f.bin;
      const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'must not launch', '--cwd', repository, '--state-root', f.state], f, env);
      assert.ok([3, 5].includes(result.status), result.stderr); assert.equal(result.json.ok, false);
      if (entry.reason) assert.equal(result.json.details?.reason, entry.reason);
      else assert.match(result.json.error, /integration is not current/);
      assert.equal(existsSync(path.join(f.state, 'runs')), false);
      assert.equal(git(repository, ['branch', '--format=%(refname)']), beforeBranches);
      assert.equal(git(repository, ['worktree', 'list', '--porcelain']), beforeWorktrees);
      const calls = existsSync(trace) ? readFileSync(trace, 'utf8') : '';
      assert.doesNotMatch(calls, /^(agent start|worktree create|pane run)/m);
    } finally { rmSync(f.root, { recursive: true }); }
  });
});

test('Herdr info keeps stale integrations and unsupported Grok pair-specific', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    executable(path.join(f.bin, 'kimi'), `case "\${1:-}" in --help) echo '-p';; --version) echo kimi-fake;; *) exit 90;; esac`);
    fakeResolverHerdr(f, { integration: `pi: current (v5)
claude: current (v5)
codex: current (v5)
grok: current (v5)
kimi: stale (v4)` });
    const result = await cli(['info'], f, { ...herdrEnv(), PATH: f.bin, HERDR_TRACE: path.join(f.root, 'herdr.trace') });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.json.backend, 'herdr'); assert.equal(result.json.reason, 'verified-herdr');
    const byName = Object.fromEntries(result.json.harnesses.map((entry) => [entry.name, entry]));
    assert.deepEqual(byName.pi.roles, ['scout', 'research', 'worker']);
    assert.equal(byName.claude.blocked.worker, 'executable-missing');
    assert.equal(byName.grok.blocked.worker, 'herdr-integration-unsupported');
    assert.equal(byName.kimi.blocked.worker, 'herdr-integration-stale');
    assert.equal(existsSync(path.join(f.state, 'runs')), false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('standalone reader uses stdin, reader flags, durable logs, and the no-delegation envelope', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const trace = path.join(f.root, 'trace'), prompt = path.join(f.root, 'prompt');
    const result = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'inspect one thing', '--state-root', f.state, '--timeout', '5000'], f, { FAKE_TRACE: trace, FAKE_PROMPT: prompt });
    const id = runId(result);
    assert.equal(result.json.backend, 'standalone'); assert.equal(result.json.harness, 'pi'); assert.equal(result.json.role, 'scout');
    assert.equal(result.json.state, 'completed'); assert.match(result.json.output, /agent-ok/); assert.equal(result.json.next, 'review');
    assert.equal('manifest' in result.json, false); assert.deepEqual(Object.keys(result.json.runtime).sort(), ['ambiguous', 'live', 'pgid', 'pid', 'teardown']);
    assert.match(readFileSync(trace, 'utf8'), /^-p --no-session --no-extensions --no-skills --no-prompt-templates --no-context-files --tools read,grep,find,ls$/m);
    const assignment = readFileSync(prompt, 'utf8');
    assert.match(assignment, /Assignment type: scout/); assert.match(assignment, /SUBAGENTS_NO_DELEGATION=1/); assert.doesNotMatch(assignment, /<[^>]+>/);
    const status = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(status.status, 0); assert.match(status.json.output, /agent-ok/); assert.equal('manifest' in status.json, false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('status waits with the existing timeout and returns bounded normalized output', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const launched = await cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', 'produce output', '--state-root', f.state, '--timeout', '5000'], f, { FAKE_ACTION: 'output' });
    const id = runId(launched);
    const waited = await cli(['status', '--run', id, '--wait', '--lines', '2', '--timeout', '5000', '--state-root', f.state], f);
    assert.equal(waited.status, 0, waited.stderr); assert.equal(waited.json.state, 'completed');
    assert.equal(waited.json.output, 'line-3\nagent-ok'); assert.equal(waited.json.next, 'review');
    assert.deepEqual(Object.keys(waited.json).sort(), ['backend', 'harness', 'next', 'ok', 'output', 'role', 'runId', 'runtime', 'state']);
    for (const lines of ['0', '5001']) {
      const invalid = await cli(['status', '--run', id, '--lines', lines, '--state-root', f.state], f);
      assert.equal(invalid.status, 2); assert.match(invalid.json.error, /1 to 5000/);
    }
    const missingRun = await cli(['status', '--wait', '--state-root', f.state], f);
    assert.equal(missingRun.status, 2); assert.match(missingRun.json.error, /require --run/);
    const absentRoot = path.join(f.root, 'absent-state');
    const empty = await cli(['status', '--state-root', absentRoot], f);
    assert.equal(empty.status, 0, empty.stderr); assert.deepEqual(empty.json.runs, []); assert.equal(existsSync(absentRoot), false);

    const sleeping = await cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', 'keep working', '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
    const waitTimeout = await cli(['status', '--run', sleeping.json.runId, '--wait', '--timeout', '100', '--state-root', f.state], f);
    assert.equal(waitTimeout.status, 4); assert.match(waitTimeout.json.error, /wait timed out/);
    const stopped = await cli(['stop', '--run', sleeping.json.runId, '--state-root', f.state], f); assert.equal(stopped.status, 0, stopped.stderr);
    const cleaned = await cli(['clean', '--run', sleeping.json.runId, '--apply', '--state-root', f.state], f); assert.equal(cleaned.status, 0, cleaned.stderr);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('Claude, Codex, Grok, and Kimi standalone adapters construct only proven one-shot forms', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    const trace = path.join(f.root, 'adapter.trace');
    executable(path.join(f.bin, 'claude'), `case "\${1:-}" in --help) echo '-p --permission-mode --tools --no-session-persistence plan dontAsk'; exit;; --version) echo fake; exit;; esac; echo "claude $*" >>"$ADAPTER_TRACE"; cat >/dev/null`);
    executable(path.join(f.bin, 'codex'), `if [ "\${1:-}" = exec ] && [ "\${2:-}" = --help ]; then echo 'exec --sandbox read-only workspace-write --ephemeral -C'; exit; fi; case "\${1:-}" in --help) echo 'exec --sandbox'; exit;; --version) echo fake; exit;; esac; echo "codex $*" >>"$ADAPTER_TRACE"; cat >/dev/null`);
    executable(path.join(f.bin, 'grok'), `case "\${1:-}" in --help) echo '--single --permission-mode --no-subagents --no-memory --output-format --prompt-file plan auto'; exit;; --version) echo fake; exit;; esac; echo "grok $*" >>"$ADAPTER_TRACE"`);
    executable(path.join(f.bin, 'kimi'), `case "\${1:-}" in --help) echo '-p'; exit;; --version) echo fake; exit;; esac; echo "kimi $*:$PWD" >>"$ADAPTER_TRACE"; cat >/dev/null`);
    for (const harness of ['claude', 'codex', 'grok']) {
      const result = await cli(['run', '--harness', harness, '--role', 'scout', '--prompt', `${harness} task`, '--state-root', f.state], f, { ADAPTER_TRACE: trace });
      assert.equal(result.status, 0, result.stderr);
    }
    const repository = repo(f);
    const kimi = await cli(['run', '--harness', 'kimi', '--role', 'worker', '--prompt', 'kimi task', '--cwd', repository, '--state-root', f.state], f, { ADAPTER_TRACE: trace });
    assert.equal(kimi.status, 0, kimi.stderr); assert.notEqual(kimi.json.worker.path, repository);
    const calls = readFileSync(trace, 'utf8');
    assert.match(calls, /^claude -p --no-session-persistence --permission-mode plan --tools Read,Grep,Glob$/m);
    assert.match(calls, /^codex exec -C .* --sandbox read-only --ephemeral -$/m);
    assert.match(calls, /^grok --prompt-file .*\/state\/runs\/run-[^/]+\/prompt\.txt --permission-mode plan --no-subagents --no-memory --output-format json$/m);
    assert.match(calls, /^kimi -p /m);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('two parallel async runs have distinct ownership, concise listing, and clean explicit stop', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const launches = await Promise.all(['one', 'two'].map((prompt) => cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', prompt, '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' })));
    const ids = launches.map(runId);
    assert.equal(new Set(ids).size, 2);
    for (const result of launches) {
      assert.equal(result.json.state, 'running'); assert.equal(result.json.next, 'wait'); assert.equal('manifest' in result.json, false);
    }
    const listed = await cli(['status', '--state-root', f.state], f);
    assert.equal(listed.status, 0, listed.stderr); assert.deepEqual(listed.json.runs.map((run) => run.runId).sort(), [...ids].sort());
    for (const summary of listed.json.runs) {
      assert.deepEqual(Object.keys(summary).sort(), ['backend', 'harness', 'next', 'role', 'runId', 'state']);
      assert.equal(summary.state, 'running'); assert.equal(summary.next, 'wait');
    }
    const stopped = await Promise.all(ids.map((id) => cli(['stop', '--run', id, '--state-root', f.state], f)));
    for (const result of stopped) assert.equal(result.status, 0, result.stderr);
    const cleaned = await Promise.all(ids.map((id) => cli(['clean', '--run', id, '--apply', '--state-root', f.state], f)));
    for (const result of cleaned) assert.equal(result.status, 0, result.stderr);
    const empty = await cli(['status', '--state-root', f.state], f); assert.deepEqual(empty.json.runs, []);
    assert.equal(readFileSync(path.join(f.state, 'cleaned', `${ids[0]}.json`), 'utf8').includes('cleaned'), true);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('no-ID status freshly reconciles completed and crashed standalone summaries', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const completed = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'finish', '--state-root', f.state], f);
    const crashed = await cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', 'crash', '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
    process.kill(-crashed.json.runtime.pgid, 'SIGKILL');

    let listed, crashedSummary;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      listed = await cli(['status', '--state-root', f.state], f);
      crashedSummary = listed.json?.runs?.find((run) => run.runId === crashed.json.runId);
      if (crashedSummary?.state === 'blocked') break;
    }
    assert.equal(listed.status, 0, listed.stderr);
    const completedSummary = listed.json.runs.find((run) => run.runId === completed.json.runId);
    assert.equal(completedSummary.state, 'completed'); assert.equal(completedSummary.next, 'review');
    assert.equal(crashedSummary.state, 'blocked'); assert.equal(crashedSummary.next, 'retain');
    for (const summary of [completedSummary, crashedSummary]) {
      assert.deepEqual(Object.keys(summary).sort(), ['backend', 'harness', 'next', 'role', 'runId', 'state']);
    }
    for (const id of [completed.json.runId, crashed.json.runId]) {
      const cleaned = await cli(['clean', '--run', id, '--apply', '--state-root', f.state], f);
      assert.equal(cleaned.status, 0, cleaned.stderr);
    }
  } finally { rmSync(f.root, { recursive: true }); }
});

test('copied manifests cannot grant control from another state root', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const started = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'x', '--state-root', f.state], f);
    const id = runId(started), copied = path.join(f.root, 'copied');
    cpSync(f.state, copied, { recursive: true }); chmodSync(copied, 0o700);
    const rejected = await cli(['status', '--run', id, '--state-root', copied], f);
    assert.equal(rejected.status, 5); assert.match(rejected.json.error, /provenance mismatch/);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('crashed standalone readers are retained without blind signaling and can retire owned state', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const started = await cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', 'crash', '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
    const id = runId(started), pgid = started.json.runtime.pgid;
    process.kill(-pgid, 'SIGKILL');
    let observed;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      observed = await cli(['status', '--run', id, '--state-root', f.state], f);
      if (observed.json?.runtime?.live === false) break;
    }
    assert.equal(observed.status, 0); assert.equal(observed.json.runtime.live, false); assert.equal(observed.json.state, 'blocked'); assert.equal(observed.json.next, 'retain');
    const cleaned = await cli(['clean', '--run', id, '--apply', '--state-root', f.state], f);
    assert.equal(cleaned.status, 0, cleaned.stderr); assert.equal(existsSync(path.join(f.state, 'runs', id)), false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('standalone timeout and exact stop use distinct lifecycle outcomes', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f);
    const timed = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'sleep', '--cwd', repository, '--state-root', f.state, '--timeout', '100'], f, { FAKE_ACTION: 'sleep' });
    assert.equal(timed.status, 4); assert.equal(timed.json.category, 'timeout');
    const started = await cli(['run', '--async', '--harness', 'pi', '--role', 'worker', '--prompt', 'sleep', '--cwd', repository, '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
    const id = runId(started), manifestFile = path.join(f.state, 'runs', id, 'manifest.json');
    const original = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const altered = structuredClone(original); altered.runtime.startIdentity.start = 'mismatched-start';
    writeFileSync(manifestFile, `${JSON.stringify(altered, null, 2)}\n`);
    const refused = await cli(['stop', '--run', id, '--state-root', f.state], f);
    assert.equal(refused.status, 5); assert.match(refused.json.error, /identity|ambiguous/);
    writeFileSync(manifestFile, `${JSON.stringify(original, null, 2)}\n`);
    const stopped = await cli(['stop', '--run', id, '--state-root', f.state], f);
    assert.equal(stopped.status, 0, stopped.stderr); assert.equal(stopped.json.state, 'stopped');
  } finally { rmSync(f.root, { recursive: true }); }
});

test('worker gets a distinct worktree; provenance, ff integration, and cleanup gates are explicit', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f);
    const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'make worker file', '--cwd', repository, '--state-root', f.state], f, { FAKE_ACTION: 'commit' });
    const id = runId(result), record = manifest(f, id);
    assert.notEqual(record.worktree.path, repository); assert.match(record.worktree.branch, /^subagent\//);
    await waitForGone(f, id);
    const ready = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(ready.status, 0, ready.stderr); assert.equal(ready.json.state, 'completed'); assert.equal(ready.json.next, 'integrate');
    assert.equal(ready.json.worker.path, record.worktree.path); assert.equal(ready.json.worker.branch, record.worktree.branch);
    assert.equal(ready.json.worker.head, git(record.worktree.path, ['rev-parse', 'HEAD'])); assert.equal(ready.json.worker.clean, true);
    assert.match(ready.json.worker.commits, /worker/); assert.match(ready.json.worker.diff, /worker\.txt/);
    assert.equal(ready.json.worker.integration, 'pending'); assert.equal(ready.json.worker.readiness, 'ready');
    assert.equal('manifest' in ready.json, false); assert.equal(manifest(f, id).integration, null);
    assert.equal(git(repository, ['rev-parse', 'HEAD']), record.parent.baseHead);
    const premature = await cli(['clean', '--run', id, '--validated', 'premature', '--state-root', f.state], f);
    assert.equal(premature.status, 5); assert.match(premature.json.error, /integration/);
    git(repository, ['checkout', '-b', 'wrong-parent']);
    const wrongParent = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(wrongParent.status, 5); assert.match(wrongParent.json.error, /parent repository provenance/);
    git(repository, ['checkout', 'main']); git(repository, ['branch', '-d', 'wrong-parent']);
    const workerHead = git(record.worktree.path, ['rev-parse', 'HEAD']);
    git(repository, ['update-ref', `refs/heads/${record.worktree.branch}`, record.parent.baseHead]);
    const movedRef = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(movedRef.status, 5); assert.match(movedRef.json.error, /dirty|provenance/);
    git(repository, ['update-ref', `refs/heads/${record.worktree.branch}`, workerHead]);
    const dry = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(dry.status, 0, dry.stderr); assert.equal(dry.json.dryRun, true); assert.equal(git(repository, ['rev-parse', 'HEAD']), record.parent.baseHead);
    const applied = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--apply', '--state-root', f.state], f);
    assert.equal(applied.status, 0, applied.stderr); assert.equal(readFileSync(path.join(repository, 'worker.txt'), 'utf8'), 'worker\n');
    const integratedStatus = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(integratedStatus.status, 0, integratedStatus.stderr); assert.equal(integratedStatus.json.state, 'integrated');
    assert.equal(integratedStatus.json.worker.integration, 'integrated'); assert.equal(integratedStatus.json.next, 'validate');
    const cleanDry = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--state-root', f.state], f);
    assert.equal(cleanDry.status, 0, cleanDry.stderr); assert.equal(cleanDry.json.dryRun, true);
    const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
    executable(path.join(f.bin, 'git'), `case " $* " in *" worktree remove "*) exit 1;; esac; exec "$REAL_GIT" "$@"`);
    const refusedRemoval = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f, { REAL_GIT: realGit });
    assert.equal(refusedRemoval.status, 5); assert.match(refusedRemoval.json.error, /non-force worktree removal failed/);
    assert.equal(git(repository, ['worktree', 'list', '--porcelain']).includes(record.worktree.path), true);
    rmSync(path.join(f.bin, 'git'));
    const cleaned = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f);
    assert.equal(cleaned.status, 0, cleaned.stderr); assert.equal(git(repository, ['branch', '--list', record.worktree.branch]), '');
    assert.equal(existsSync(path.join(f.state, 'runs', id)), false);
    const again = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f);
    assert.equal(again.status, 0); assert.equal(again.json.idempotent, true);
    const finalStatus = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(finalStatus.status, 0); assert.equal(finalStatus.json.state, 'cleaned'); assert.equal(finalStatus.json.backend, 'standalone');
    assert.equal(finalStatus.json.harness, 'pi'); assert.equal(finalStatus.json.role, 'worker'); assert.equal(finalStatus.json.runtime.live, false);
    assert.equal('manifest' in finalStatus.json, false); assert.equal('tombstone' in finalStatus.json, false);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('clean committed no-change workers skip merge but still require attested validation', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f), before = git(repository, ['rev-parse', 'HEAD']);
    const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'inspect only', '--cwd', repository, '--state-root', f.state], f);
    const id = runId(result); await waitForGone(f, id);
    const applied = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'none-needed', '--apply', '--state-root', f.state], f);
    assert.equal(applied.status, 0, applied.stderr); assert.equal(applied.json.noChange, true); assert.equal(git(repository, ['rev-parse', 'HEAD']), before);
    const missingValidation = await cli(['clean', '--run', id, '--state-root', f.state], f);
    assert.equal(missingValidation.status, 2); assert.match(missingValidation.json.error, /validated/);
    const cleaned = await cli(['clean', '--run', id, '--validated', 'reviewed-no-change', '--apply', '--state-root', f.state], f);
    assert.equal(cleaned.status, 0, cleaned.stderr);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('dirty and untracked worker state is retained and blocks integration', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f);
    const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'leave dirt', '--cwd', repository, '--state-root', f.state], f, { FAKE_ACTION: 'untracked' });
    const id = runId(result); await waitForGone(f, id);
    const status = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(status.status, 0, status.stderr); assert.equal(status.json.worker.clean, false);
    assert.equal(status.json.worker.readiness, 'blocked'); assert.match(status.json.worker.blockedReason, /dirty/); assert.equal(status.json.next, 'retain');
    const blocked = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'observed', '--state-root', f.state], f);
    assert.equal(blocked.status, 5); assert.match(blocked.json.error, /dirty/);
    const record = manifest(f, id);
    assert.equal(git(repository, ['worktree', 'list', '--porcelain']).includes(record.worktree.path), true);
    rmSync(path.join(record.worktree.path, 'dirty.txt'));
    writeFileSync(path.join(record.worktree.path, 'base.txt'), 'uncommitted\n');
    const uncommitted = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'observed', '--state-root', f.state], f);
    assert.equal(uncommitted.status, 5); assert.match(uncommitted.json.error, /dirty/);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('diverged parent refuses default ff and permits explicit merge after non-mutating preflight', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f);
    const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'worker', '--cwd', repository, '--state-root', f.state], f, { FAKE_ACTION: 'commit' });
    const id = runId(result); await waitForGone(f, id);
    writeFileSync(path.join(repository, 'parent.txt'), 'parent\n'); git(repository, ['add', '.']); git(repository, ['commit', '-m', 'parent']);
    const refused = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'pass', '--state-root', f.state], f);
    assert.equal(refused.status, 5); assert.match(refused.json.error, /fast-forward/);
    const dry = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'pass', '--strategy', 'merge', '--state-root', f.state], f);
    assert.equal(dry.status, 0, dry.stderr); assert.equal(dry.json.dryRun, true);
    const applied = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'pass', '--strategy', 'merge', '--apply', '--state-root', f.state], f);
    assert.equal(applied.status, 0, applied.stderr); assert.equal(git(repository, ['merge-base', '--is-ancestor', manifest(f, id).worktree.head, 'HEAD']), '');
  } finally { rmSync(f.root, { recursive: true }); }
});

test('merge conflicts are preflighted without mutating the parent and retained for a fresh retry', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f);
    const result = await cli(['run', '--harness', 'pi', '--role', 'worker', '--prompt', 'conflicting edit', '--cwd', repository, '--state-root', f.state], f, { FAKE_ACTION: 'conflict' });
    const id = runId(result); await waitForGone(f, id);
    writeFileSync(path.join(repository, 'base.txt'), 'parent version\n'); git(repository, ['add', '.']); git(repository, ['commit', '-m', 'parent-conflict']);
    const parentHead = git(repository, ['rev-parse', 'HEAD']);
    const conflict = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'reviewed', '--strategy', 'merge', '--apply', '--state-root', f.state], f);
    assert.equal(conflict.status, 5); assert.match(conflict.json.error, /preflight failed or conflicts/);
    assert.equal(git(repository, ['rev-parse', 'HEAD']), parentHead); assert.equal(git(repository, ['status', '--porcelain=v1']), '');
    const record = manifest(f, id);
    assert.equal(record.integration.state, 'conflict-preflight'); assert.equal(record.worktree.path, result.json.worker.path);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('Herdr reader construction is no-focus, interactive, and inspect/idle precede atomic prompt submission', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const repository = repo(f), trace = path.join(f.root, 'herdr.trace');
    executable(path.join(f.bin, 'herdr'), `
printf '%s\\n' "$*" >>"$HERDR_TRACE"
case "$1 \${2:-}" in
  '--help ') echo 'agent pane wait worktree --no-focus current run send-keys close agent-status create remove';;
  '--version ') echo 'herdr 0.7.4';;
  'agent --help') echo 'start get read --no-focus';;
  'pane --help') echo 'current get run send-keys close';;
  'wait --help') echo 'agent-status';;
  'worktree --help') echo 'create remove --no-focus';;
  'status --json') echo '{"server":{"compatible":true,"socket":"sock"}}';;
  'integration status') echo 'pi: current (v5)';;
  'pane current') echo '{"workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-parent"}';;
  'agent start') echo '{"workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-child","terminal_id":"term-child"}';;
  'worktree create')
    shift 2; cwd=''; branch=''; base=''
    while [ "$#" -gt 0 ]; do
      case "$1" in --cwd) cwd="$2"; shift 2;; --branch) branch="$2"; shift 2;; --base) base="$2"; shift 2;; *) shift;; esac
    done
    git -C "$cwd" worktree add -b "$branch" "$HERDR_WORKTREE" "$base" >/dev/null
    printf '{"workspaceId":"ws-worker","tabId":"tab-worker","rootPaneId":"pane-worker","terminalId":"term-worker","path":"%s"}\\n' "$HERDR_WORKTREE";;
  'worktree remove') git -C "$HERDR_PARENT" worktree remove "$HERDR_WORKTREE"; echo '{"removed":true}';;
  'pane get')
    if grep -q "^pane close \${3:-}$" "$HERDR_TRACE"; then exit 1; fi
    case "\${3:-}" in
      pane-worker) echo '{"workspace_id":"ws-worker","tab_id":"tab-worker","pane_id":"pane-worker","terminal_id":"term-worker"}';;
      *) echo '{"workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-child","terminal_id":"term-child"}';;
    esac;;
  'agent get') printf '{"agent_status":"%s","workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-child","terminal_id":"term-child"}\\n' "\${HERDR_AGENT_STATUS:-working}";;
  'agent read') echo 'transcript';;
  'wait agent-status') :;;
  'pane run'|'pane send-keys'|'pane close') :;;
  *) echo '{}';;
esac`);
    const env = { ...herdrEnv(), HERDR_TRACE: trace, HERDR_PARENT: repository };
    const started = await cli(['run', '--async', '--harness', 'pi', '--role', 'scout', '--prompt', 'atomic assignment', '--cwd', repository, '--state-root', f.state], f, env);
    assert.equal(started.status, 0, started.stderr);
    assert.equal(started.json.backend, 'herdr'); assert.equal(started.json.harness, 'pi'); assert.equal(started.json.state, 'running');
    assert.equal(started.json.output, 'transcript\n'); assert.equal(started.json.next, 'wait'); assert.equal('manifest' in started.json, false);
    assert.deepEqual(Object.keys(started.json.runtime).sort(), ['agentState', 'ambiguous', 'live', 'paneId', 'tabId', 'terminalId', 'workspaceId']);
    const readerRecord = manifest(f, started.json.runId);
    assert.equal(readerRecord.runtime.backendEvidence.reason, 'verified-herdr');
    assert.equal(readerRecord.runtime.backendEvidence.status.server.socket, 'sock');
    assert.equal(readerRecord.runtime.backendEvidence.current.pane_id, 'pane-parent');

    const probeFailureList = await cli(['status', '--state-root', f.state], f, { ...env, HERDR_PANE_ID: 'pane-other' });
    assert.equal(probeFailureList.status, 0, probeFailureList.stderr); assert.equal(probeFailureList.json.runs.length, 1);
    assert.equal(probeFailureList.json.runs[0].runId, started.json.runId); assert.equal(probeFailureList.json.runs[0].state, 'blocked');
    assert.equal(probeFailureList.json.runs[0].next, 'retain'); assert.equal('error' in probeFailureList.json.runs[0], false);
    const completedList = await cli(['status', '--state-root', f.state], f, { ...env, HERDR_AGENT_STATUS: 'idle' });
    assert.equal(completedList.status, 0, completedList.stderr); assert.equal(completedList.json.runs.length, 1);
    assert.equal(completedList.json.runs[0].runId, started.json.runId); assert.equal(completedList.json.runs[0].state, 'completed');
    assert.equal(completedList.json.runs[0].next, 'review');
    const calls = readFileSync(trace, 'utf8').split(/\r?\n/);
    const launch = calls.find((line) => line.startsWith('agent start'));
    assert.match(launch, /--no-focus -- .*\/pi --tools read,grep,find,ls$/); assert.doesNotMatch(launch, / -p |atomic assignment/);
    assert.equal(calls.filter((line) => line === '--version').length, 1, 'resolved Herdr proof is reused by launch');
    const firstRead = calls.findIndex((line) => line.startsWith('agent read'));
    const idle = calls.findIndex((line) => line.startsWith('wait agent-status') && line.includes('--status idle'));
    const submit = calls.findIndex((line) => line.startsWith('pane run pane-child Role:'));
    assert.ok(firstRead >= 0 && firstRead < idle && idle < submit, calls.join('\n'));
    const readerId = runId(started);
    const sent = await cli(['send', '--run', readerId, '--message', 'same assignment follow-up', '--state-root', f.state], f, env);
    assert.equal(sent.status, 0, sent.stderr);
    const readerStopped = await cli(['stop', '--run', readerId, '--state-root', f.state], f, env);
    assert.equal(readerStopped.status, 0, readerStopped.stderr);
    const readerCleaned = await cli(['clean', '--run', readerId, '--apply', '--state-root', f.state], f, env);
    assert.equal(readerCleaned.status, 0, readerCleaned.stderr); assert.equal(readerCleaned.json.stateRetired, true);

    const workerRoot = path.join(f.root, 'herdr-worker');
    const workerEnv = { ...env, HERDR_WORKTREE: workerRoot };
    const worker = await cli(['run', '--async', '--harness', 'pi', '--role', 'worker', '--prompt', 'worker assignment', '--cwd', repository, '--state-root', f.state], f, workerEnv);
    assert.equal(worker.status, 0, worker.stderr); assert.equal(manifest(f, worker.json.runId).worktree.manager, 'herdr');
    assert.equal(worker.json.worker.integration, 'pending'); assert.equal(worker.json.worker.readiness, 'blocked'); assert.match(worker.json.worker.blockedReason, /not terminal/);
    const workerCalls = readFileSync(trace, 'utf8').split(/\r?\n/);
    const workerLaunch = workerCalls.find((line) => line.startsWith('pane run pane-worker ') && line.includes('/pi'));
    assert.match(workerLaunch, /'\/.*\/pi' '--tools' 'read,bash,edit,write,grep,find,ls'$/); assert.doesNotMatch(workerLaunch, / -p |worker assignment/);
    const workerId = runId(worker), manifestFile = path.join(f.state, 'runs', workerId, 'manifest.json');
    const completedLive = JSON.parse(readFileSync(manifestFile, 'utf8')); completedLive.state = 'completed';
    writeFileSync(manifestFile, `${JSON.stringify(completedLive, null, 2)}\n`);
    const liveIntegration = await cli(['integrate', '--run', workerId, '--reviewed', '--checks', 'reviewed', '--state-root', f.state], f, workerEnv);
    assert.equal(liveIntegration.status, 5); assert.match(liveIntegration.json.error, /explicitly stopped/);
    const workerStopped = await cli(['stop', '--run', workerId, '--state-root', f.state], f, workerEnv);
    assert.equal(workerStopped.status, 0, workerStopped.stderr);
    const integrated = await cli(['integrate', '--run', workerId, '--reviewed', '--checks', 'reviewed', '--apply', '--state-root', f.state], f, workerEnv);
    assert.equal(integrated.status, 0, integrated.stderr); assert.equal(integrated.json.noChange, true);
    const workerCleaned = await cli(['clean', '--run', workerId, '--validated', 'parent checks', '--apply', '--state-root', f.state], f, workerEnv);
    assert.equal(workerCleaned.status, 0, workerCleaned.stderr);
  } finally { rmSync(f.root, { recursive: true }); }
});
});
