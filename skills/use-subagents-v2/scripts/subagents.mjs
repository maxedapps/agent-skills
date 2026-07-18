#!/usr/bin/env node

import { accessSync, closeSync, constants, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCHEMA = 1;
const EX = Object.freeze({ usage: 2, unsupported: 3, timeout: 4, safety: 5, runtime: 6 });
const TERMINAL = new Set(['completed', 'failed', 'timedout', 'stopped', 'cleaned']);
const BACKENDS = new Set(['pi', 'claude', 'codex', 'grok', 'kimi']);
const ROLES = new Set(['scout', 'research', 'worker']);
const COMMANDS = new Set(['doctor', 'run', 'start', 'status', 'wait', 'logs', 'send', 'stop', 'integrate', 'clean']);
const SCRIPT = fileURLToPath(import.meta.url);
const MAX_CAPTURE = 1024 * 1024;
const HELP = {
  usage: 'subagents.mjs <doctor|run|start|status|wait|logs|send|stop|integrate|clean> [options]',
  common: ['--state-root PATH', '--help'],
  launch: ['--backend pi|claude|codex|grok|kimi', '--harness standalone|herdr', '--role scout|research|worker', '--assignment FILE|--prompt TEXT', '--cwd PATH', '--timeout MS', '--async'],
  lifecycle: ['--run ID', 'integrate: --reviewed --checks TEXT [--strategy ff-only|merge] [--apply]', 'clean worker: --validated TEXT [--apply]'],
  prerequisites: ['Node.js 20+ on macOS/Linux for standalone async control', 'Git repository and clean parent checkout for workers', 'authenticated supported agent CLI', 'verified in-pane Herdr environment for --harness herdr'],
  state: 'owned mode-0700 runs live under --state-root or the OS temporary directory; retain ambiguous runs',
  exits: { 0: 'success', 2: 'usage', 3: 'unsupported capability', 4: 'timeout', 5: 'blocked safety gate', 6: 'runtime failure' },
  safety: 'integrate and clean are dry-run by default and mutate only with --apply; cleanup is never forced',
};

class CliError extends Error {
  constructor(message, code = EX.runtime, details) { super(message); this.code = code; this.details = details; }
}

function out(value) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function diagnostic(message) { process.stderr.write(`${message}\n`); }
function fail(message, code, details) { throw new CliError(message, code, details); }
function now() { return new Date().toISOString(); }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function bounded(value, max = MAX_CAPTURE) {
  const text = String(value ?? '');
  return text.length <= max ? text : `${text.slice(0, max)}\n[truncated ${text.length - max} characters]`;
}
function slug(value) { return String(value).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80); }
function isPid(value) { return Number.isSafeInteger(value) && value > 1; }
function atomicJson(file, value, mode = 0o600) {
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode });
  renameSync(temporary, file);
}
function parseJson(text, label) {
  try { return JSON.parse(text); } catch { fail(`${label} did not return valid JSON`, EX.unsupported, { output: bounded(text, 4096) }); }
}
function runCmd(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout ?? 15000,
    maxBuffer: MAX_CAPTURE,
  });
  return { status: result.status, signal: result.signal, stdout: bounded(result.stdout), stderr: bounded(result.stderr), error: result.error?.message };
}
function mustCmd(command, args, options = {}, code = EX.runtime) {
  const result = runCmd(command, args, options);
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed`, code, result);
  return result;
}
function git(cwd, args, code = EX.safety) { return mustCmd('git', ['-C', cwd, ...args], {}, code).stdout.trim(); }
function gitResult(cwd, args) { return runCmd('git', ['-C', cwd, ...args]); }
function canonicalDirectory(directory) {
  const resolved = realpathSync(directory);
  const metadata = statSync(resolved);
  if (!metadata.isDirectory()) fail(`not a directory: ${directory}`, EX.usage);
  return resolved;
}
function directoryIdentity(directory) {
  const realpath = canonicalDirectory(directory);
  const st = statSync(realpath);
  return { realpath, dev: String(st.dev), ino: String(st.ino), uid: st.uid, mode: st.mode & 0o777 };
}
function sameIdentity(a, b) { return a?.realpath === b.realpath && a?.dev === b.dev && a?.ino === b.ino && a?.uid === b.uid; }

function defaultStateRoot() { return path.join(tmpdir(), `subagents-${process.getuid?.() ?? 'user'}`); }
function getStateRoot(options, create = true) {
  const requested = path.resolve(options['state-root'] ?? process.env.SUBAGENTS_STATE_ROOT ?? defaultStateRoot());
  if (create) mkdirSync(requested, { recursive: true, mode: 0o700 });
  let identity;
  try { identity = directoryIdentity(requested); } catch (error) { fail(`cannot access state root: ${error.message}`, EX.safety); }
  if ((identity.mode & 0o077) !== 0) fail('state root must have mode 0700', EX.safety, identity);
  return identity;
}
function runsRoot(root) { const p = path.join(root.realpath, 'runs'); mkdirSync(p, { recursive: true, mode: 0o700 }); return p; }
function manifestPath(root, id) { return path.join(runsRoot(root), slug(id), 'manifest.json'); }
function saveManifest(manifest) {
  manifest.updatedAt = now();
  atomicJson(path.join(manifest.runDir, 'manifest.json'), manifest);
}
function cleanedPath(root, id) { return path.join(root.realpath, 'cleaned', `${slug(id)}.json`); }
function loadTombstone(options) {
  if (!options.run) return null;
  const root = getStateRoot(options, false);
  try {
    const record = JSON.parse(readFileSync(cleanedPath(root, options.run), 'utf8'));
    return record.schema === SCHEMA && record.runId === options.run ? record : null;
  } catch { return null; }
}
function retireRun(manifest, disposition) {
  const currentRunDir = directoryIdentity(manifest.runDir);
  if (!sameIdentity(manifest.runDirIdentity, currentRunDir)) fail('run state identity changed before retirement', EX.safety);
  const directory = path.join(manifest.stateRoot.realpath, 'cleaned');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  atomicJson(cleanedPath(manifest.stateRoot, manifest.runId), { schema: SCHEMA, runId: manifest.runId, state: 'cleaned', cleanedAt: now(), disposition });
  rmSync(manifest.runDir, { recursive: true });
}
function loadManifest(options) {
  const id = options.run;
  if (!id) fail('--run is required', EX.usage);
  const root = getStateRoot(options, false);
  const file = manifestPath(root, id);
  let manifest;
  try { manifest = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { fail(`cannot load run ${id}: ${error.message}`, EX.usage); }
  const currentRunDir = directoryIdentity(path.dirname(file));
  if (manifest.schema !== SCHEMA || manifest.runId !== id || manifest.runDir !== currentRunDir.realpath ||
      !sameIdentity(manifest.stateRoot, root) || !sameIdentity(manifest.runDirIdentity, currentRunDir)) {
    fail('manifest provenance mismatch; control denied', EX.safety);
  }
  return manifest;
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return { help: true, command: argv[0] };
  const command = argv.shift();
  if (!COMMANDS.has(command) && command !== '__wrapper') fail(`unknown command: ${command}`, EX.usage);
  const booleans = new Set(['apply', 'reviewed', 'async']);
  const options = { command };
  while (argv.length) {
    const token = argv.shift();
    if (!token.startsWith('--')) fail(`unexpected argument: ${token}`, EX.usage);
    const key = token.slice(2);
    if (booleans.has(key)) { options[key] = true; continue; }
    if (!argv.length || argv[0].startsWith('--')) fail(`missing value for ${token}`, EX.usage);
    if (options[key] !== undefined) fail(`duplicate option: ${token}`, EX.usage);
    options[key] = argv.shift();
  }
  const allowed = new Set(['state-root', 'backend', 'harness', 'role', 'assignment', 'prompt', 'cwd', 'timeout', 'run', 'lines', 'message', 'reviewed', 'checks', 'strategy', 'apply', 'validated', 'async']);
  for (const key of Object.keys(options)) if (key !== 'command' && !allowed.has(key)) fail(`unknown option: --${key}`, EX.usage);
  return options;
}
function integerOption(options, key, fallback, min = 1, max = 86_400_000) {
  if (options[key] === undefined) return fallback;
  const n = Number(options[key]);
  if (!Number.isSafeInteger(n) || n < min || n > max) fail(`--${key} must be an integer from ${min} to ${max}`, EX.usage);
  return n;
}

function commandPath(name) {
  if (name.includes(path.sep)) {
    try { accessSync(name, constants.X_OK); return realpathSync(name); } catch { fail(`executable not found: ${name}`, EX.unsupported); }
  }
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, name);
    try { accessSync(candidate, constants.X_OK); return realpathSync(candidate); } catch { /* keep searching */ }
  }
  fail(`executable not found: ${name}`, EX.unsupported);
}
const ADAPTERS = {
  pi: {
    executable: 'pi', help: [['--help']], tokens: ['-p', '--tools', '--no-session'], readerTokens: ['--tools'],
    build(role) { const tools = role === 'worker' ? 'read,bash,edit,write,grep,find,ls' : role === 'research' ? 'read,grep,find,ls,web_search,fetch_content,get_search_content' : 'read,grep,find,ls'; return ['-p', '--no-session', ...(role === 'research' ? [] : ['--no-extensions']), '--no-skills', '--no-prompt-templates', '--no-context-files', '--tools', tools]; },
    interactive(role) { const tools = role === 'worker' ? 'read,bash,edit,write,grep,find,ls' : role === 'research' ? 'read,grep,find,ls,web_search,fetch_content,get_search_content' : 'read,grep,find,ls'; return ['--tools', tools]; },
  },
  claude: {
    executable: 'claude', help: [['--help']], tokens: ['-p', '--permission-mode', '--tools'], readerTokens: ['plan'],
    build(role) { const tools = role === 'worker' ? 'Read,Grep,Glob,Bash,Edit,Write' : role === 'research' ? 'Read,Grep,Glob,WebSearch,WebFetch' : 'Read,Grep,Glob'; return ['-p', '--no-session-persistence', '--permission-mode', role === 'worker' ? 'dontAsk' : 'plan', '--tools', tools]; },
    interactive(role) { const tools = role === 'worker' ? 'Read,Grep,Glob,Bash,Edit,Write' : role === 'research' ? 'Read,Grep,Glob,WebSearch,WebFetch' : 'Read,Grep,Glob'; return ['--permission-mode', role === 'worker' ? 'dontAsk' : 'plan', '--tools', tools]; },
  },
  codex: {
    executable: 'codex', help: [['--help'], ['exec', '--help']], tokens: ['exec', '--sandbox', '--ephemeral'], readerTokens: ['read-only'], researchTokens: ['--search'],
    build(role, _promptFile, _runtime, _prompt, cwd) { return [...(role === 'research' ? ['--search'] : []), 'exec', '-C', cwd, '--sandbox', role === 'worker' ? 'workspace-write' : 'read-only', '--ephemeral', '-']; },
    interactive(role) { return [...(role === 'research' ? ['--search'] : []), '--sandbox', role === 'worker' ? 'workspace-write' : 'read-only']; },
  },
  grok: {
    executable: 'grok', help: [['--help']], tokens: ['--single', '--permission-mode', '--no-subagents'], readerTokens: ['plan'],
    build(role, promptFile, runtime, prompt) {
      const common = ['--permission-mode', role === 'worker' ? 'auto' : 'plan', '--no-subagents', '--no-memory', '--output-format', 'json'];
      return runtime.promptFile ? ['--prompt-file', promptFile, ...common] : ['--single', prompt, ...common];
    },
    interactive(role) { return ['--permission-mode', role === 'worker' ? 'auto' : 'plan', '--no-subagents']; },
  },
  kimi: { executable: 'kimi', help: [['--help']], tokens: ['-p'], readerTokens: ['--plan'], build(_role, _promptFile, _runtime, prompt) { return ['-p', prompt]; }, interactive(role) { return [role === 'worker' ? '--auto' : '--plan']; } },
};
function probeBackend(name, role, harness = 'standalone') {
  if (!BACKENDS.has(name)) fail(`unsupported backend: ${name}`, EX.unsupported);
  if (harness === 'standalone' && name === 'kimi' && role !== 'worker') fail('standalone Kimi readers are unsupported', EX.unsupported);
  const adapter = ADAPTERS[name];
  const executable = commandPath(adapter.executable);
  let combined = '';
  const probes = [];
  for (const args of adapter.help) {
    const result = runCmd(executable, args);
    probes.push({ args, status: result.status, stdout: bounded(result.stdout, 16384), stderr: bounded(result.stderr, 16384) });
    if (result.status !== 0) fail(`${name} help probe failed`, EX.unsupported, probes);
    combined += `\n${result.stdout}\n${result.stderr}`;
  }
  const tokenPresent = (token) => new RegExp(`(^|[^A-Za-z0-9_-])${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?=$|[^A-Za-z0-9_-])`, 'm').test(combined);
  for (const token of adapter.tokens) if (!tokenPresent(token)) fail(`${name} help does not prove required token ${token}`, EX.unsupported, probes);
  if (role !== 'worker') for (const token of adapter.readerTokens) if (!tokenPresent(token)) fail(`${name} help does not prove reader token ${token}`, EX.unsupported, probes);
  if (role === 'research') for (const token of adapter.researchTokens ?? []) if (!tokenPresent(token)) fail(`${name} help does not prove research token ${token}`, EX.unsupported, probes);
  const version = runCmd(executable, ['--version']);
  if (version.status !== 0) fail(`${name} version probe failed`, EX.unsupported, version);
  return { executable, version: bounded(version.stdout || version.stderr, 4096).trim(), probes, adapter, promptFile: name === 'grok' && combined.includes('--prompt-file') };
}
function currentHerdrContext(executable) {
  const keys = ['HERDR_SOCKET_PATH', 'HERDR_WORKSPACE_ID', 'HERDR_TAB_ID', 'HERDR_PANE_ID'];
  if (process.env.HERDR_ENV !== '1' || keys.some((key) => !process.env[key])) fail('Herdr environment is incomplete', EX.unsupported);
  const statusJson = parseJson(mustCmd(executable, ['status', '--json'], {}, EX.unsupported).stdout, 'herdr status');
  if (statusJson.server?.compatible !== true || statusJson.server?.socket !== process.env.HERDR_SOCKET_PATH) fail('Herdr client/server compatibility or socket identity is not proven', EX.unsupported, statusJson);
  const current = parseJson(mustCmd(executable, ['pane', 'current', '--current'], {}, EX.unsupported).stdout, 'herdr pane current');
  const expected = { workspace: process.env.HERDR_WORKSPACE_ID, tab: process.env.HERDR_TAB_ID, pane: process.env.HERDR_PANE_ID };
  const actual = { workspace: pick(current, ['workspaceId', 'workspace_id']), tab: pick(current, ['tabId', 'tab_id']), pane: pick(current, ['paneId', 'pane_id']) };
  if (actual.workspace !== expected.workspace || actual.tab !== expected.tab || actual.pane !== expected.pane) fail('Herdr current pane topology does not match the caller environment', EX.safety, { expected, actual });
  return { status: statusJson, current };
}
function probeHerdr() {
  if (process.env.HERDR_ENV !== '1') fail('Herdr environment is incomplete', EX.unsupported);
  const executable = commandPath('herdr');
  const helpForms = [['--help'], ['agent', '--help'], ['pane', '--help'], ['wait', '--help'], ['worktree', '--help']];
  const probes = helpForms.map((args) => ({ args, ...runCmd(executable, args) }));
  if (probes.some((p) => p.status !== 0)) fail('Herdr help probe failed', EX.unsupported, probes);
  const version = runCmd(executable, ['--version']);
  if (version.status !== 0) fail('Herdr version probe failed', EX.unsupported, version);
  probes.push({ args: ['--version'], ...version });
  const help = probes.map((p) => `${p.stdout}\n${p.stderr}`).join('\n');
  for (const token of ['--no-focus', 'current', 'run', 'send-keys', 'close', 'agent-status', 'create', 'remove']) if (!help.includes(token)) fail(`Herdr help does not prove ${token}`, EX.unsupported);
  const context = currentHerdrContext(executable);
  const integration = mustCmd(executable, ['integration', 'status'], {}, EX.unsupported).stdout;
  return { executable, probes, ...context, integration };
}

function repository(cwd) {
  const checkout = canonicalDirectory(git(cwd, ['rev-parse', '--show-toplevel'], EX.usage));
  const commonRaw = git(checkout, ['rev-parse', '--git-common-dir']);
  const commonDir = canonicalDirectory(path.resolve(checkout, commonRaw));
  const branch = git(checkout, ['branch', '--show-current']);
  if (!branch) fail('detached parent HEAD is unsupported', EX.safety);
  return { checkout, commonDir, branch, baseHead: git(checkout, ['rev-parse', 'HEAD']), clean: git(checkout, ['status', '--porcelain=v1']) === '' };
}
function assertParentFresh(manifest, requireHead = false) {
  const parent = repository(manifest.parent.checkout);
  if (parent.checkout !== manifest.parent.checkout || parent.commonDir !== manifest.parent.commonDir || parent.branch !== manifest.parent.branch) fail('parent repository provenance changed', EX.safety, { recorded: manifest.parent, current: parent });
  if (!parent.clean) fail('parent checkout is dirty', EX.safety);
  if (requireHead && parent.baseHead !== manifest.parent.baseHead) fail('parent HEAD moved', EX.safety);
  return parent;
}
function worktreeList(parent) { return git(parent, ['worktree', 'list', '--porcelain']); }
function listedWorktree(parent, workerPath, head, branch) {
  const blocks = worktreeList(parent).split(/\n\n+/);
  return blocks.some((block) => block.includes(`worktree ${workerPath}\n`) && block.includes(`HEAD ${head}\n`) && block.includes(`branch refs/heads/${branch}`));
}
function activeWriterExists(root, workerPath) {
  let entries = [];
  try { entries = spawnSync(process.execPath, ['-e', "const f=require('fs');console.log(JSON.stringify(f.readdirSync(process.argv[1])))", path.join(root.realpath, 'runs')], { encoding: 'utf8' }).stdout; entries = JSON.parse(entries); } catch { return false; }
  for (const entry of entries) {
    try {
      const m = JSON.parse(readFileSync(path.join(root.realpath, 'runs', entry, 'manifest.json'), 'utf8'));
      if (m.role === 'worker' && !TERMINAL.has(m.state) && m.worktree?.path === workerPath) return true;
    } catch { /* incomplete run is not a grant */ }
  }
  return false;
}
function createGitWorktree(parent, root, runId) {
  if (!parent.clean) fail('worker launch requires a clean parent checkout', EX.safety);
  const branch = `subagent/${slug(runId)}-${randomBytes(4).toString('hex')}`;
  const workerPath = path.join(root.realpath, 'worktrees', slug(runId));
  mkdirSync(path.dirname(workerPath), { recursive: true, mode: 0o700 });
  if (activeWriterExists(root, workerPath)) fail('an active writer already owns this worktree', EX.safety);
  mustCmd('git', ['-C', parent.checkout, 'worktree', 'add', '-b', branch, workerPath, parent.baseHead], {}, EX.runtime);
  const actual = canonicalDirectory(git(workerPath, ['rev-parse', '--show-toplevel']));
  const head = git(workerPath, ['rev-parse', 'HEAD']);
  if (actual !== canonicalDirectory(workerPath) || head !== parent.baseHead || !listedWorktree(parent.checkout, actual, head, branch)) fail('created worktree identity could not be proven', EX.safety);
  return { manager: 'git', path: actual, branch, base: parent.baseHead, head, workspace: null };
}

function templateText() {
  const file = path.resolve(path.dirname(SCRIPT), '..', 'assets', 'assignment-prompts.md');
  return readFileSync(file, 'utf8');
}
function section(markdown, heading, nextPattern) {
  const start = markdown.indexOf(heading);
  if (start < 0) fail(`assignment template missing ${heading}`, EX.runtime);
  const bodyStart = markdown.indexOf('```text', start) + 7;
  const endFence = markdown.indexOf('```', bodyStart);
  if (bodyStart < 7 || endFence < 0 || (nextPattern && markdown.indexOf(nextPattern, endFence) < 0)) fail('assignment template is malformed', EX.runtime);
  return markdown.slice(bodyStart, endFence).trim();
}
function taskInput(options) {
  if (options.assignment && options.prompt) fail('use only one of --assignment or --prompt', EX.usage);
  if (options.prompt !== undefined) return options.prompt;
  if (!options.assignment) fail('--assignment or --prompt is required', EX.usage);
  try { return readFileSync(path.resolve(options.assignment), 'utf8'); } catch (error) { fail(`cannot read assignment: ${error.message}`, EX.usage); }
}
function assignment(options, role, cwd, base) {
  const task = taskInput(options);
  if (!task.trim()) fail('assignment must not be empty', EX.usage);
  const markdown = templateText();
  const rawShared = section(markdown, '## Shared envelope', '## Scout variant');
  const title = role === 'scout' ? '## Scout variant' : role === 'research' ? '## Research variant' : '## Worker variant';
  const rawRole = section(markdown, title);
  const firstLine = task.trim().split(/\r?\n/, 1)[0].slice(0, 300);
  const fill = (text) => text.replace(/<([^>]+)>/g, (_match, field) => {
    if (/working directory|parent checkout|isolated worktree/i.test(field)) return cwd;
    if (/commit/i.test(field)) return base;
    if (/role/i.test(field)) return role;
    if (/outcome|change|question|area\/question|research question/i.test(field)) return firstLine;
    if (/tools/i.test(field)) return 'runtime-enforced tools for this role';
    if (/timeout|bound/i.test(field)) return 'the runtime timeout';
    if (/source types\/versions/i.test(field)) return 'task-authorized, version-matched primary sources';
    if (/output path/i.test(field)) return 'only explicitly owned task paths';
    if (/files|directories|questions|requirements|context|facts|scope|exclusions|areas|checks|condition/i.test(field)) return 'as explicitly stated in the requested task';
    return 'as explicitly stated in the requested task';
  });
  const guard = `\n\nRuntime-enforced assignment\nAuthorized directory: ${cwd}\nBase commit: ${base}\nRole: ${role}\nRequested task:\n${task.trim()}\n\nRecursion guard: SUBAGENTS_NO_DELEGATION=1. Never delegate, spawn, invoke, or coordinate another agent or subagent under any circumstances.`;
  return `${fill(rawShared)}\n\n${fill(rawRole)}${guard}`;
}
function childEnv() { return { ...process.env, SUBAGENTS_NO_DELEGATION: '1', PI_HERDR_SUBAGENT: '1', HERDR_SUBAGENT: '1' }; }

function createManifest(options, root, parent, worktree, runId, runDir, harness) {
  const runIdentity = directoryIdentity(runDir);
  return {
    schema: SCHEMA, runId, nonce: randomBytes(16).toString('hex'), correlationOnly: true,
    backend: options.backend, harness, role: options.role, state: 'starting', createdAt: now(), updatedAt: now(),
    stateRoot: root, runDir: runIdentity.realpath, runDirIdentity: runIdentity,
    parent: { checkout: parent.checkout, commonDir: parent.commonDir, branch: parent.branch, baseHead: parent.baseHead, cleanAtLaunch: parent.clean },
    worktree,
    logs: { stdout: path.join(runDir, 'stdout.log'), stderr: path.join(runDir, 'stderr.log'), terminal: path.join(runDir, 'terminal.json'), prompt: path.join(runDir, 'prompt.txt') },
    runtime: {}, integration: null, cleanup: null,
  };
}
function newRun(options, harness) {
  if (!BACKENDS.has(options.backend)) fail('--backend is required and must be supported', EX.usage);
  if (!ROLES.has(options.role)) fail('--role is required and must be scout, research, or worker', EX.usage);
  const root = getStateRoot(options);
  const parent = repository(path.resolve(options.cwd ?? process.cwd()));
  const runId = `run-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
  const runDir = path.join(runsRoot(root), runId);
  mkdirSync(runDir, { mode: 0o700 });
  let worktree = { manager: null, path: parent.checkout, branch: null, base: parent.baseHead, head: parent.baseHead, workspace: null };
  if (options.role === 'worker' && harness === 'standalone') worktree = createGitWorktree(parent, root, runId);
  const manifest = createManifest(options, root, parent, worktree, runId, runDir, harness);
  saveManifest(manifest);
  return manifest;
}

function processSnapshot(pid) {
  if (!isPid(pid)) return null;
  if (process.platform === 'linux') {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8').trim();
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const command = readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
      return { pid, pgid: Number(fields[2]), state: fields[0], startIdentity: { platform: 'linux', start: fields[19] }, command };
    } catch { return null; }
  }
  if (process.platform === 'darwin') {
    const result = runCmd('ps', ['-o', 'pid=,pgid=,stat=,lstart=,command=', '-p', String(pid)]);
    const match = result.stdout.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+((?:\S+\s+){4}\d{4})\s+(.*)$/);
    return result.status === 0 && match ? { pid: Number(match[1]), pgid: Number(match[2]), state: match[3], startIdentity: { platform: 'darwin', start: match[4] }, command: match[5] } : null;
  }
  return null;
}
function pidAlive(pid) { if (!isPid(pid)) return false; try { process.kill(pid, 0); return true; } catch { return false; } }
function processGroupMembers(pgid) {
  if (!isPid(pgid)) return [];
  const result = runCmd('ps', ['-eo', 'pid=,pgid=']);
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim().split(/\s+/).map(Number)).filter((pair) => pair.length === 2 && pair[1] === pgid).map((pair) => pair[0]);
}
function verifyProcess(manifest) {
  const runtime = manifest.runtime;
  if (!isPid(runtime.pid) || !pidAlive(runtime.pid)) {
    const members = processGroupMembers(runtime.pgid);
    return members === null ? { live: false, ambiguous: true, reason: 'cannot inspect process group' } : members.length ? { live: true, ambiguous: true, reason: 'recorded group still has members', members } : { live: false, reason: 'pid and process group absent' };
  }
  const snapshot = processSnapshot(runtime.pid);
  if (!snapshot) return { live: false, ambiguous: true, reason: 'cannot inspect recorded live PID' };
  if (snapshot.state?.startsWith('Z')) return { live: true, teardown: true, snapshot };
  const okay = snapshot.startIdentity?.platform === runtime.startIdentity?.platform && snapshot.startIdentity?.start === runtime.startIdentity?.start && snapshot.pgid === runtime.pgid && snapshot.command.includes(runtime.commandMarker);
  return { live: okay, ambiguous: !okay, snapshot: { ...snapshot, command: bounded(snapshot.command, 4096) } };
}
function terminalRecord(manifest) {
  try {
    const record = JSON.parse(readFileSync(manifest.logs.terminal, 'utf8'));
    if (record.runId !== manifest.runId || record.nonce !== manifest.nonce || record.pid !== manifest.runtime.pid || record.pgid !== manifest.runtime.pgid) fail('terminal record identity mismatch', EX.safety);
    return record;
  } catch (error) {
    if (error instanceof CliError) throw error;
    return null;
  }
}
function reconcileStandalone(manifest) {
  const terminal = terminalRecord(manifest);
  if (terminal) {
    const identity = verifyProcess(manifest);
    manifest.state = terminal.state;
    manifest.finishedAt = terminal.finishedAt;
    manifest.exitCode = terminal.exitCode;
    saveManifest(manifest);
    return { manifest, terminal, identity, ...(identity.live || identity.ambiguous ? { advisory: 'terminal record is authoritative for completion, but process teardown remains live or ambiguous' } : {}) };
  }
  const identity = verifyProcess(manifest);
  if (!identity.live && manifest.state === 'running') return { manifest, identity, advisory: identity.ambiguous ? 'process identity mismatch' : 'wrapper absent without terminal record' };
  return { manifest, identity };
}

function startStandalone(options) {
  if (!['linux', 'darwin'].includes(process.platform)) fail('detached standalone mode is supported only on tested Linux/macOS', EX.unsupported);
  if (!BACKENDS.has(options.backend) || !ROLES.has(options.role)) fail('launch requires a supported --backend and --role', EX.usage);
  if (options.backend === 'kimi' && options.role !== 'worker') fail('standalone Kimi readers are unsupported', EX.unsupported);
  taskInput(options);
  const probe = probeBackend(options.backend, options.role);
  const manifest = newRun(options, 'standalone');
  const cwd = manifest.worktree.path;
  if (options.backend === 'kimi' && options.role === 'worker' && (!manifest.worktree.branch || cwd === manifest.parent.checkout)) fail('Kimi worker requires an isolated worktree', EX.safety);
  const prompt = assignment(options, options.role, cwd, manifest.parent.baseHead);
  writeFileSync(manifest.logs.prompt, prompt, { mode: 0o600 });
  const marker = `subagents-wrapper:${manifest.runId}:${manifest.nonce}`;
  manifest.runtime = { executable: probe.executable, version: probe.version, probes: probe.probes, promptFile: probe.promptFile, commandMarker: marker, timeoutMs: integerOption(options, 'timeout', 900000) };
  saveManifest(manifest);
  const stdoutFd = openSync(path.join(manifest.runDir, 'wrapper.out'), 'a', 0o600);
  const stderrFd = openSync(path.join(manifest.runDir, 'wrapper.err'), 'a', 0o600);
  const child = spawn(process.execPath, [SCRIPT, '__wrapper', '--state-root', manifest.stateRoot.realpath, '--run', manifest.runId, '--message', marker], {
    cwd, detached: true, stdio: ['ignore', stdoutFd, stderrFd], env: childEnv(),
  });
  child.unref(); closeSync(stdoutFd); closeSync(stderrFd);
  const deadline = Date.now() + 5000;
  let loaded;
  while (Date.now() < deadline) {
    sleep(25);
    try { loaded = loadManifest({ ...options, run: manifest.runId, 'state-root': manifest.stateRoot.realpath }); } catch { continue; }
    if (loaded.state === 'running' || loaded.state === 'failed') break;
  }
  if (!loaded || loaded.state === 'starting') fail('standalone wrapper handshake timed out', EX.runtime, { runId: manifest.runId });
  if (loaded.state === 'failed') fail('standalone wrapper failed during handshake', EX.runtime, { runId: manifest.runId });
  return loaded;
}
function wrapper(options) {
  const manifest = loadManifest(options);
  const marker = options.message;
  if (!marker || marker !== manifest.runtime.commandMarker) fail('wrapper marker mismatch', EX.safety);
  const snapshot = processSnapshot(process.pid);
  if (!snapshot?.startIdentity || snapshot.pgid !== process.pid) {
    manifest.state = 'failed'; manifest.failure = 'wrapper is not a proven process-group leader'; saveManifest(manifest); return;
  }
  const pgid = snapshot.pgid;
  manifest.runtime.pid = process.pid; manifest.runtime.pgid = pgid; manifest.runtime.startIdentity = snapshot.startIdentity;
  manifest.runtime.startedAt = now(); manifest.state = 'running'; saveManifest(manifest);
  const adapter = ADAPTERS[manifest.backend];
  const promptFile = manifest.logs.prompt;
  const prompt = readFileSync(promptFile, 'utf8');
  const argv = adapter.build(manifest.role, promptFile, manifest.runtime, prompt, manifest.worktree.path);
  manifest.runtime.argv = argv;
  saveManifest(manifest);
  const stdoutFd = openSync(manifest.logs.stdout, 'a', 0o600), stderrFd = openSync(manifest.logs.stderr, 'a', 0o600);
  const input = ['pi', 'claude', 'codex'].includes(manifest.backend) ? prompt : undefined;
  const result = spawnSync(manifest.runtime.executable, argv, { cwd: manifest.worktree.path, env: childEnv(), input, stdio: ['pipe', stdoutFd, stderrFd], timeout: manifest.runtime.timeoutMs });
  closeSync(stdoutFd); closeSync(stderrFd);
  const state = result.error?.code === 'ETIMEDOUT' ? 'timedout' : result.status === 0 ? 'completed' : 'failed';
  atomicJson(manifest.logs.terminal, { schema: SCHEMA, runId: manifest.runId, nonce: manifest.nonce, state, exitCode: result.status, signal: result.signal, error: result.error?.message, pid: process.pid, pgid, finishedAt: now() });
  manifest.state = state; manifest.finishedAt = now(); manifest.exitCode = result.status; saveManifest(manifest);
}

function herdrJson(executable, args, label) { return parseJson(mustCmd(executable, args, {}, EX.runtime).stdout, label); }
function pick(obj, names) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const name of names) if (typeof obj[name] === 'string' && obj[name]) return obj[name];
  for (const value of Object.values(obj)) { const found = pick(value, names); if (found) return found; }
}
function herdrRead(manifest, lines = 200) {
  const target = manifest.runtime.terminalId ?? manifest.runtime.paneId;
  return mustCmd(manifest.runtime.herdr, ['agent', 'read', target, '--source', 'recent-unwrapped', '--lines', String(lines)], {}, EX.runtime).stdout;
}
function requireHerdrIntegration(herdr, backend) {
  if (backend === 'grok') fail('Herdr does not currently provide a Grok state integration', EX.unsupported);
  const line = herdr.integration.split(/\r?\n/).find((entry) => entry.startsWith(`${backend}:`));
  if (!line || !/: current\b/.test(line)) fail(`Herdr ${backend} integration is not current`, EX.unsupported, { integration: bounded(herdr.integration, 8192) });
}
function shellQuote(value) { return `'${String(value).replace(/'/g, `'"'"'`)}'`; }
function startHerdr(options) {
  if (!BACKENDS.has(options.backend) || !ROLES.has(options.role)) fail('launch requires a supported --backend and --role', EX.usage);
  taskInput(options);
  const herdr = probeHerdr();
  requireHerdrIntegration(herdr, options.backend);
  const backend = probeBackend(options.backend, options.role, 'herdr');
  const manifest = newRun(options, 'herdr');
  if (options.role === 'worker' && !manifest.parent.cleanAtLaunch) fail('Herdr worker launch requires a clean parent checkout', EX.safety);
  let created;
  if (options.role === 'worker') {
    const branch = `subagent/${slug(manifest.runId)}-${randomBytes(4).toString('hex')}`;
    created = herdrJson(herdr.executable, ['worktree', 'create', '--cwd', manifest.parent.checkout, '--branch', branch, '--base', manifest.parent.baseHead, '--no-focus', '--json'], 'herdr worktree create');
    const workerPath = canonicalDirectory(pick(created, ['path', 'worktreePath', 'worktree_path', 'cwd']));
    const head = git(workerPath, ['rev-parse', 'HEAD']);
    const actualBranch = git(workerPath, ['branch', '--show-current']);
    const actualCommon = canonicalDirectory(path.resolve(workerPath, git(workerPath, ['rev-parse', '--git-common-dir'])));
    const workspace = pick(created, ['workspaceId', 'workspace_id', 'workspace']);
    if (head !== manifest.parent.baseHead || actualBranch !== branch || actualCommon !== manifest.parent.commonDir || !workspace || !listedWorktree(manifest.parent.checkout, workerPath, head, branch)) fail('Herdr worktree provenance mismatch', EX.safety);
    manifest.worktree = { manager: 'herdr', path: workerPath, branch, base: manifest.parent.baseHead, head, workspace };
    saveManifest(manifest);
  }
  const prompt = assignment(options, options.role, manifest.worktree.path, manifest.parent.baseHead);
  writeFileSync(manifest.logs.prompt, prompt, { mode: 0o600 });
  let paneId, terminalId, tabId, workspaceId;
  const interactiveArgs = backend.adapter.interactive(options.role);
  if (options.role === 'worker') {
    paneId = pick(created, ['rootPaneId', 'root_pane_id', 'paneId', 'pane_id']);
    tabId = pick(created, ['tabId', 'tab_id']);
    workspaceId = manifest.worktree.workspace;
    if (!paneId || !tabId || !workspaceId) fail('Herdr worktree did not return complete workspace/tab/root-pane IDs', EX.runtime);
    manifest.runtime = { herdr: herdr.executable, executable: backend.executable, probes: [...herdr.probes, ...backend.probes], socketPath: process.env.HERDR_SOCKET_PATH, parentWorkspaceId: process.env.HERDR_WORKSPACE_ID, parentTabId: process.env.HERDR_TAB_ID, parentPaneId: process.env.HERDR_PANE_ID, paneId, tabId, workspaceId, commandMarker: `herdr-pane:${paneId}`, timeoutMs: integerOption(options, 'timeout', 900000), startedAt: now() };
    saveManifest(manifest);
    const launchCommand = [backend.executable, ...interactiveArgs].map(shellQuote).join(' ');
    mustCmd(herdr.executable, ['pane', 'run', paneId, launchCommand], { env: childEnv() });
    const pane = herdrJson(herdr.executable, ['pane', 'get', paneId], 'herdr pane get');
    terminalId = pick(pane, ['terminalId', 'terminal_id']);
  } else {
    const name = `subagent-${slug(manifest.runId)}`;
    const result = herdrJson(herdr.executable, ['agent', 'start', name, '--cwd', manifest.parent.checkout, '--tab', process.env.HERDR_TAB_ID, '--split', 'right', '--no-focus', '--', backend.executable, ...interactiveArgs], 'herdr agent start');
    paneId = pick(result, ['paneId', 'pane_id']); terminalId = pick(result, ['terminalId', 'terminal_id']); tabId = pick(result, ['tabId', 'tab_id']) ?? process.env.HERDR_TAB_ID; workspaceId = pick(result, ['workspaceId', 'workspace_id']) ?? process.env.HERDR_WORKSPACE_ID;
  }
  manifest.runtime = { herdr: herdr.executable, executable: backend.executable, probes: [...herdr.probes, ...backend.probes], socketPath: process.env.HERDR_SOCKET_PATH, parentWorkspaceId: process.env.HERDR_WORKSPACE_ID, parentTabId: process.env.HERDR_TAB_ID, parentPaneId: process.env.HERDR_PANE_ID, paneId, terminalId, tabId, workspaceId, commandMarker: paneId ? `herdr-pane:${paneId}` : null, timeoutMs: integerOption(options, 'timeout', 900000), startedAt: now() };
  saveManifest(manifest);
  if (!paneId || !terminalId || !tabId || !workspaceId) fail('Herdr did not return complete owned workspace/tab/pane/terminal IDs; retained recorded partial topology', EX.runtime);
  herdrRead(manifest);
  mustCmd(herdr.executable, ['wait', 'agent-status', paneId, '--status', 'idle', '--timeout', '30000'], {}, EX.timeout);
  herdrRead(manifest);
  mustCmd(herdr.executable, ['pane', 'run', paneId, prompt], { env: childEnv() });
  const inspect = herdrRead(manifest);
  const working = runCmd(herdr.executable, ['wait', 'agent-status', paneId, '--status', 'working', '--timeout', '5000']);
  if (working.status !== 0) fail('Herdr submission could not be verified as working', EX.runtime, { inspect, working });
  manifest.state = 'running'; manifest.runtime.submittedAt = now(); saveManifest(manifest);
  return manifest;
}
function containsOwnedHerdrTarget(value, manifest) {
  if (!value || typeof value !== 'object') return false;
  const ownValues = Object.entries(value).filter(([, child]) => typeof child === 'string');
  const has = (identifier, keyPattern) => ownValues.some(([key, child]) => keyPattern.test(key) && child === identifier);
  if (has(manifest.runtime.paneId, /pane/i) && has(manifest.runtime.workspaceId, /workspace/i) && has(manifest.runtime.tabId, /tab/i)) return true;
  return Object.values(value).some((child) => child && typeof child === 'object' && containsOwnedHerdrTarget(child, manifest));
}
function verifyHerdr(manifest) {
  const context = manifest.runtime;
  if (process.env.HERDR_SOCKET_PATH !== context.socketPath || process.env.HERDR_WORKSPACE_ID !== context.parentWorkspaceId || process.env.HERDR_TAB_ID !== context.parentTabId || process.env.HERDR_PANE_ID !== context.parentPaneId) fail('Herdr parent topology environment changed; control denied', EX.safety);
  const executable = commandPath('herdr');
  if (executable !== context.herdr) fail('Herdr executable identity changed; control denied', EX.safety);
  currentHerdrContext(executable);
  const paneResult = runCmd(executable, ['pane', 'get', context.paneId]);
  if (paneResult.status !== 0) return { live: false, absent: true, advisory: 'owned pane is absent from freshly probed Herdr topology' };
  const pane = parseJson(paneResult.stdout, 'herdr pane get');
  if (!containsOwnedHerdrTarget(pane, manifest)) return { live: false, ambiguous: true, advisory: 'owned pane exists without its recorded workspace/tab conjunction', pane };
  const agentResult = runCmd(executable, ['agent', 'get', context.terminalId]);
  if (agentResult.status !== 0) return { live: false, ambiguous: true, advisory: 'owned pane exists but agent identity cannot be inspected', pane };
  const agent = parseJson(agentResult.stdout, 'herdr agent get');
  const agentState = pick(agent, ['agentStatus', 'agent_status']) ?? 'unknown';
  return { live: true, pane, agent, agentState, inspect: bounded(herdrRead(manifest)) };
}
function statusHerdr(manifest) {
  if (manifest.state === 'cleaned') return { manifest, live: false };
  const identity = verifyHerdr(manifest);
  if (!identity.live) return { manifest, ...identity };
  const state = identity.agentState;
  if (state === 'blocked' || state === 'unknown') return { manifest, ...identity, advisoryState: state };
  if (state === 'done' || (state === 'idle' && manifest.state === 'running')) {
    manifest.state = 'completed'; manifest.finishedAt = now(); saveManifest(manifest);
    return { manifest, ...identity, advisoryState: 'completed' };
  }
  return { manifest, ...identity, advisoryState: state === 'working' ? 'running' : state };
}

function start(options) {
  const harness = options.harness ?? 'standalone';
  if (!['standalone', 'herdr'].includes(harness)) fail('--harness must be standalone or herdr', EX.usage);
  return harness === 'standalone' ? startStandalone(options) : startHerdr(options);
}
function status(options) {
  const tombstone = loadTombstone(options);
  if (tombstone) return { runId: tombstone.runId, state: 'cleaned', live: false, idempotent: true, tombstone };
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned') return { manifest, live: false, idempotent: true };
  if (manifest.harness === 'standalone') return reconcileStandalone(manifest);
  return statusHerdr(manifest);
}
function waitRun(options) {
  const timeout = integerOption(options, 'timeout', 900000), deadline = Date.now() + timeout;
  const initial = loadManifest(options);
  if (initial.harness === 'herdr') {
    let last;
    while (Date.now() < deadline) {
      last = statusHerdr(loadManifest(options));
      if (last.manifest.state === 'cleaned' || last.manifest.state === 'stopped' || last.advisoryState === 'completed') return last;
      if (!last.live || last.advisoryState === 'blocked' || last.advisoryState === 'unknown') fail('Herdr child is blocked, unknown, or ambiguous; inspect before continuing', EX.safety, last);
      const remaining = Math.max(1, deadline - Date.now());
      runCmd(last.manifest.runtime.herdr, ['wait', 'agent-status', last.manifest.runtime.paneId, '--status', 'idle', '--timeout', String(Math.min(remaining, 1000))]);
    }
    fail('wait timed out', EX.timeout, last);
  }
  let result;
  while (Date.now() < deadline) {
    result = status(options);
    if (TERMINAL.has(result.manifest.state)) {
      if (result.manifest.state === 'timedout') fail('child execution timed out', EX.timeout, result);
      if (result.manifest.state === 'failed') fail('child execution failed', EX.runtime, result);
      return result;
    }
    if (result.identity?.ambiguous || result.ambiguous) fail('run state is ambiguous; inspect before continuing', EX.safety, result);
    sleep(100);
  }
  fail('wait timed out', EX.timeout, result);
}
function readLogs(options) {
  const manifest = loadManifest(options), lines = integerOption(options, 'lines', 200, 1, 5000);
  if (manifest.harness === 'herdr') return { runId: manifest.runId, output: bounded(herdrRead(manifest, lines)) };
  const tail = (file) => { try { return readFileSync(file, 'utf8').split(/\r?\n/).slice(-lines).join('\n'); } catch { return ''; } };
  return { runId: manifest.runId, stdout: bounded(tail(manifest.logs.stdout)), stderr: bounded(tail(manifest.logs.stderr)) };
}
function send(options) {
  const manifest = loadManifest(options);
  if (manifest.harness !== 'herdr') fail('send is supported only for live Herdr children', EX.unsupported);
  if (!options.message) fail('--message is required', EX.usage);
  const verified = verifyHerdr(manifest);
  if (!verified.live) fail('Herdr child identity is not live and exact', EX.safety, verified);
  mustCmd(manifest.runtime.herdr, ['pane', 'run', manifest.runtime.paneId, options.message]);
  return { runId: manifest.runId, sent: true };
}
function stop(options) {
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned' || manifest.state === 'stopped') return { runId: manifest.runId, state: manifest.state, idempotent: true };
  if (manifest.harness === 'standalone' && TERMINAL.has(manifest.state)) {
    const terminalIdentity = verifyProcess(manifest);
    if (!terminalIdentity.live && !terminalIdentity.ambiguous) return { runId: manifest.runId, state: manifest.state, idempotent: true };
    if (terminalIdentity.ambiguous || terminalIdentity.teardown) fail('terminal process group identity is ambiguous; retained', EX.safety, terminalIdentity);
  }
  if (manifest.harness === 'herdr') {
    const verified = verifyHerdr(manifest); if (!verified.live) fail('Herdr identity is ambiguous; retained', EX.safety, verified);
    mustCmd(manifest.runtime.herdr, ['pane', 'send-keys', manifest.runtime.paneId, 'ctrl+c']);
    herdrRead(manifest);
    mustCmd(manifest.runtime.herdr, ['pane', 'close', manifest.runtime.paneId]);
    if (runCmd(manifest.runtime.herdr, ['pane', 'get', manifest.runtime.paneId]).status === 0) fail('owned pane still exists after close; retained', EX.safety);
  } else {
    const verified = verifyProcess(manifest); if (!verified.live) fail('process identity is ambiguous; retained', EX.safety, verified);
    try { process.kill(-manifest.runtime.pgid, 'SIGTERM'); } catch (error) { fail(`cannot stop exact process group: ${error.message}`, EX.runtime); }
    const deadline = Date.now() + 5000; while (Date.now() < deadline && pidAlive(manifest.runtime.pid)) sleep(50);
    const members = processGroupMembers(manifest.runtime.pgid);
    if (pidAlive(manifest.runtime.pid) || members === null || members.length) fail('process group did not stop completely; retained', EX.runtime, { members });
  }
  manifest.state = 'stopped'; manifest.finishedAt = now(); saveManifest(manifest);
  return { runId: manifest.runId, state: manifest.state };
}

function workerEvidence(manifest) {
  if (manifest.role !== 'worker') fail('operation requires a worker run', EX.unsupported);
  if (!TERMINAL.has(manifest.state) || manifest.state === 'cleaned') fail('worker child is not terminal', EX.safety);
  if (!manifest.parent.cleanAtLaunch) fail('recorded parent checkout was not clean at worker launch', EX.safety);
  if (manifest.harness === 'standalone') {
    const runtimeIdentity = verifyProcess(manifest);
    if (runtimeIdentity.live || runtimeIdentity.ambiguous) fail('standalone worker process group is live or ambiguous', EX.safety, runtimeIdentity);
  }
  const parent = assertParentFresh(manifest);
  const wt = manifest.worktree;
  let workerPath;
  try { workerPath = canonicalDirectory(wt.path); } catch { fail('worker worktree is absent or moved', EX.safety); }
  if (workerPath !== wt.path) fail('worker worktree path moved', EX.safety);
  const workerHead = git(wt.path, ['rev-parse', 'HEAD']);
  const branch = git(wt.path, ['branch', '--show-current']);
  const refHead = git(parent.checkout, ['rev-parse', wt.branch]);
  const dirty = git(wt.path, ['status', '--porcelain=v1']);
  if (dirty) fail('worker worktree is dirty, including untracked files', EX.safety, { status: dirty });
  if (branch !== wt.branch || refHead !== workerHead || !listedWorktree(parent.checkout, wt.path, workerHead, wt.branch)) fail('worker branch/path/HEAD provenance mismatch', EX.safety, { branch, refHead, workerHead });
  return { parent, workerHead, noChange: workerHead === wt.base };
}
function integrate(options) {
  const manifest = loadManifest(options);
  if (!options.reviewed || !options.checks) fail('integrate requires --reviewed and --checks evidence', EX.usage);
  const strategy = options.strategy ?? 'ff-only';
  if (!['ff-only', 'merge'].includes(strategy)) fail('--strategy must be ff-only or merge', EX.usage);
  const evidence = workerEvidence(manifest);
  const parentHead = evidence.parent.baseHead;
  if (!evidence.noChange) {
    if (strategy === 'ff-only') {
      if (gitResult(evidence.parent.checkout, ['merge-base', '--is-ancestor', parentHead, evidence.workerHead]).status !== 0) fail('fast-forward integration is not possible', EX.safety);
    } else {
      const preflight = gitResult(evidence.parent.checkout, ['merge-tree', '--write-tree', '--quiet', parentHead, evidence.workerHead]);
      if (preflight.status !== 0) {
        manifest.integration = { state: 'conflict-preflight', strategy, workerHead: evidence.workerHead, parentHead, reviewed: true, checks: options.checks, failedAt: now(), preflight };
        saveManifest(manifest);
        fail('non-fast-forward merge preflight failed or conflicts; inspect and retry fresh', EX.safety, preflight);
      }
    }
  }
  const preview = { commits: git(evidence.parent.checkout, ['log', '--oneline', `${parentHead}..${evidence.workerHead}`]), diff: git(evidence.parent.checkout, ['diff', '--stat', `${parentHead}..${evidence.workerHead}`]) };
  if (!options.apply) return { runId: manifest.runId, dryRun: true, strategy, noChange: evidence.noChange, workerHead: evidence.workerHead, parentHead, preview };
  if (!evidence.noChange) {
    const args = strategy === 'ff-only' ? ['merge', '--ff-only', evidence.workerHead] : ['merge', '--no-ff', '--no-edit', evidence.workerHead];
    const merged = gitResult(evidence.parent.checkout, args);
    if (merged.status !== 0) {
      manifest.integration = { state: 'conflict', strategy, workerHead: evidence.workerHead, parentHead, reviewed: true, checks: options.checks, failedAt: now(), merge: merged };
      saveManifest(manifest);
      fail('integration conflict retained; inspect, run git merge --abort, then retry fresh', EX.safety, { merged });
    }
  }
  const integratedParentHead = git(evidence.parent.checkout, ['rev-parse', 'HEAD']);
  if (gitResult(evidence.parent.checkout, ['merge-base', '--is-ancestor', evidence.workerHead, integratedParentHead]).status !== 0) fail('post-integration ancestry proof failed', EX.safety);
  manifest.integration = { state: 'integrated', strategy, noChange: evidence.noChange, workerHead: evidence.workerHead, parentHead, integratedParentHead, reviewed: true, checks: options.checks, appliedAt: now() };
  saveManifest(manifest);
  return { runId: manifest.runId, applied: true, ...manifest.integration };
}
function clean(options) {
  const tombstone = loadTombstone(options);
  if (tombstone) return { runId: tombstone.runId, state: 'cleaned', idempotent: true, tombstone };
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned') return { runId: manifest.runId, state: 'cleaned', idempotent: true };
  if (manifest.role !== 'worker') {
    const live = manifest.harness === 'standalone' ? verifyProcess(manifest) : verifyHerdr(manifest);
    if (live.live || live.ambiguous) fail('reader runtime is live or ambiguous; retained', EX.safety, live);
    if (!options.apply) return { runId: manifest.runId, dryRun: true, reader: true };
    const disposition = { reader: true, appliedAt: now() };
    manifest.cleanup = disposition; manifest.state = 'cleaned'; saveManifest(manifest);
    retireRun(manifest, disposition);
    return { runId: manifest.runId, state: 'cleaned', stateRetired: true };
  }
  if (!options.validated) fail('clean requires --validated evidence', EX.usage);
  const evidence = workerEvidence(manifest);
  const integration = manifest.integration;
  if (!integration || integration.state !== 'integrated' || integration.workerHead !== evidence.workerHead) fail('successful recorded integration/no-change attestation is required', EX.safety);
  const currentParentHead = git(evidence.parent.checkout, ['rev-parse', 'HEAD']);
  if (gitResult(evidence.parent.checkout, ['merge-base', '--is-ancestor', evidence.workerHead, currentParentHead]).status !== 0) fail('worker HEAD is not an ancestor of validated parent HEAD', EX.safety);
  const live = manifest.harness === 'standalone' ? verifyProcess(manifest) : verifyHerdr(manifest);
  if (live.live || live.ambiguous) fail('child liveness is not safely absent', EX.safety, live);
  if (!options.apply) return { runId: manifest.runId, dryRun: true, workerHead: evidence.workerHead, parentHead: currentParentHead, manager: manifest.worktree.manager };
  let removed;
  if (manifest.worktree.manager === 'herdr') removed = runCmd(manifest.runtime.herdr, ['worktree', 'remove', '--workspace', manifest.worktree.workspace]);
  else removed = gitResult(evidence.parent.checkout, ['worktree', 'remove', manifest.worktree.path]);
  if (removed.status !== 0) fail('non-force worktree removal failed; retained', EX.safety, removed);
  const refHead = git(evidence.parent.checkout, ['rev-parse', manifest.worktree.branch]);
  if (refHead !== evidence.workerHead || worktreeList(evidence.parent.checkout).includes(`branch refs/heads/${manifest.worktree.branch}`)) fail('branch identity changed or remains checked out; retained', EX.safety);
  const deletion = gitResult(evidence.parent.checkout, ['branch', '-d', manifest.worktree.branch]);
  if (deletion.status !== 0) fail('safe exact branch deletion failed; retained', EX.safety, deletion);
  const disposition = { validated: options.validated, workerHead: evidence.workerHead, parentHead: currentParentHead, branchDeleted: manifest.worktree.branch, appliedAt: now() };
  manifest.cleanup = disposition; manifest.state = 'cleaned'; saveManifest(manifest);
  retireRun(manifest, disposition);
  return { runId: manifest.runId, state: 'cleaned', branchDeleted: manifest.worktree.branch, stateRetired: true };
}
function doctor(options) {
  const role = options.role ?? 'worker', harness = options.harness ?? 'standalone';
  if (!['standalone', 'herdr'].includes(harness)) fail('--harness must be standalone or herdr', EX.usage);
  if (!ROLES.has(role)) fail('--role must be scout, research, or worker', EX.usage);
  if (!options.backend) fail('--backend is required', EX.usage);
  const backend = probeBackend(options.backend, role, harness);
  const herdr = harness === 'herdr' ? probeHerdr() : null;
  if (herdr) requireHerdrIntegration(herdr, options.backend);
  return { ok: true, backend: options.backend, harness, role, executable: backend.executable, version: backend.version, herdr: herdr ? { executable: herdr.executable } : null };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { out({ ok: true, help: HELP }); return 0; }
  if (options.command === '__wrapper') { wrapper(options); return 0; }
  let result;
  switch (options.command) {
    case 'doctor': result = doctor(options); break;
    case 'start': result = start(options); break;
    case 'run': {
      const started = start(options);
      if (options.async) result = started;
      else {
        const lifecycle = { ...options, run: started.runId, 'state-root': started.stateRoot.realpath };
        result = waitRun(lifecycle);
        if (started.harness === 'standalone') {
          await new Promise((resolve) => setTimeout(resolve, 50));
          result = status(lifecycle);
        }
      }
      break;
    }
    case 'status': result = status(options); break;
    case 'wait': result = waitRun(options); break;
    case 'logs': result = readLogs(options); break;
    case 'send': result = send(options); break;
    case 'stop': result = stop(options); break;
    case 'integrate': result = integrate(options); break;
    case 'clean': result = clean(options); break;
    default: fail('unreachable command', EX.usage);
  }
  out({ ok: true, ...result });
  return 0;
}

try { process.exitCode = await main(); }
catch (error) {
  const code = error instanceof CliError ? error.code : EX.runtime;
  diagnostic(error?.stack && !(error instanceof CliError) ? error.stack : error.message);
  out({ ok: false, error: error.message, category: Object.keys(EX).find((key) => EX[key] === code) ?? 'runtime', details: error.details });
  process.exitCode = code;
}
