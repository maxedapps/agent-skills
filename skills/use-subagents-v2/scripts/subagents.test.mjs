import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
    const child = spawn(node, [script, ...args], {
      env: { ...process.env, PATH: `${fixture.bin}:${process.env.PATH}`, ...extraEnv },
    });
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
  sleep) sleep 10 ;;
esac
echo agent-ok`);
}
function runId(result) {
  assert.equal(result.status, 0, result.stderr);
  return result.json.manifest?.runId ?? result.json.runId;
}
async function waitForGone(fixture, id) {
  let result;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    result = await cli(['status', '--run', id, '--state-root', fixture.state], fixture);
    if (result.json?.identity?.live === false && !result.json?.identity?.ambiguous) return result;
  }
  assert.fail(`process group did not disappear: ${result?.stdout}`);
}

describe('subagents CLI', { concurrency: 3 }, async () => {
test('help is JSON and usage/unsupported errors have stable distinct exits', { timeout: 300000 }, async () => {
  const f = temp();
  try {
    const help = await cli(['--help'], f);
    assert.equal(help.status, 0); assert.equal(help.json.ok, true); assert.match(help.json.help.usage, /doctor.*clean/);
    assert.ok(help.json.help.launch.includes('--backend standalone|herdr'));
    assert.ok(help.json.help.launch.includes('--harness pi|claude|codex|grok|kimi'));
    const usage = await cli(['wat'], f); assert.equal(usage.status, 2); assert.equal(usage.json.category, 'usage');
    fakePi(f);
    const kimi = await cli(['doctor', '--harness', 'kimi', '--role', 'scout'], f);
    assert.equal(kimi.status, 3); assert.equal(kimi.json.category, 'unsupported');
  } finally { rmSync(f.root, { recursive: true }); }
});

test('doctor probes current help and fails closed when a capability token is missing', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const okay = await cli(['doctor', '--harness', 'pi', '--role', 'scout'], f);
    assert.equal(okay.status, 0, okay.stderr); assert.equal(okay.json.executable, realpathSync(path.join(f.bin, 'pi')));
    assert.equal(okay.json.backend, 'standalone'); assert.equal(okay.json.harness, 'pi');
    executable(path.join(f.bin, 'claude'), `case "\${1:-}" in --help) echo '-p only';; --version) echo fake;; esac`);
    const blocked = await cli(['doctor', '--harness', 'claude', '--role', 'scout'], f);
    assert.equal(blocked.status, 3); assert.match(blocked.json.error, /required token|reader token/);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('standalone reader uses stdin, reader flags, durable logs, and the no-delegation envelope', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f); const trace = path.join(f.root, 'trace'), prompt = path.join(f.root, 'prompt');
    const result = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'inspect one thing', '--state-root', f.state, '--timeout', '5000'], f, { FAKE_TRACE: trace, FAKE_PROMPT: prompt });
    const id = runId(result);
    assert.equal(result.json.manifest.backend, 'standalone'); assert.equal(result.json.manifest.harness, 'pi');
    assert.match(readFileSync(trace, 'utf8'), /^-p --no-session --no-extensions --no-skills --no-prompt-templates --no-context-files --tools read,grep,find,ls$/m);
    const assignment = readFileSync(prompt, 'utf8');
    assert.match(assignment, /Assignment type: scout/); assert.match(assignment, /SUBAGENTS_NO_DELEGATION=1/); assert.doesNotMatch(assignment, /<[^>]+>/);
    const logs = await cli(['logs', '--run', id, '--state-root', f.state], f);
    assert.equal(logs.status, 0); assert.match(logs.json.stdout, /agent-ok/);
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
    assert.equal(kimi.status, 0, kimi.stderr); assert.notEqual(kimi.json.manifest.worktree.path, repository);
    const calls = readFileSync(trace, 'utf8');
    assert.match(calls, /^claude -p --no-session-persistence --permission-mode plan --tools Read,Grep,Glob$/m);
    assert.match(calls, /^codex exec -C .* --sandbox read-only --ephemeral -$/m);
    assert.match(calls, /^grok --prompt-file .*\/state\/runs\/run-[^/]+\/prompt\.txt --permission-mode plan --no-subagents --no-memory --output-format json$/m);
    assert.match(calls, /^kimi -p /m);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('bounded parallel standalone readers receive distinct owned runs and can be stopped', { concurrency: true, timeout: 300000 }, async () => {
  const f = temp();
  try {
    fakePi(f);
    const launches = await Promise.all(['one', 'two'].map((prompt) => cli(['start', '--harness', 'pi', '--role', 'scout', '--prompt', prompt, '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' })));
    const ids = launches.map(runId);
    assert.equal(new Set(ids).size, 2);
    const stopped = await Promise.all(ids.map((id) => cli(['stop', '--run', id, '--state-root', f.state], f)));
    for (const result of stopped) assert.equal(result.status, 0, result.stderr);
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
    const started = await cli(['start', '--harness', 'pi', '--role', 'scout', '--prompt', 'crash', '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
    const id = runId(started), pgid = started.json.runtime.pgid;
    process.kill(-pgid, 'SIGKILL');
    let observed;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      observed = await cli(['status', '--run', id, '--state-root', f.state], f);
      if (observed.json?.identity?.live === false) break;
    }
    assert.equal(observed.status, 0); assert.equal(observed.json.identity.live, false); assert.match(observed.json.advisory, /without terminal record/);
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
    const started = await cli(['start', '--harness', 'pi', '--role', 'worker', '--prompt', 'sleep', '--cwd', repository, '--state-root', f.state, '--timeout', '10000'], f, { FAKE_ACTION: 'sleep' });
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
    const id = runId(result), manifest = result.json.manifest;
    assert.notEqual(manifest.worktree.path, repository); assert.match(manifest.worktree.branch, /^subagent\//);
    await waitForGone(f, id);
    const premature = await cli(['clean', '--run', id, '--validated', 'premature', '--state-root', f.state], f);
    assert.equal(premature.status, 5); assert.match(premature.json.error, /integration/);
    git(repository, ['checkout', '-b', 'wrong-parent']);
    const wrongParent = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(wrongParent.status, 5); assert.match(wrongParent.json.error, /parent repository provenance/);
    git(repository, ['checkout', 'main']); git(repository, ['branch', '-d', 'wrong-parent']);
    const workerHead = git(manifest.worktree.path, ['rev-parse', 'HEAD']);
    git(repository, ['update-ref', `refs/heads/${manifest.worktree.branch}`, manifest.parent.baseHead]);
    const movedRef = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(movedRef.status, 5); assert.match(movedRef.json.error, /dirty|provenance/);
    git(repository, ['update-ref', `refs/heads/${manifest.worktree.branch}`, workerHead]);
    const dry = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--state-root', f.state], f);
    assert.equal(dry.status, 0, dry.stderr); assert.equal(dry.json.dryRun, true); assert.equal(git(repository, ['rev-parse', 'HEAD']), manifest.parent.baseHead);
    const applied = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'node-test-pass', '--apply', '--state-root', f.state], f);
    assert.equal(applied.status, 0, applied.stderr); assert.equal(readFileSync(path.join(repository, 'worker.txt'), 'utf8'), 'worker\n');
    const cleanDry = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--state-root', f.state], f);
    assert.equal(cleanDry.status, 0, cleanDry.stderr); assert.equal(cleanDry.json.dryRun, true);
    const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
    executable(path.join(f.bin, 'git'), `case " $* " in *" worktree remove "*) exit 1;; esac; exec "$REAL_GIT" "$@"`);
    const refusedRemoval = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f, { REAL_GIT: realGit });
    assert.equal(refusedRemoval.status, 5); assert.match(refusedRemoval.json.error, /non-force worktree removal failed/);
    assert.equal(git(repository, ['worktree', 'list', '--porcelain']).includes(manifest.worktree.path), true);
    rmSync(path.join(f.bin, 'git'));
    const cleaned = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f);
    assert.equal(cleaned.status, 0, cleaned.stderr); assert.equal(git(repository, ['branch', '--list', manifest.worktree.branch]), '');
    assert.equal(existsSync(path.join(f.state, 'runs', id)), false);
    const again = await cli(['clean', '--run', id, '--validated', 'parent-pass', '--apply', '--state-root', f.state], f);
    assert.equal(again.status, 0); assert.equal(again.json.idempotent, true);
    const finalStatus = await cli(['status', '--run', id, '--state-root', f.state], f);
    assert.equal(finalStatus.status, 0); assert.equal(finalStatus.json.state, 'cleaned');
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
    const blocked = await cli(['integrate', '--run', id, '--reviewed', '--checks', 'observed', '--state-root', f.state], f);
    assert.equal(blocked.status, 5); assert.match(blocked.json.error, /dirty/);
    assert.equal(git(repository, ['worktree', 'list', '--porcelain']).includes(result.json.manifest.worktree.path), true);
    rmSync(path.join(result.json.manifest.worktree.path, 'dirty.txt'));
    writeFileSync(path.join(result.json.manifest.worktree.path, 'base.txt'), 'uncommitted\n');
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
    assert.equal(applied.status, 0, applied.stderr); assert.equal(git(repository, ['merge-base', '--is-ancestor', result.json.manifest.worktree.head, 'HEAD']), '');
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
    const manifest = JSON.parse(readFileSync(path.join(f.state, 'runs', id, 'manifest.json'), 'utf8'));
    assert.equal(manifest.integration.state, 'conflict-preflight'); assert.equal(manifest.worktree.path === result.json.manifest.worktree.path, true);
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
  'agent get') echo '{"agent_status":"working","workspace_id":"ws-parent","tab_id":"tab-parent","pane_id":"pane-child","terminal_id":"term-child"}';;
  'agent read') echo 'transcript';;
  'wait agent-status') :;;
  'pane run'|'pane send-keys'|'pane close') :;;
  *) echo '{}';;
esac`);
    const env = { HERDR_ENV: '1', HERDR_SOCKET_PATH: 'sock', HERDR_WORKSPACE_ID: 'ws-parent', HERDR_TAB_ID: 'tab-parent', HERDR_PANE_ID: 'pane-parent', HERDR_TRACE: trace, HERDR_PARENT: repository };
    const started = await cli(['start', '--harness', 'pi', '--backend', 'herdr', '--role', 'scout', '--prompt', 'atomic assignment', '--cwd', repository, '--state-root', f.state], f, env);
    assert.equal(started.status, 0, started.stderr);
    assert.equal(started.json.backend, 'herdr'); assert.equal(started.json.harness, 'pi');
    const calls = readFileSync(trace, 'utf8').split(/\r?\n/);
    const launch = calls.find((line) => line.startsWith('agent start'));
    assert.match(launch, /--no-focus -- .*\/pi --tools read,grep,find,ls$/); assert.doesNotMatch(launch, / -p |atomic assignment/);
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
    const worker = await cli(['start', '--harness', 'pi', '--backend', 'herdr', '--role', 'worker', '--prompt', 'worker assignment', '--cwd', repository, '--state-root', f.state], f, workerEnv);
    assert.equal(worker.status, 0, worker.stderr); assert.equal(worker.json.worktree.manager, 'herdr');
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
