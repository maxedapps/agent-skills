import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'subagents.mjs');
const node = process.execPath;

function temp() {
  // Keep roots short so Unix control sockets stay under macOS sun_path limits.
  const root = mkdtempSync(path.join('/tmp', 'sa-'));
  const bin = path.join(root, 'b');
  const state = path.join(root, 's');
  const cwd = path.join(root, 'c');
  mkdirSync(bin);
  mkdirSync(state, { mode: 0o700 });
  chmodSync(state, 0o700);
  mkdirSync(cwd);
  writeFileSync(path.join(cwd, 'note.txt'), 'hello\n');
  return { root, bin, state, cwd };
}

function pidAbsent(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return true;
  try {
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
}

async function waitAbsent(pids, timeout = 10_000) {
  const unique = [...new Set(pids.filter((pid) => Number.isSafeInteger(pid) && pid > 1))];
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (unique.every(pidAbsent)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const live = unique.filter((pid) => !pidAbsent(pid));
  assert.fail(`teardown: process(es) still live: ${live.join(', ')}`);
}

async function teardownFixture(fixture) {
  const ids = runsOf(fixture);
  for (const id of ids) {
    let recorded;
    try {
      recorded = manifest(fixture, id);
    } catch (error) {
      throw new Error(`teardown: cannot establish ownership for ${id}: ${error.message}`);
    }
    const pids = [recorded.runtime?.pid, recorded.runtime?.pgid].filter(Boolean);
    await cli(['stop', '--run', id, '--state-root', fixture.state], fixture);
    await waitAbsent(pids);
    const cleaned = await cli(['clean', '--run', id, '--state-root', fixture.state, '--apply'], fixture);
    if (cleaned.status !== 0 && cleaned.json?.state !== 'cleaned') {
      throw new Error(`teardown: clean failed for ${id}: ${cleaned.stderr || cleaned.stdout}`);
    }
    await waitAbsent(pids);
  }
  rmSync(fixture.root, { recursive: true, force: true });
}

function executable(file, body) {
  writeFileSync(file, `#!/bin/sh\nset -eu\n${body}\n`);
  chmodSync(file, 0o755);
}

function cli(args, fixture, extraEnv = {}, timeout = 60_000) {
  return new Promise((resolve) => {
    const env = { ...process.env, PATH: `${fixture.bin}:${process.env.PATH}` };
    Object.assign(env, extraEnv);
    const child = spawn(node, [script, ...args], { env });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      let json;
      try { json = JSON.parse(lines.at(-1)); } catch { json = null; }
      resolve({ status: timedOut ? null : code, stdout, stderr, json });
    });
  });
}

function manifest(fixture, id) {
  return JSON.parse(readFileSync(path.join(fixture.state, 'runs', id, 'manifest.json'), 'utf8'));
}

function runsOf(fixture) {
  const directory = path.join(fixture.state, 'runs');
  return existsSync(directory) ? readdirSync(directory) : [];
}

function fakePi(fixture, { version = '0.81.1', mode = 'ok' } = {}) {
  const fake = path.join(fixture.root, `fake-pi-${mode}.mjs`);
  writeFileSync(fake, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

const mode = process.env.FAKE_RPC_MODE || ${JSON.stringify(mode)};
const trace = process.env.FAKE_TRACE;
const args = process.argv.slice(2);
if (trace) appendFileSync(trace, args.join(' ') + '\\n');

if (args[0] === '--version') {
  if (mode === 'bad-version') process.stdout.write('not-a-version\\n');
  else if (mode === 'old-version') process.stdout.write('0.80.0\\n');
  else process.stdout.write(${JSON.stringify(version)} + '\\n');
  process.exit(0);
}

if (!args.includes('--mode') || !args.includes('rpc')) {
  console.error('expected rpc mode');
  process.exit(90);
}

const toolsIdx = args.indexOf('--tools');
const tools = toolsIdx >= 0 ? args[toolsIdx + 1] : '';
const noExtensions = args.includes('--no-extensions');
const noApprove = args.includes('--no-approve');
const systemPromptIdx = args.indexOf('--system-prompt');
const systemPromptFile = systemPromptIdx >= 0 ? args[systemPromptIdx + 1] : '';
const thinkingIdx = args.indexOf('--thinking');
const thinking = thinkingIdx >= 0 ? args[thinkingIdx + 1] : '';
function requireLaunchFlags() {
  if (!process.env.FAKE_REQUIRE_FLAGS) return;
  for (const flag of ['--no-session', '--no-skills', '--no-prompt-templates', '--no-context-files', '--no-approve', '--system-prompt', '--thinking']) {
    if (!args.includes(flag)) {
      console.error('missing ' + flag);
      process.exit(91);
    }
  }
}

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n');
}

function settleOk(text = 'agent-ok', stopReason = 'stop') {
  write({ type: 'agent_start' });
  write({
    type: 'message_end',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
      stopReason,
      errorMessage: stopReason === 'error' ? 'boom' : undefined,
      usage: { input: 3, output: 5, cacheRead: 0, cacheWrite: 0, cost: { total: 0.01 } },
    },
  });
  write({ type: 'agent_end', messages: [], willRetry: false });
  write({ type: 'agent_settled' });
}

async function settleChunked(text = 'chunked-ok') {
  write({ type: 'agent_start' });
  const payload = JSON.stringify({
    type: 'message_end',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
      stopReason: 'stop',
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
    },
  }) + '\\n';
  const buf = Buffer.from(payload, 'utf8');
  process.stdout.write(buf.subarray(0, 7));
  await new Promise((r) => setTimeout(r, 10));
  process.stdout.write(buf.subarray(7, 20));
  await new Promise((r) => setTimeout(r, 10));
  process.stdout.write(buf.subarray(20));
  write({ type: 'agent_settled' });
}

function settleSeparators() {
  write({ type: 'agent_start' });
  write({
    type: 'message_end',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'line\\u2028with\\u2029separators' }],
      stopReason: 'stop',
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
    },
  });
  write({ type: 'agent_settled' });
}

let promptCount = 0;
const decoder = new StringDecoder('utf8');
let buffer = '';

function handleLine(line) {
  let msg;
  try { msg = JSON.parse(line); } catch {
    write({ type: 'response', command: 'parse', success: false, error: 'bad json' });
    return;
  }
  if (msg.type === 'get_state') {
    if (mode === 'handshake-fail') {
      write({ id: msg.id, type: 'response', command: 'get_state', success: false, error: 'nope' });
      return;
    }
    write({
      id: msg.id,
      type: 'response',
      command: 'get_state',
      success: true,
      data: {
        thinkingLevel: 'off',
        isStreaming: false,
        isCompacting: false,
        steeringMode: 'all',
        followUpMode: 'one-at-a-time',
        sessionId: 's',
        autoCompactionEnabled: false,
        messageCount: 0,
        pendingMessageCount: 0,
      },
    });
    return;
  }
  if (msg.type === 'abort') {
    write({ id: msg.id, type: 'response', command: 'abort', success: true });
    // Even hung generations settle after abort so the supervisor can classify timeout/stop.
    write({
      type: 'message_end',
      message: { role: 'assistant', content: [{ type: 'text', text: 'aborted' }], stopReason: 'aborted' },
    });
    write({ type: 'agent_settled' });
    return;
  }
  if (msg.type === 'extension_ui_response') return;
  if (msg.type === 'steer' || msg.type === 'follow_up') {
    write({ id: msg.id, type: 'response', command: msg.type, success: true });
    write({
      type: 'queue_update',
      steering: msg.type === 'steer' ? [msg.message] : [],
      followUp: msg.type === 'follow_up' ? [msg.message] : [],
    });
    return;
  }
  if (msg.type === 'prompt') {
    requireLaunchFlags();
    const handlePrompt = () => {
      write({ id: msg.id, type: 'response', command: 'prompt', success: true });
      promptCount += 1;
      if (mode === 'hang') return;
      if (mode === 'error-stop') return settleOk('failed', 'error');
      if (mode === 'length') return settleOk('cut off', 'length');
      if (mode === 'tool-use') return settleOk('', 'toolUse');
      if (mode === 'missing-text') return settleOk('', 'stop');
      if (mode === 'unknown-stop') return settleOk('x', 'weird');
      if (mode === 'spontaneous-abort') return settleOk('nope', 'aborted');
      if (mode === 'malformed') {
        process.stdout.write('{not-json\\n');
        return;
      }
      if (mode === 'premature-exit') {
        write({ type: 'agent_start' });
        setTimeout(() => process.exit(0), 20);
        return;
      }
      if (mode === 'extension-ui') {
        write({ type: 'extension_ui_request', id: 'ui-1', method: 'confirm', title: 'Allow?', message: 'x' });
        setTimeout(() => settleOk('after-cancel'), 30);
        return;
      }
      if (mode === 'delay' || mode === 'delay-ack') {
        const ms = Number(process.env.FAKE_DELAY_MS || 2000);
        setTimeout(() => settleOk(mode === 'delay-ack' ? 'delayed-ack-ok' : 'delayed-ok'), ms);
        return;
      }
      if (mode === 'role-check') {
        let systemPrompt = '';
        try { systemPrompt = readFileSync(systemPromptFile, 'utf8'); } catch {}
        const payload = JSON.stringify({ tools, noExtensions, noApprove, thinking, systemPromptFile, systemPrompt, prompt: msg.message });
        if (process.env.FAKE_PROMPT) writeFileSync(process.env.FAKE_PROMPT, msg.message);
        return settleOk(payload);
      }
      if (process.env.FAKE_PROMPT) writeFileSync(process.env.FAKE_PROMPT, msg.message);
      if (mode === 'write-file') writeFileSync('child-written.txt', 'from-child\\n');
      if (mode === 'chunk-utf8') return void settleChunked('chunked-ok');
      if (mode === 'ls-separators') return settleSeparators();
      if (promptCount >= 2) {
        if (mode === 'follow-up-fail') return settleOk('failed', 'error');
        if (mode === 'follow-up-hang') return;
        if (mode === 'follow-up-blocked') return settleOk('', 'stop');
      }
      return settleOk(promptCount === 1 ? 'agent-ok' : 'follow-up-ok');
    };
    if (mode === 'delay-ack') {
      const ms = Number(process.env.FAKE_ACK_DELAY_MS || 500);
      setTimeout(handlePrompt, ms);
      return;
    }
    handlePrompt();
    return;
  }
  write({ id: msg.id, type: 'response', command: msg.type, success: false, error: 'unsupported ' + msg.type });
}

process.stdin.on('data', (chunk) => {
  buffer += decoder.write(chunk);
  while (true) {
    const idx = buffer.indexOf('\\n');
    if (idx === -1) break;
    let line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (line.endsWith('\\r')) line = line.slice(0, -1);
    if (line) handleLine(line);
  }
});
process.stdin.on('end', () => {
  buffer += decoder.end();
  if (buffer.trim()) handleLine(buffer.trim());
  process.exit(0);
});
`);
  chmodSync(fake, 0o755);
  executable(path.join(fixture.bin, 'pi'), `exec "${node}" "${fake}" "$@"`);
}

function sentinelGit(fixture) {
  const log = path.join(fixture.root, 'vcs-calls.log');
  executable(path.join(fixture.bin, 'git'), `echo "$@" >>"${log}"; echo 'should not be called' >&2; exit 97`);
  return log;
}

async function waitState(fixture, id, predicate, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await cli(['status', '--run', id, '--state-root', fixture.state], fixture);
    if (last.json && predicate(last.json, last)) return last;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`state wait failed: ${last?.stdout} ${last?.stderr}`);
}

describe('subagents Pi RPC CLI', { concurrency: 2 }, async () => {
  test('help exposes exactly six commands and rejects removed options', { timeout: 120_000 }, async () => {
    const f = temp();
    try {
      const help = await cli(['--help'], f);
      assert.equal(help.status, 0);
      assert.deepEqual(help.json.help.commands, ['info', 'run', 'status', 'send', 'stop', 'clean']);
      assert.equal(help.json.help.usage, 'subagents.mjs <info|run|status|send|stop|clean> [options]');
      assert.doesNotMatch(JSON.stringify(help.json.help), /integrate|harness|herdr|claude|codex|grok|kimi/);
      for (const removed of ['integrate', 'doctor', 'list']) {
        const result = await cli([removed], f);
        assert.equal(result.status, 2);
      }
      const harness = await cli(['run', '--harness', 'pi', '--role', 'scout', '--prompt', 'x', '--cwd', f.cwd], f);
      assert.equal(harness.status, 2);
      assert.match(harness.json.error, /unknown option/);
    } finally {
      await teardownFixture(f);
    }
  });

  test('assignment resource preserves parser sections and complete role contracts without VCS ownership', { timeout: 180_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'role-check' });
      const template = readFileSync(path.resolve(path.dirname(script), '..', 'assets', 'assignment-prompts.md'), 'utf8');
      for (const heading of ['## Shared envelope', '## Scout variant', '## Research variant', '## Worker variant']) {
        assert.equal(template.split(heading).length - 1, 1);
        assert.equal(template.slice(template.indexOf(heading)).startsWith(`${heading}\n\n\`\`\`text`), true);
      }
      const expectedTools = {
        scout: 'read,grep,find,ls',
        research: 'read,grep,find,ls,web_search,fetch_content,get_search_content',
        worker: 'read,grep,find,ls,bash,edit,write',
      };
      for (const role of Object.keys(expectedTools)) {
        const promptFile = path.join(f.root, `${role}.prompt`);
        const result = await cli([
          'run', '--role', role, '--prompt', `inspect ${role} contract`,
          '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
        ], f, { FAKE_PROMPT: promptFile, FAKE_REQUIRE_FLAGS: '1' });
        assert.equal(result.status, 0, `${role}: ${result.stderr}`);
        assert.equal(result.json.state, 'idle');
        const assignment = readFileSync(promptFile, 'utf8');
        assert.match(assignment, new RegExp(`Assignment type: ${role}`));
        assert.match(assignment, new RegExp(`Authorized working directory: ${realpathSync(f.cwd)}`));
        assert.match(assignment, new RegExp(`Allowed tools: ${expectedTools[role]}`));
        assert.match(assignment, /Never delegate, spawn, invoke, or coordinate another agent or subagent/);
        assert.match(assignment, /Never run Git commands|never run version-control commands|VCS guard/i);
        assert.match(assignment, /SUBAGENTS_NO_DELEGATION=1/);
        assert.doesNotMatch(assignment, /<[^>]+>/);
        assert.doesNotMatch(assignment, /Base commit|create one task-only commit|owned isolated worktree/);
        const payload = JSON.parse(result.json.output);
        assert.equal(payload.tools, expectedTools[role]);
        assert.equal(payload.noApprove, true);
        assert.equal(payload.noExtensions, role !== 'research');
        assert.equal(payload.thinking, role === 'scout' ? 'medium' : 'high');
        assert.match(payload.systemPrompt, /Follow the assigned task and any additional instructions precisely/);
        if (role === 'scout') assert.match(payload.systemPrompt, /Inspect the requested repository scope read-only/);
        if (role === 'research') assert.match(payload.systemPrompt, /Perform in-depth research on the assigned question/);
        if (role === 'worker') {
          assert.match(payload.systemPrompt, /Implement only the bounded assigned task/);
          assert.match(payload.systemPrompt, /Never run version-control commands/);
        }
        const onDisk = readFileSync(path.join(f.state, 'runs', result.json.runId, 'system-prompt.txt'), 'utf8');
        assert.equal(onDisk.trim(), payload.systemPrompt.trim());
      }
    } finally {
      await teardownFixture(f);
    }
  });

  test('info gates version and handshake without creating run state', { timeout: 120_000 }, async () => {
    const f = temp();
    try {
      fakePi(f);
      const ok = await cli(['info', '--state-root', f.state], f);
      assert.equal(ok.status, 0, ok.stderr);
      assert.equal(ok.json.runtime, 'pi-rpc');
      assert.equal(ok.json.pi.rpcHandshake, true);
      assert.equal(ok.json.pi.version, '0.81.1');
      assert.equal(existsSync(path.join(f.state, 'runs')), false);

      fakePi(f, { mode: 'old-version' });
      const old = await cli(['info', '--state-root', f.state], f);
      assert.equal(old.status, 3);
      assert.match(old.json.error, /unsupported|0\\.80\\.0/);
      assert.equal(existsSync(path.join(f.state, 'runs')), false);

      fakePi(f, { mode: 'bad-version' });
      const bad = await cli(['info', '--state-root', f.state], f);
      assert.equal(bad.status, 3);
      assert.match(bad.json.error, /unparseable/);

      fakePi(f, { mode: 'handshake-fail' });
      const hs = await cli(['info', '--state-root', f.state], f);
      assert.equal(hs.status, 3);
      assert.match(hs.json.error, /get_state|handshake|failed/i);
    } finally {
      await teardownFixture(f);
    }
  });

  test('run rejects unsupported pi before creating run state', { timeout: 60_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'old-version' });
      const result = await cli([
        'run', '--role', 'scout', '--prompt', 'x', '--cwd', f.cwd, '--state-root', f.state,
      ], f);
      assert.equal(result.status, 3);
      assert.equal(existsSync(path.join(f.state, 'runs')), false);
    } finally {
      await teardownFixture(f);
    }
  });

  test('blocking scout run reaches idle with bounded output and usage; follow-up increments generation', { timeout: 180_000 }, async () => {
    const f = temp();
    try {
      fakePi(f);
      const gitLog = sentinelGit(f);
      const run = await cli([
        'run', '--role', 'scout', '--prompt', 'map one thing',
        '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
      ], f);
      assert.equal(run.status, 0, run.stderr);
      assert.equal(run.json.state, 'idle');
      assert.equal(run.json.generation, 1);
      assert.equal(run.json.cwd, realpathSync(f.cwd));
      assert.match(run.json.output, /agent-ok/);
      assert.equal(run.json.runtime.live, true);
      assert.ok(run.json.usage);
      assert.equal('backend' in run.json, false);
      assert.equal('harness' in run.json, false);
      assert.equal(existsSync(gitLog), false);

      const id = run.json.runId;
      const sent = await cli([
        'send', '--run', id, '--message', 'continue same assignment',
        '--state-root', f.state, '--wait', '--timeout', '10000',
      ], f);
      assert.equal(sent.status, 0, sent.stderr);
      assert.equal(sent.json.generation, 2);
      assert.equal(sent.json.state, 'idle');
      assert.match(sent.json.output, /follow-up-ok/);

      const listed = await cli(['status', '--state-root', f.state], f);
      assert.equal(listed.status, 0);
      assert.equal(listed.json.runs.length, 1);
      assert.equal(listed.json.runs[0].runId, id);

      const stopped = await cli(['stop', '--run', id, '--state-root', f.state], f);
      assert.equal(stopped.status, 0, stopped.stderr);
      await waitState(f, id, (json) => json.runtime.live === false || json.state === 'stopped');

      const dry = await cli(['clean', '--run', id, '--state-root', f.state], f);
      assert.equal(dry.status, 0, dry.stderr);
      assert.equal(dry.json.dryRun, true);
      assert.equal(existsSync(path.join(f.state, 'runs', id)), true);
      assert.equal(readFileSync(path.join(f.cwd, 'note.txt'), 'utf8'), 'hello\n');

      const cleaned = await cli(['clean', '--run', id, '--state-root', f.state, '--apply'], f);
      assert.equal(cleaned.status, 0, cleaned.stderr);
      assert.equal(cleaned.json.state, 'cleaned');
      assert.equal(existsSync(path.join(f.state, 'runs', id)), false);
      assert.equal(existsSync(path.join(f.state, 'cleaned', `${id}.json`)), true);
      assert.equal(readFileSync(path.join(f.cwd, 'note.txt'), 'utf8'), 'hello\n');

      const again = await cli(['clean', '--run', id, '--state-root', f.state, '--apply'], f);
      assert.equal(again.status, 0);
      assert.equal(again.json.idempotent, true);
    } finally {
      await teardownFixture(f);
    }
  });

  test('async run, private state provenance, copied-manifest denial, and concurrent distinct runs', { timeout: 180_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'delay' });
      const a = await cli([
        'run', '--role', 'scout', '--prompt', 'a', '--cwd', f.cwd, '--state-root', f.state,
        '--timeout', '10000', '--async',
      ], f, { FAKE_DELAY_MS: '800' });
      const b = await cli([
        'run', '--role', 'worker', '--prompt', 'b', '--cwd', f.cwd, '--state-root', f.state,
        '--timeout', '10000', '--async',
      ], f, { FAKE_DELAY_MS: '800' });
      assert.equal(a.status, 0, a.stderr);
      assert.equal(b.status, 0, b.stderr);
      assert.notEqual(a.json.runId, b.json.runId);
      assert.equal(statSync(f.state).mode & 0o777, 0o700);
      assert.equal(statSync(path.join(f.state, 'runs', a.json.runId, 'manifest.json')).mode & 0o777, 0o600);

      const foreignRoot = path.join(f.root, 'foreign-state');
      mkdirSync(foreignRoot, { mode: 0o700 });
      chmodSync(foreignRoot, 0o700);
      mkdirSync(path.join(foreignRoot, 'runs', a.json.runId), { recursive: true, mode: 0o700 });
      cpSync(
        path.join(f.state, 'runs', a.json.runId, 'manifest.json'),
        path.join(foreignRoot, 'runs', a.json.runId, 'manifest.json'),
      );
      const denied = await cli(['status', '--run', a.json.runId, '--state-root', foreignRoot], f);
      assert.equal(denied.status, 5);
      assert.match(denied.json.error, /provenance/);

      await waitState(f, a.json.runId, (json) => json.state === 'idle');
      await waitState(f, b.json.runId, (json) => json.state === 'idle');
      await cli(['stop', '--run', a.json.runId, '--state-root', f.state], f);
      await cli(['stop', '--run', b.json.runId, '--state-root', f.state], f);
    } finally {
      await teardownFixture(f);
    }
  });

  test('classification matrix: error, length, tool-use, missing text, unknown stop, spontaneous abort', { timeout: 300_000 }, async () => {
    const cases = [
      { mode: 'error-stop', state: 'failed', status: 6 },
      { mode: 'length', state: 'blocked', status: 5 },
      { mode: 'tool-use', state: 'blocked', status: 5 },
      { mode: 'missing-text', state: 'blocked', status: 5 },
      { mode: 'unknown-stop', state: 'blocked', status: 5 },
      { mode: 'spontaneous-abort', state: 'blocked', status: 5 },
    ];
    for (const entry of cases) {
      const f = temp();
      try {
        fakePi(f, { mode: entry.mode });
        const result = await cli([
          'run', '--role', 'scout', '--prompt', entry.mode,
          '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
        ], f);
        assert.equal(result.status, entry.status, `${entry.mode}: ${result.stderr}`);
        const runs = runsOf(f);
        assert.equal(runs.length, 1, entry.mode);
        const status = await cli(['status', '--run', runs[0], '--state-root', f.state], f);
        assert.equal(status.json.state, entry.state, `${entry.mode}: ${status.stdout}`);
      } finally {
        await teardownFixture(f);
      }
    }
  });

  test('timeout abort classifies timedout; explicit stop ends a live run', { timeout: 180_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'hang' });
      const timed = await cli([
        'run', '--role', 'scout', '--prompt', 'hang',
        '--cwd', f.cwd, '--state-root', f.state, '--timeout', '500',
      ], f);
      assert.equal(timed.status, 4, timed.stderr);
      const runs = runsOf(f);
      const status = await cli(['status', '--run', runs[0], '--state-root', f.state], f);
      assert.equal(status.json.state, 'timedout');
      const f2 = temp();
      try {
        fakePi(f2, { mode: 'delay' });
        const asyncRun = await cli([
          'run', '--role', 'scout', '--prompt', 'stop-me',
          '--cwd', f2.cwd, '--state-root', f2.state, '--timeout', '20000', '--async',
        ], f2, { FAKE_DELAY_MS: '10000' });
        assert.equal(asyncRun.status, 0, asyncRun.stderr);
        await waitState(f2, asyncRun.json.runId, (json) => json.state === 'running');
        const stopped = await cli(['stop', '--run', asyncRun.json.runId, '--state-root', f2.state], f2);
        assert.equal(stopped.status, 0, stopped.stderr);
        await waitState(f2, asyncRun.json.runId, (json) => json.runtime.live === false || json.state === 'stopped');
      } finally {
        await teardownFixture(f2);
      }
    } finally {
      await teardownFixture(f);
    }
  });

  test('UTF-8 chunk boundaries and U+2028/U+2029 inside JSON strings', { timeout: 120_000 }, async () => {
    for (const mode of ['chunk-utf8', 'ls-separators']) {
      const f = temp();
      try {
        fakePi(f, { mode });
        const result = await cli([
          'run', '--role', 'scout', '--prompt', mode,
          '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
        ], f);
        assert.equal(result.status, 0, `${mode}: ${result.stderr}`);
        assert.equal(result.json.state, 'idle');
        if (mode === 'chunk-utf8') assert.match(result.json.output, /chunked-ok/);
        if (mode === 'ls-separators') assert.match(result.json.output, /line\u2028with\u2029separators/);
        await cli(['stop', '--run', result.json.runId, '--state-root', f.state], f);
      } finally {
        await teardownFixture(f);
      }
    }
  });

  test('control socket rejects bad nonce; active send requires behavior', { timeout: 120_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'delay' });
      const run = await cli([
        'run', '--role', 'scout', '--prompt', 'live',
        '--cwd', f.cwd, '--state-root', f.state, '--timeout', '20000', '--async',
      ], f, { FAKE_DELAY_MS: '3000' });
      assert.equal(run.status, 0, run.stderr);
      await waitState(f, run.json.runId, (json) => json.state === 'running' && json.runtime?.live === true);

      const noBehavior = await cli([
        'send', '--run', run.json.runId, '--message', 'nudge', '--state-root', f.state,
      ], f);
      assert.ok(noBehavior.status !== 0);
      assert.match(noBehavior.json.error, /behavior/);

      const steered = await cli([
        'send', '--run', run.json.runId, '--message', 'steer now',
        '--behavior', 'steer', '--state-root', f.state,
      ], f);
      assert.equal(steered.status, 0, steered.stderr);

      const m = manifest(f, run.json.runId);
      const denied = await new Promise((resolve) => {
        const socket = createConnection(m.controlSocket);
        let data = '';
        socket.on('connect', () => socket.write(`${JSON.stringify({ nonce: 'wrong', type: 'status' })}\n`));
        socket.on('data', (chunk) => { data += chunk; });
        socket.on('end', () => resolve(JSON.parse(data.trim())));
        socket.on('error', (error) => resolve({ ok: false, error: error.message }));
      });
      assert.equal(denied.ok, false);
      assert.match(denied.error, /nonce/);

      await waitState(f, run.json.runId, (json) => json.state === 'idle');
      await cli(['stop', '--run', run.json.runId, '--state-root', f.state], f);
    } finally {
      await teardownFixture(f);
    }
  });

  test('extension UI dialogs are cancelled; malformed stdout and premature exit block', { timeout: 180_000 }, async () => {
    for (const mode of ['extension-ui', 'malformed', 'premature-exit']) {
      const f = temp();
      try {
        fakePi(f, { mode });
        const result = await cli([
          'run', '--role', 'research', '--prompt', mode,
          '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
        ], f);
        if (mode === 'extension-ui') {
          assert.equal(result.status, 0, result.stderr);
          assert.equal(result.json.state, 'idle');
          assert.match(result.json.output, /after-cancel/);
          await cli(['stop', '--run', result.json.runId, '--state-root', f.state], f);
        } else {
          assert.ok(result.status !== 0, mode);
          const runs = runsOf(f);
          const status = await cli(['status', '--run', runs[0], '--state-root', f.state], f);
          assert.ok(['blocked', 'failed'].includes(status.json.state), `${mode}: ${status.stdout}`);
        }
      } finally {
        await teardownFixture(f);
      }
    }
  });

  test('accepts dirty non-repo cwd and never invokes sentinel git; clean leaves cwd untouched', { timeout: 120_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'write-file' });
      const gitLog = sentinelGit(f);
      writeFileSync(path.join(f.cwd, 'dirty.txt'), 'dirt\n');
      const before = readFileSync(path.join(f.cwd, 'dirty.txt'), 'utf8');
      const run = await cli([
        'run', '--role', 'worker', '--prompt', 'touch file',
        '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
      ], f);
      assert.equal(run.status, 0, run.stderr);
      assert.equal(existsSync(path.join(f.cwd, 'child-written.txt')), true);
      assert.equal(existsSync(gitLog), false);
      await cli(['stop', '--run', run.json.runId, '--state-root', f.state], f);
      await waitState(f, run.json.runId, (json) => json.runtime.live === false || json.state === 'stopped');
      const cleaned = await cli(['clean', '--run', run.json.runId, '--state-root', f.state, '--apply'], f);
      assert.equal(cleaned.status, 0, cleaned.stderr);
      assert.equal(readFileSync(path.join(f.cwd, 'dirty.txt'), 'utf8'), before);
      assert.equal(existsSync(path.join(f.cwd, 'child-written.txt')), true);
      assert.equal(existsSync(gitLog), false);
    } finally {
      await teardownFixture(f);
    }
  });

  test('async launch waits for delayed prompt ack and control readiness before steer succeeds', { timeout: 120_000 }, async () => {
    const f = temp();
    try {
      fakePi(f, { mode: 'delay-ack' });
      const startedAt = Date.now();
      const run = await cli([
        'run', '--role', 'scout', '--prompt', 'delayed-ack',
        '--cwd', f.cwd, '--state-root', f.state, '--timeout', '15000', '--async',
      ], f, { FAKE_ACK_DELAY_MS: '700', FAKE_DELAY_MS: '1500' });
      const elapsed = Date.now() - startedAt;
      assert.equal(run.status, 0, run.stderr);
      assert.ok(elapsed >= 650, `async launch returned too early (${elapsed}ms)`);
      assert.ok(run.json.runtime?.socketPath || existsSync(path.join(f.state, 'runs', run.json.runId, 's.sock')));

      const steered = await cli([
        'send', '--run', run.json.runId, '--message', 'steer now',
        '--behavior', 'steer', '--state-root', f.state,
      ], f);
      assert.equal(steered.status, 0, steered.stderr);
      assert.equal(steered.json.sent, true);

      await waitState(f, run.json.runId, (json) => json.state === 'idle');
      await cli(['stop', '--run', run.json.runId, '--state-root', f.state], f);
    } finally {
      await teardownFixture(f);
    }
  });

  test('send --wait fail-closed for failed, timed-out, and blocked generation 2', { timeout: 180_000 }, async () => {
    const cases = [
      { mode: 'follow-up-fail', status: 6, state: 'failed' },
      { mode: 'follow-up-hang', status: 4, state: 'timedout', timeout: '500' },
      { mode: 'follow-up-blocked', status: 5, state: 'blocked' },
    ];
    for (const entry of cases) {
      const f = temp();
      try {
        fakePi(f, { mode: entry.mode });
        const run = await cli([
          'run', '--role', 'scout', '--prompt', entry.mode,
          '--cwd', f.cwd, '--state-root', f.state, '--timeout', '10000',
        ], f);
        assert.equal(run.status, 0, `${entry.mode} launch: ${run.stderr}`);
        assert.equal(run.json.state, 'idle', entry.mode);

        const sent = await cli([
          'send', '--run', run.json.runId, '--message', 'generation two',
          '--state-root', f.state, '--wait', '--timeout', entry.timeout ?? '10000',
        ], f);
        assert.equal(sent.status, entry.status, `${entry.mode}: ${sent.stderr} ${sent.stdout}`);
        assert.equal(sent.json.ok, false, entry.mode);
        assert.equal(sent.json.details?.manifest?.state ?? sent.json.details?.state, entry.state, entry.mode);
      } finally {
        await teardownFixture(f);
      }
    }
  });

  test('source has no vendor or VCS runtime dependencies', { timeout: 30_000 }, async () => {
    const source = readFileSync(script, 'utf8');
    assert.doesNotMatch(source, /\b(git|herdr|claude|codex|grok|kimi|integrate)\b/i);
  });
});
