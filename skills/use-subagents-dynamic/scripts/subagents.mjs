#!/usr/bin/env node

import { accessSync, chmodSync, closeSync, constants, createWriteStream, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCHEMA = 2;
const EX = Object.freeze({ usage: 2, unsupported: 3, timeout: 4, safety: 5, runtime: 6 });
const ROLES = new Set(['scout', 'research', 'worker']);
const COMMANDS = new Set(['info', 'run', 'status', 'send', 'stop', 'clean']);
const TERMINAL = new Set(['failed', 'timedout', 'stopped', 'cleaned']);
const SETTLED_STATES = new Set(['idle', 'failed', 'timedout', 'stopped', 'blocked']);
const MIN_PI = Object.freeze({ major: 0, minor: 81, patch: 1 });
const SCRIPT = fileURLToPath(import.meta.url);
const MAX_CAPTURE = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 900_000;
const STOP_GRACE_MS = 5_000;
const SUPERVISOR_READY_MS = 15_000;
const ROLE_TOOLS = Object.freeze({
  scout: 'read,grep,find,ls',
  research: 'read,grep,find,ls,web_search,fetch_content,get_search_content',
  worker: 'read,grep,find,ls,bash,edit,write',
});
const HELP = {
  usage: 'subagents.mjs <info|run|status|send|stop|clean> [options]',
  commands: [...COMMANDS],
  common: ['--state-root PATH', '--help'],
  launch: ['run: --role scout|research|worker (--assignment FILE|--prompt TEXT) --cwd PATH [--timeout MS] [--async]'],
  lifecycle: [
    'status: [--run ID] [--wait] [--lines 1..5000] [--timeout MS]',
    'send: --run ID --message TEXT [--behavior steer|follow-up] [--timeout MS] [--wait]',
    'stop: --run ID',
    'clean: --run ID [--apply]',
  ],
  prerequisites: ['Node.js 22.19+ on tested macOS/Linux', 'Pi 0.81.1+ with RPC mode', 'parent-supplied exact --cwd; parent owns all workspace and VCS operations'],
  state: 'owned mode-0700 runs live under --state-root or the OS temporary directory; retain ambiguous runs',
  exits: { 0: 'success', 2: 'usage', 3: 'unsupported capability', 4: 'timeout', 5: 'blocked safety gate', 6: 'runtime failure' },
  safety: 'clean is dry-run by default and mutates only with --apply; cleanup never touches cwd or VCS metadata',
};

class CliError extends Error {
  constructor(message, code = EX.runtime, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
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
function appendLine(file, value) {
  writeFileSync(file, `${typeof value === 'string' ? value : JSON.stringify(value)}\n`, { flag: 'a', mode: 0o600 });
}
function runCmd(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout ?? 15_000,
    maxBuffer: MAX_CAPTURE,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: bounded(result.stdout),
    stderr: bounded(result.stderr),
    error: result.error?.message,
  };
}
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
function sameIdentity(a, b) {
  return a?.realpath === b.realpath && a?.dev === b.dev && a?.ino === b.ino && a?.uid === b.uid;
}

function defaultStateRoot() {
  // Prefer a short path so Unix control sockets stay under platform sun_path limits.
  const short = path.join('/tmp', `sa-${process.getuid?.() ?? 'u'}`);
  try {
    mkdirSync(short, { recursive: true, mode: 0o700 });
    return short;
  } catch {
    return path.join(tmpdir(), `sa-${process.getuid?.() ?? 'u'}`);
  }
}
function getStateRoot(options, create = true) {
  const requested = path.resolve(options['state-root'] ?? process.env.SUBAGENTS_STATE_ROOT ?? defaultStateRoot());
  if (create) mkdirSync(requested, { recursive: true, mode: 0o700 });
  let identity;
  try { identity = directoryIdentity(requested); } catch (error) { fail(`cannot access state root: ${error.message}`, EX.safety); }
  if ((identity.mode & 0o077) !== 0) fail('state root must have mode 0700', EX.safety, identity);
  return identity;
}
function runsRoot(root) {
  const directory = path.join(root.realpath, 'runs');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}
function cleanedPath(root, id) { return path.join(root.realpath, 'cleaned', `${slug(id)}.json`); }
function loadTombstone(options) {
  if (!options.run) return null;
  const root = getStateRoot(options, false);
  try {
    const record = JSON.parse(readFileSync(cleanedPath(root, options.run), 'utf8'));
    return record.schema === SCHEMA && record.runId === options.run ? record : null;
  } catch {
    return null;
  }
}
function saveManifest(manifest) {
  manifest.updatedAt = now();
  atomicJson(path.join(manifest.runDir, 'manifest.json'), manifest);
}
function retireRun(manifest, disposition) {
  const currentRunDir = directoryIdentity(manifest.runDir);
  if (!sameIdentity(manifest.runDirIdentity, currentRunDir)) fail('run state identity changed before retirement', EX.safety);
  const directory = path.join(manifest.stateRoot.realpath, 'cleaned');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  atomicJson(cleanedPath(manifest.stateRoot, manifest.runId), {
    schema: SCHEMA,
    runId: manifest.runId,
    state: 'cleaned',
    role: manifest.role,
    generation: manifest.generation ?? 0,
    cwd: manifest.cwd,
    runtime: runtimeSummary(manifest, { identity: { live: false } }),
    cleanedAt: now(),
    disposition,
  });
  rmSync(manifest.runDir, { recursive: true });
}
function loadManifest(options) {
  const id = options.run;
  if (!id) fail('--run is required', EX.usage);
  const root = getStateRoot(options, false);
  const file = path.join(runsRoot(root), slug(id), 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { fail(`cannot load run ${id}: ${error.message}`, EX.usage); }
  const currentRunDir = directoryIdentity(path.dirname(file));
  if (
    manifest.schema !== SCHEMA
    || manifest.runId !== id
    || manifest.runDir !== currentRunDir.realpath
    || !sameIdentity(manifest.stateRoot, root)
    || !sameIdentity(manifest.runDirIdentity, currentRunDir)
  ) {
    fail('manifest provenance mismatch; control denied', EX.safety);
  }
  return manifest;
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') return { help: true };
  const command = argv.shift();
  if (!COMMANDS.has(command) && command !== '__supervisor') fail(`unknown command: ${command}`, EX.usage);
  if (argv.includes('--help') || argv.includes('-h')) return { help: true, command };
  const booleans = new Set(['apply', 'async', 'wait']);
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
  const allowed = new Set([
    'state-root', 'role', 'assignment', 'prompt', 'cwd', 'timeout', 'run', 'lines',
    'message', 'behavior', 'apply', 'async', 'wait',
  ]);
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

function parsePiVersion(text) {
  const match = String(text ?? '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: match[0] };
}
function versionAtLeast(version, minimum = MIN_PI) {
  if (!version) return false;
  if (version.major !== minimum.major) return version.major > minimum.major;
  if (version.minor !== minimum.minor) return version.minor > minimum.minor;
  return version.patch >= minimum.patch;
}
function agentProfilePath(role) {
  return path.resolve(path.dirname(SCRIPT), '..', 'assets', 'agents', `${role}.md`);
}
function parseAgentProfile(role) {
  const file = agentProfilePath(role);
  let text;
  try { text = readFileSync(file, 'utf8'); } catch (error) {
    fail(`missing agent profile for ${role}: ${error.message}`, EX.runtime);
  }
  if (!text.startsWith('---')) fail(`agent profile ${role} is missing frontmatter`, EX.runtime);
  const end = text.indexOf('\n---', 3);
  if (end < 0) fail(`agent profile ${role} is missing frontmatter close`, EX.runtime);
  const frontmatter = text.slice(4, end).trim();
  const body = text.slice(end + 4).replace(/^\r?\n/, '').trim();
  if (!body) fail(`agent profile ${role} has an empty system prompt body`, EX.runtime);
  const thinkingLine = frontmatter.split(/\r?\n/).find((line) => line.startsWith('thinking:'));
  const thinking = thinkingLine ? thinkingLine.slice('thinking:'.length).trim() : '';
  if (!thinking || !['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(thinking)) {
    fail(`agent profile ${role} must declare a supported thinking level`, EX.runtime);
  }
  const tools = [];
  let inTools = false;
  for (const line of frontmatter.split(/\r?\n/)) {
    if (line.startsWith('tools:')) { inTools = true; continue; }
    if (inTools) {
      const item = line.match(/^[ \t]*-[ \t]*(.+)$/);
      if (item) { tools.push(item[1].trim()); continue; }
      if (line.trim() === '') continue;
      inTools = false;
    }
  }
  const expected = ROLE_TOOLS[role].split(',');
  if (tools.join(',') !== expected.join(',')) {
    fail(`agent profile ${role} tools must match runtime allowlist`, EX.runtime, { tools, expected });
  }
  return { role, thinking, tools, systemPrompt: body, file };
}
function roleArgv(role, { systemPromptFile, thinking } = {}) {
  const tools = ROLE_TOOLS[role];
  const args = [
    '--mode', 'rpc',
    '--no-session',
    '--no-skills',
    '--no-prompt-templates',
    '--no-context-files',
    '--no-approve',
    '--tools', tools,
  ];
  if (role !== 'research') args.splice(4, 0, '--no-extensions');
  if (thinking) args.push('--thinking', thinking);
  if (systemPromptFile) args.push('--system-prompt', systemPromptFile);
  return args;
}
function childEnv() {
  return { ...process.env, SUBAGENTS_NO_DELEGATION: '1' };
}

function attachJsonlReader(stream, onLine, onError) {
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  const feed = (chunk) => {
    buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    while (true) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) break;
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.length) onLine(line);
    }
  };
  stream.on('data', feed);
  stream.on('end', () => {
    buffer += decoder.end();
    if (buffer.length) {
      const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
      if (line.length) onLine(line);
    }
  });
  stream.on('error', (error) => onError?.(error));
  return {
    flush() {
      buffer += decoder.end();
      if (buffer.length) {
        const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
        if (line.length) onLine(line);
      }
      buffer = '';
    },
  };
}

function handshakePi(executable, cwd = process.cwd()) {
  const child = spawn(executable, roleArgv('scout'), {
    cwd,
    env: childEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let settled = false;
  let response;
  let stderr = '';
  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    try { child.stdin.end(); } catch { /* ignore */ }
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
    if (error) rejectPromise(error);
    else resolvePromise(value);
  };
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const timer = setTimeout(() => finish(new CliError('Pi RPC handshake timed out', EX.unsupported)), 10_000);
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr = bounded(stderr + chunk, 8192); });
  child.on('error', (error) => finish(new CliError(`failed to spawn pi: ${error.message}`, EX.unsupported)));
  child.on('exit', (code, signal) => {
    if (!settled) finish(new CliError('Pi exited before RPC handshake completed', EX.unsupported, { code, signal, stderr }));
  });
  attachJsonlReader(child.stdout, (line) => {
    let message;
    try { message = JSON.parse(line); } catch {
      finish(new CliError('Pi RPC handshake returned non-JSON stdout', EX.unsupported, { line: bounded(line, 512) }));
      return;
    }
    if (message?.type === 'response' && message.command === 'get_state') {
      response = message;
      if (message.success) finish(null, message);
      else finish(new CliError(`Pi RPC get_state failed: ${message.error ?? 'unknown error'}`, EX.unsupported, message));
    }
  }, (error) => finish(new CliError(`Pi RPC stdout error: ${error.message}`, EX.unsupported)));
  try {
    child.stdin.write(`${JSON.stringify({ id: 'handshake', type: 'get_state' })}\n`);
  } catch (error) {
    finish(new CliError(`failed to write Pi RPC handshake: ${error.message}`, EX.unsupported));
  }
  return promise.then((value) => {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) sleep(25);
    return value ?? response;
  });
}

function probePi() {
  const executable = commandPath(process.env.SUBAGENTS_PI_PATH || 'pi');
  const versionResult = runCmd(executable, ['--version']);
  if (versionResult.status !== 0) fail('pi --version failed', EX.unsupported, versionResult);
  const version = parsePiVersion(versionResult.stdout || versionResult.stderr);
  if (!version) fail('pi version is unparseable; require Pi 0.81.1+', EX.unsupported, versionResult);
  if (!versionAtLeast(version)) fail(`pi ${version.raw} is unsupported; require Pi 0.81.1+`, EX.unsupported, { version });
  return { executable, version: version.raw };
}

async function info() {
  const probe = probePi();
  await handshakePi(probe.executable);
  return {
    runtime: 'pi-rpc',
    pi: { version: probe.version, executableProven: true, rpcHandshake: true },
    roles: {
      scout: { tools: ROLE_TOOLS.scout, extensions: false },
      research: { tools: ROLE_TOOLS.research, extensions: 'trusted-user-global', note: 'web tools require available trusted extensions; report unavailability' },
      worker: { tools: ROLE_TOOLS.worker, extensions: false },
    },
    platform: process.platform,
    asyncSupported: ['linux', 'darwin'].includes(process.platform),
    parentOwns: ['cwd', 'workspace-isolation', 'vcs', 'merge-review', 'validation', 'workspace-cleanup'],
    runtimeOwns: ['pi-rpc-child', 'private-run-state', 'control-socket', 'stop', 'state-cleanup'],
  };
}

function templateText() {
  return readFileSync(path.resolve(path.dirname(SCRIPT), '..', 'assets', 'assignment-prompts.md'), 'utf8');
}
function section(markdown, heading, nextPattern) {
  const start = markdown.indexOf(heading);
  if (start < 0) fail(`assignment template missing ${heading}`, EX.runtime);
  const bodyStart = markdown.indexOf('```text', start) + 7;
  const endFence = markdown.indexOf('```', bodyStart);
  if (bodyStart < 7 || endFence < 0 || (nextPattern && markdown.indexOf(nextPattern, endFence) < 0)) {
    fail('assignment template is malformed', EX.runtime);
  }
  return markdown.slice(bodyStart, endFence).trim();
}
function taskInput(options) {
  if (options.assignment && options.prompt) fail('use only one of --assignment or --prompt', EX.usage);
  if (options.prompt !== undefined) return options.prompt;
  if (!options.assignment) fail('--assignment or --prompt is required', EX.usage);
  try { return readFileSync(path.resolve(options.assignment), 'utf8'); } catch (error) {
    fail(`cannot read assignment: ${error.message}`, EX.usage);
  }
}
function assignment(options, role, cwd) {
  const task = taskInput(options);
  if (!task.trim()) fail('assignment must not be empty', EX.usage);
  const markdown = templateText();
  const rawShared = section(markdown, '## Shared envelope', '## Scout variant');
  const title = role === 'scout' ? '## Scout variant' : role === 'research' ? '## Research variant' : '## Worker variant';
  const rawRole = section(markdown, title);
  const firstLine = task.trim().split(/\r?\n/, 1)[0].slice(0, 300);
  const fill = (text) => text.replace(/<([^>]+)>/g, (_match, field) => {
    if (/working directory/i.test(field)) return cwd;
    if (/role/i.test(field)) return role;
    if (/outcome|change|question|area\/question|research question/i.test(field)) return firstLine;
    if (/tools/i.test(field)) return ROLE_TOOLS[role];
    if (/timeout|bound/i.test(field)) return 'the runtime timeout';
    if (/source types\/versions/i.test(field)) return 'task-authorized, version-matched primary sources';
    if (/output path/i.test(field)) return 'only explicitly owned task paths';
    if (/files|directories|questions|requirements|context|facts|scope|exclusions|areas|checks|condition/i.test(field)) {
      return 'as explicitly stated in the requested task';
    }
    return 'as explicitly stated in the requested task';
  });
  const guard = [
    '',
    'Runtime-enforced assignment',
    `Authorized directory: ${cwd}`,
    `Role: ${role}`,
    `Allowed tools: ${ROLE_TOOLS[role]}`,
    'Requested task:',
    task.trim(),
    '',
    'Recursion guard: SUBAGENTS_NO_DELEGATION=1. Never delegate, spawn, invoke, or coordinate another agent or subagent under any circumstances.',
    'VCS guard: never run version-control commands or create/manage worktrees or branches. The parent owns every VCS operation.',
  ].join('\n');
  return `${fill(rawShared)}\n\n${fill(rawRole)}\n${guard}`;
}

function controlSocketPath(runDir) {
  // macOS sun_path is 104 bytes; keep the socket name minimal inside the private run dir.
  const socket = path.join(runDir, 's.sock');
  if (process.platform === 'win32') fail('Unix-domain control sockets are unsupported on Windows', EX.unsupported);
  if (Buffer.byteLength(socket) >= 104) {
    fail('control socket path is too long for this platform; use a shorter --state-root', EX.safety, { socket, bytes: Buffer.byteLength(socket) });
  }
  return socket;
}

function createManifest(options, root, cwdIdentity, runId, runDir, probe) {
  const runIdentity = directoryIdentity(runDir);
  const socketPath = controlSocketPath(runDir);
  return {
    schema: SCHEMA,
    runId,
    nonce: randomBytes(16).toString('hex'),
    correlationOnly: true,
    role: options.role,
    state: 'starting',
    generation: 0,
    createdAt: now(),
    updatedAt: now(),
    stateRoot: root,
    runDir: runIdentity.realpath,
    runDirIdentity: runIdentity,
    cwd: cwdIdentity.realpath,
    cwdIdentity,
    controlSocket: socketPath,
    logs: {
      stdout: path.join(runDir, 'stdout.log'),
      stderr: path.join(runDir, 'stderr.log'),
      events: path.join(runDir, 'events.jsonl'),
      terminal: path.join(runDir, 'terminal.json'),
      prompt: path.join(runDir, 'prompt.txt'),
      systemPrompt: path.join(runDir, 'system-prompt.txt'),
      output: path.join(runDir, 'output.txt'),
    },
    runtime: {
      executable: probe.executable,
      version: probe.version,
      argv: [],
      tools: ROLE_TOOLS[options.role],
      timeoutMs: integerOption(options, 'timeout', DEFAULT_TIMEOUT_MS),
      commandMarker: `sa:${runId}`,
      socketPath,
    },
    usage: null,
    classification: null,
    failure: null,
  };
}

function newRun(options, probe) {
  if (!ROLES.has(options.role)) fail('--role is required and must be scout, research, or worker', EX.usage);
  if (!options.cwd) fail('--cwd is required', EX.usage);
  taskInput(options);
  const root = getStateRoot(options);
  const cwdIdentity = directoryIdentity(path.resolve(options.cwd));
  const runId = `r${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
  const runDir = path.join(runsRoot(root), runId);
  mkdirSync(runDir, { mode: 0o700 });
  const profile = parseAgentProfile(options.role);
  const manifest = createManifest(options, root, cwdIdentity, runId, runDir, probe);
  writeFileSync(manifest.logs.systemPrompt, `${profile.systemPrompt}
`, { mode: 0o600 });
  manifest.runtime.thinking = profile.thinking;
  manifest.runtime.profile = profile.file;
  manifest.runtime.argv = roleArgv(options.role, {
    systemPromptFile: manifest.logs.systemPrompt,
    thinking: profile.thinking,
  });
  const prompt = assignment(options, options.role, cwdIdentity.realpath);
  writeFileSync(manifest.logs.prompt, prompt, { mode: 0o600 });
  writeFileSync(manifest.logs.output, '', { mode: 0o600 });
  writeFileSync(manifest.logs.events, '', { mode: 0o600 });
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
    } catch {
      return null;
    }
  }
  if (process.platform === 'darwin') {
    const result = runCmd('ps', ['-o', 'pid=,pgid=,stat=,lstart=,command=', '-p', String(pid)]);
    const match = result.stdout.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+((?:\S+\s+){4}\d{4})\s+(.*)$/);
    return result.status === 0 && match
      ? { pid: Number(match[1]), pgid: Number(match[2]), state: match[3], startIdentity: { platform: 'darwin', start: match[4] }, command: match[5] }
      : null;
  }
  return null;
}
function pidAlive(pid) {
  if (!isPid(pid)) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function processGroupMembers(pgid) {
  if (!isPid(pgid)) return [];
  const result = runCmd('ps', ['-eo', 'pid=,pgid=']);
  if (result.status !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter((pair) => pair.length === 2 && pair[1] === pgid)
    .map((pair) => pair[0]);
}
function verifyProcess(manifest) {
  const runtime = manifest.runtime ?? {};
  if (!isPid(runtime.pid) || !pidAlive(runtime.pid)) {
    const members = processGroupMembers(runtime.pgid);
    if (members === null) return { live: false, ambiguous: true, reason: 'cannot inspect process group' };
    if (members.length) return { live: true, ambiguous: true, reason: 'recorded group still has members', members };
    return { live: false, reason: 'pid and process group absent' };
  }
  const snapshot = processSnapshot(runtime.pid);
  if (!snapshot) return { live: false, ambiguous: true, reason: 'cannot inspect recorded live PID' };
  if (snapshot.state?.startsWith('Z')) return { live: true, teardown: true, snapshot };
  const okay = snapshot.startIdentity?.platform === runtime.startIdentity?.platform
    && snapshot.startIdentity?.start === runtime.startIdentity?.start
    && snapshot.pgid === runtime.pgid
    && snapshot.command.includes(runtime.commandMarker);
  return { live: okay, ambiguous: !okay, snapshot: { ...snapshot, command: bounded(snapshot.command, 4096) } };
}
function terminalRecord(manifest) {
  try {
    const record = JSON.parse(readFileSync(manifest.logs.terminal, 'utf8'));
    if (record.runId !== manifest.runId || record.nonce !== manifest.nonce) fail('terminal record identity mismatch', EX.safety);
    return record;
  } catch (error) {
    if (error instanceof CliError) throw error;
    return null;
  }
}
function writeTerminal(manifest, record) {
  atomicJson(manifest.logs.terminal, {
    schema: SCHEMA,
    runId: manifest.runId,
    nonce: manifest.nonce,
    pid: manifest.runtime.pid,
    pgid: manifest.runtime.pgid,
    finishedAt: now(),
    ...record,
  });
}

function assistantText(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.content === 'string') return message.content.trim();
  if (!Array.isArray(message.content)) return '';
  return message.content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
}
function classifyAssistant(message, context = {}) {
  if (!message || message.role !== 'assistant') {
    return { state: 'blocked', reason: 'missing-final-assistant' };
  }
  const stopReason = message.stopReason ?? null;
  const text = assistantText(message);
  const errorMessage = typeof message.errorMessage === 'string' ? message.errorMessage : null;
  if (stopReason === 'error' || errorMessage) {
    return { state: 'failed', reason: errorMessage || 'assistant-error', stopReason, text };
  }
  if (stopReason === 'aborted') {
    if (context.timeoutRequested) return { state: 'timedout', reason: 'timeout-abort', stopReason, text };
    if (context.stopRequested) return { state: 'stopped', reason: 'explicit-stop-abort', stopReason, text };
    return { state: 'blocked', reason: 'spontaneous-abort', stopReason, text };
  }
  if (stopReason === 'length') return { state: 'blocked', reason: 'length', stopReason, text };
  if (stopReason === 'toolUse') return { state: 'blocked', reason: 'terminal-tool-use', stopReason, text };
  if (stopReason === 'stop') {
    if (!text) return { state: 'blocked', reason: 'missing-text', stopReason, text };
    return { state: 'idle', reason: 'stop', stopReason, text };
  }
  if (stopReason == null) return { state: 'blocked', reason: 'unknown-stop-reason', stopReason, text };
  return { state: 'blocked', reason: `unknown-stop-reason:${stopReason}`, stopReason, text };
}

function recentOutput(manifest, lines = 200) {
  const readLines = (file) => {
    try {
      const entries = readFileSync(file, 'utf8').split(/\r?\n/);
      if (entries.at(-1) === '') entries.pop();
      return entries;
    } catch {
      return [];
    }
  };
  const output = readLines(manifest.logs.output);
  if (output.length) return bounded(output.slice(-lines).join('\n'));
  const stdout = readLines(manifest.logs.stdout);
  const stderr = readLines(manifest.logs.stderr);
  return bounded([...stdout, ...(stderr.length ? ['[stderr]', ...stderr] : [])].slice(-lines).join('\n'));
}
function runtimeSummary(manifest, raw = {}) {
  const identity = raw.identity ?? {};
  return {
    pid: manifest.runtime?.pid ?? null,
    pgid: manifest.runtime?.pgid ?? null,
    live: identity.live === true,
    ambiguous: identity.ambiguous === true,
    teardown: identity.teardown === true,
    socketPath: manifest.runtime?.socketPath ?? manifest.controlSocket ?? null,
  };
}
function nextAction(state, runtime) {
  if (state === 'cleaned') return 'retain';
  if (state === 'running' || state === 'starting') return 'wait';
  if (state === 'idle') return 'review';
  if (state === 'stopped') return 'clean';
  if (state === 'failed' || state === 'timedout' || state === 'blocked') return runtime.live ? 'stop' : 'retain';
  return runtime.live ? 'stop' : 'retain';
}
function normalizedState(manifest, raw = {}) {
  if (manifest?.state === 'cleaned' || raw.state === 'cleaned') return 'cleaned';
  if (manifest?.state === 'stopped') return 'stopped';
  if (manifest?.state === 'timedout') return 'timedout';
  if (manifest?.state === 'failed') return 'failed';
  if (manifest?.state === 'idle') return 'idle';
  if (manifest?.state === 'blocked') return 'blocked';
  if (raw.ambiguous || raw.identity?.ambiguous) return 'blocked';
  if (!raw.live && (manifest?.state === 'running' || manifest?.state === 'starting') && (raw.advisory || raw.absent)) return 'blocked';
  if (manifest?.state === 'running' || manifest?.state === 'starting') return 'running';
  return manifest?.state ?? 'blocked';
}
function normalizedStatus(raw, lines = 200) {
  if (!raw.manifest) {
    return {
      runId: raw.runId,
      state: 'cleaned',
      role: raw.tombstone?.role,
      generation: raw.tombstone?.generation ?? 0,
      cwd: raw.tombstone?.cwd,
      output: '',
      runtime: raw.tombstone?.runtime,
      next: 'retain',
    };
  }
  const manifest = raw.manifest;
  const state = normalizedState(manifest, raw);
  const runtime = runtimeSummary(manifest, raw);
  return {
    runId: manifest.runId,
    role: manifest.role,
    state,
    generation: manifest.generation ?? 0,
    cwd: manifest.cwd,
    output: recentOutput(manifest, lines),
    ...(manifest.usage ? { usage: manifest.usage } : {}),
    runtime,
    next: nextAction(state, runtime),
    ...(manifest.classification ? { classification: manifest.classification } : {}),
  };
}

function reconcile(manifest) {
  const terminal = terminalRecord(manifest);
  if (terminal) {
    const identity = verifyProcess(manifest);
    if (SETTLED_STATES.has(terminal.state) || TERMINAL.has(terminal.state)) {
      manifest.state = terminal.state;
      manifest.finishedAt = terminal.finishedAt;
      if (terminal.generation != null) manifest.generation = terminal.generation;
      if (terminal.classification) manifest.classification = terminal.classification;
      if (terminal.usage) manifest.usage = terminal.usage;
      if (terminal.output != null) {
        try { writeFileSync(manifest.logs.output, `${terminal.output}\n`, { mode: 0o600 }); } catch { /* keep existing */ }
      }
      saveManifest(manifest);
    }
    return {
      manifest,
      terminal,
      identity,
      live: identity.live === true,
      ambiguous: identity.ambiguous === true,
      ...(identity.live || identity.ambiguous
        ? { advisory: 'terminal record is authoritative for completion, but process teardown remains live or ambiguous' }
        : {}),
    };
  }
  const identity = verifyProcess(manifest);
  if (!identity.live && (manifest.state === 'running' || manifest.state === 'starting')) {
    return {
      manifest,
      identity,
      live: false,
      ambiguous: identity.ambiguous === true,
      advisory: identity.ambiguous ? 'process identity mismatch' : 'supervisor absent without terminal record',
      absent: !identity.ambiguous,
    };
  }
  return { manifest, identity, live: identity.live === true, ambiguous: identity.ambiguous === true };
}

function controlRequest(manifest, payload, timeoutMs = 10_000) {
  const identity = verifyProcess(manifest);
  if (!identity.live || identity.ambiguous) fail('run control socket is unavailable because process identity is not live and exact', EX.safety, identity);
  const socketPath = manifest.runtime.socketPath ?? manifest.controlSocket;
  let safeSocket = false;
  try {
    safeSocket = Boolean(socketPath) && realpathSync(path.dirname(socketPath)) === manifest.runDir;
  } catch {
    safeSocket = Boolean(socketPath) && socketPath.startsWith(manifest.runDir);
  }
  if (!safeSocket) fail('control socket path failed safety checks', EX.safety, { socketPath, runDir: manifest.runDir });
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    let buffer = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new CliError('control socket request timed out', EX.timeout));
    }, timeoutMs);
    const done = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.end(); } catch { /* ignore */ }
      if (error) reject(error);
      else resolve(value);
    };
    socket.setEncoding('utf8');
    socket.on('connect', () => {
      socket.write(`${JSON.stringify({ nonce: manifest.nonce, ...payload })}\n`);
    });
    socket.on('data', (chunk) => {
      buffer += chunk;
      const index = buffer.indexOf('\n');
      if (index === -1) return;
      const line = buffer.slice(0, index);
      try {
        const message = JSON.parse(line);
        if (!message.ok) done(new CliError(message.error || 'control request failed', message.code ?? EX.runtime, message.details));
        else done(null, message);
      } catch (error) {
        done(new CliError(`invalid control response: ${error.message}`, EX.runtime, { line: bounded(line, 512) }));
      }
    });
    socket.on('error', (error) => done(new CliError(`control socket error: ${error.message}`, EX.runtime)));
    socket.on('end', () => {
      if (!settled) done(new CliError('control socket closed before response', EX.runtime));
    });
  });
}

function rawStatus(options) {
  const tombstone = loadTombstone(options);
  if (tombstone) return { runId: tombstone.runId, state: 'cleaned', live: false, idempotent: true, tombstone };
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned') return { manifest, live: false, idempotent: true };
  return reconcile(manifest);
}

function throwIfUnsuccessfulSettlement(result) {
  const state = result.manifest?.state ?? result.state;
  if (state === 'timedout') fail('child execution timed out', EX.timeout, result);
  if (state === 'failed') fail('child execution failed', EX.runtime, result);
  if (state === 'blocked') fail('child execution blocked', EX.safety, result);
  return result;
}

function waitRun(options, { acceptIdle = true, generation = null, timeoutMs = null } = {}) {
  const timeout = timeoutMs ?? integerOption(options, 'timeout', DEFAULT_TIMEOUT_MS);
  const deadline = Date.now() + timeout;
  let result;
  while (Date.now() < deadline) {
    result = rawStatus(options);
    const state = result.manifest?.state;
    if (result.identity?.ambiguous || result.ambiguous) fail('run state is ambiguous; inspect before continuing', EX.safety, result);
    if (generation != null && result.manifest && result.manifest.generation !== generation && state === 'running') {
      sleep(50);
      continue;
    }
    if (state === 'idle' && acceptIdle) return result;
    if (TERMINAL.has(state) || state === 'blocked') {
      throwIfUnsuccessfulSettlement(result);
      return result;
    }
    sleep(100);
  }
  fail('wait timed out', EX.timeout, result);
}

function controlSocketReady(manifest) {
  const socketPath = manifest.runtime?.socketPath ?? manifest.controlSocket;
  if (!socketPath) return false;
  try {
    const metadata = statSync(socketPath);
    return metadata.isSocket() && (metadata.mode & 0o777) === 0o600;
  } catch {
    return false;
  }
}

async function waitControlReady(manifestSeed, options) {
  const deadline = Date.now() + SUPERVISOR_READY_MS;
  let last = manifestSeed;
  while (Date.now() < deadline) {
    let current;
    try {
      current = loadManifest({
        ...options,
        run: manifestSeed.runId,
        'state-root': manifestSeed.stateRoot.realpath,
      });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
      continue;
    }
    last = current;
    const identity = verifyProcess(current);
    if (identity.ambiguous) {
      fail('run state is ambiguous before control readiness; retained', EX.safety, {
        runId: current.runId,
        state: current.state,
        identity,
      });
    }
    // Fast idle settlement is success-path progress, not startup failure; still require control readiness.
    if (controlSocketReady(current) && identity.live) {
      try {
        await controlRequest(current, { type: 'status' }, 1_000);
        return current;
      } catch {
        /* socket may still be racing listen/chmod */
      }
    }
    if (!identity.live) {
      fail('supervisor became absent before control readiness', EX.runtime, {
        runId: current.runId,
        state: current.state,
        failure: current.failure,
        classification: current.classification,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  fail('control readiness timed out', EX.runtime, {
    runId: manifestSeed.runId,
    state: last?.state,
    failure: last?.failure,
  });
}

function listRuns(options) {
  const requested = path.resolve(options['state-root'] ?? process.env.SUBAGENTS_STATE_ROOT ?? defaultStateRoot());
  try { accessSync(requested); } catch { return { runs: [] }; }
  const root = getStateRoot(options, false);
  const directory = path.join(root.realpath, 'runs');
  let entries;
  try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return { runs: [] }; }
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const lifecycle = { ...options, run: entry.name, 'state-root': root.realpath };
    let manifest;
    try { manifest = loadManifest(lifecycle); } catch { continue; }
    let state = 'blocked';
    let next = 'retain';
    try {
      const raw = rawStatus(lifecycle);
      if (!raw.manifest) continue;
      manifest = raw.manifest;
      state = normalizedState(manifest, raw);
      next = nextAction(state, runtimeSummary(manifest, raw));
    } catch {
      /* retain owned runs whose current state cannot be safely reconciled */
    }
    runs.push({
      runId: manifest.runId,
      state,
      role: manifest.role,
      generation: manifest.generation ?? 0,
      cwd: manifest.cwd,
      next,
    });
  }
  runs.sort((a, b) => a.runId.localeCompare(b.runId));
  return { runs };
}

function status(options) {
  if (!options.run) {
    if (options.wait || options.lines !== undefined || options.timeout !== undefined) {
      fail('--wait, --lines, and --timeout require --run', EX.usage);
    }
    return listRuns(options);
  }
  const lines = integerOption(options, 'lines', 200, 1, 5000);
  if (options.wait) return normalizedStatus(waitRun(options, { acceptIdle: true }), lines);
  return normalizedStatus(rawStatus(options), lines);
}

async function startSupervisor(options, probe) {
  if (!['linux', 'darwin'].includes(process.platform)) {
    fail('detached supervisor mode is supported only on tested Linux/macOS', EX.unsupported);
  }
  const manifest = newRun(options, probe);
  // Keep the process marker short so macOS `ps` command truncation still matches.
  const marker = `sa:${manifest.runId}:${manifest.nonce.slice(0, 8)}`;
  manifest.runtime.commandMarker = marker;
  saveManifest(manifest);
  const stdoutFd = openSync(path.join(manifest.runDir, 'wrapper.out'), 'a', 0o600);
  const stderrFd = openSync(path.join(manifest.runDir, 'wrapper.err'), 'a', 0o600);
  const child = spawn(process.execPath, [
    SCRIPT,
    '__supervisor',
    '--state-root', manifest.stateRoot.realpath,
    '--run', manifest.runId,
    '--message', marker,
  ], {
    cwd: manifest.cwd,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: childEnv(),
  });
  child.unref();
  closeSync(stdoutFd);
  closeSync(stderrFd);
  const deadline = Date.now() + SUPERVISOR_READY_MS;
  let loaded;
  while (Date.now() < deadline) {
    sleep(25);
    try { loaded = loadManifest({ ...options, run: manifest.runId, 'state-root': manifest.stateRoot.realpath }); } catch { continue; }
    if (loaded.state !== 'starting') break;
  }
  if (!loaded || loaded.state === 'starting') fail('supervisor handshake timed out', EX.runtime, { runId: manifest.runId });
  if (loaded.state === 'failed' && loaded.generation === 0) {
    fail('supervisor failed during handshake', EX.runtime, { runId: manifest.runId, failure: loaded.failure });
  }
  return waitControlReady(loaded, options);
}

async function launch(options) {
  const probe = probePi();
  await handshakePi(probe.executable, options.cwd ? path.resolve(options.cwd) : process.cwd());
  return startSupervisor(options, probe);
}

async function send(options) {
  if (!options.message) fail('--message is required', EX.usage);
  const behavior = options.behavior;
  if (behavior !== undefined && behavior !== 'steer' && behavior !== 'follow-up') {
    fail('--behavior must be steer or follow-up', EX.usage);
  }
  const manifest = loadManifest(options);
  const timeoutMs = options.timeout !== undefined ? integerOption(options, 'timeout', DEFAULT_TIMEOUT_MS) : undefined;
  const response = await controlRequest(manifest, {
    type: 'send',
    message: options.message,
    behavior: behavior ?? null,
    timeoutMs: timeoutMs ?? null,
    wait: Boolean(options.wait),
  }, options.wait ? (timeoutMs ?? manifest.runtime.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 5_000 : 10_000);
  if (options.wait) {
    const settled = rawStatus(options);
    throwIfUnsuccessfulSettlement(settled);
    return normalizedStatus(settled);
  }
  return { runId: manifest.runId, sent: true, generation: response.generation, state: response.state };
}

function waitUntilAbsent(manifest, graceMs = STOP_GRACE_MS + 2_000) {
  const deadline = Date.now() + graceMs;
  let last = verifyProcess(manifest);
  while (Date.now() < deadline) {
    last = verifyProcess(manifest);
    if (!last.live && !last.ambiguous) return last;
    sleep(50);
  }
  return last;
}

async function stop(options) {
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned' || manifest.state === 'stopped') {
    const identity = verifyProcess(manifest);
    if (manifest.state === 'stopped' && (identity.live || identity.ambiguous)) {
      // fall through and ensure teardown
    } else {
      return { runId: manifest.runId, state: manifest.state, idempotent: true };
    }
  }
  if (TERMINAL.has(manifest.state) || manifest.state === 'blocked' || manifest.state === 'failed' || manifest.state === 'timedout') {
    const identity = verifyProcess(manifest);
    if (!identity.live && !identity.ambiguous) {
      return { runId: manifest.runId, state: manifest.state, idempotent: true };
    }
  }
  try {
    await controlRequest(manifest, { type: 'stop' }, STOP_GRACE_MS + 10_000);
  } catch (error) {
    const latest = loadManifest(options);
    const verified = verifyProcess(latest);
    if (verified.live && !verified.ambiguous) {
      try { process.kill(-latest.runtime.pgid, 'SIGTERM'); } catch (killError) {
        fail(`cannot stop exact process group: ${killError.message}`, EX.runtime);
      }
    } else if (verified.ambiguous || verified.teardown) {
      fail('process group identity is ambiguous; retained', EX.safety, verified);
    }
  }
  const latest = loadManifest(options);
  const gone = waitUntilAbsent(latest);
  if (gone.live || gone.ambiguous) fail('process group did not stop completely; retained', EX.runtime, gone);
  latest.state = 'stopped';
  latest.finishedAt = now();
  saveManifest(latest);
  if (!terminalRecord(latest)) writeTerminal(latest, { state: 'stopped', reason: 'explicit-stop', generation: latest.generation });
  return { runId: latest.runId, state: 'stopped' };
}

function clean(options) {
  const tombstone = loadTombstone(options);
  if (tombstone) return { runId: tombstone.runId, state: 'cleaned', idempotent: true, tombstone };
  const manifest = loadManifest(options);
  if (manifest.state === 'cleaned') return { runId: manifest.runId, state: 'cleaned', idempotent: true };
  const live = verifyProcess(manifest);
  if (live.live || live.ambiguous) fail('runtime is live or ambiguous; retained', EX.safety, live);
  if (!options.apply) {
    return {
      runId: manifest.runId,
      dryRun: true,
      state: manifest.state,
      cwd: manifest.cwd,
      note: 'clean retires only script-owned run state; cwd is never modified',
    };
  }
  const disposition = { appliedAt: now(), previousState: manifest.state, cwdUntouched: true };
  manifest.cleanup = disposition;
  manifest.state = 'cleaned';
  saveManifest(manifest);
  retireRun(manifest, disposition);
  return { runId: manifest.runId, state: 'cleaned', stateRetired: true, cwdUntouched: true };
}

function extractUsage(message) {
  if (!message || typeof message !== 'object' || !message.usage || typeof message.usage !== 'object') return null;
  const usage = message.usage;
  return {
    input: usage.input ?? 0,
    output: usage.output ?? 0,
    cacheRead: usage.cacheRead ?? 0,
    cacheWrite: usage.cacheWrite ?? 0,
    totalTokens: usage.totalTokens ?? ((usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0)),
    cost: usage.cost ?? null,
  };
}

async function supervisorMain(options) {
  const manifest = loadManifest(options);
  const marker = options.message;
  if (!marker || marker !== manifest.runtime.commandMarker) fail('supervisor marker mismatch', EX.safety);
  const snapshot = processSnapshot(process.pid);
  if (!snapshot?.startIdentity || snapshot.pgid !== process.pid) {
    manifest.state = 'failed';
    manifest.failure = 'supervisor is not a proven process-group leader';
    saveManifest(manifest);
    writeTerminal(manifest, { state: 'failed', reason: manifest.failure, generation: 0 });
    return;
  }

  const pgid = snapshot.pgid;
  manifest.runtime.pid = process.pid;
  manifest.runtime.pgid = pgid;
  manifest.runtime.startIdentity = snapshot.startIdentity;
  manifest.runtime.startedAt = now();
  saveManifest(manifest);

  const stdoutLog = createWriteStream(manifest.logs.stdout, { flags: 'a', mode: 0o600 });
  const stderrLog = createWriteStream(manifest.logs.stderr, { flags: 'a', mode: 0o600 });
  const eventsPath = manifest.logs.events;
  const outputPath = manifest.logs.output;

  let child = null;
  let childExit = null;
  let controlQueue = Promise.resolve();
  let pendingResponse = new Map();
  let requestCounter = 0;
  let generation = 0;
  let generationDeadline = null;
  let timeoutTimer = null;
  let stopRequested = false;
  let timeoutRequested = false;
  let activeGeneration = null;
  let lastAssistant = null;
  let settledWaiters = [];
  let shuttingDown = false;
  let server = null;

  const reload = () => loadManifest({ run: manifest.runId, 'state-root': manifest.stateRoot.realpath });
  const persist = (mutator) => {
    const current = reload();
    mutator(current);
    saveManifest(current);
    Object.assign(manifest, current);
    return current;
  };

  const setOutput = (text) => {
    writeFileSync(outputPath, `${text ?? ''}\n`, { mode: 0o600 });
  };

  const clearTimeoutTimer = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  const finishGeneration = (state, classification, usage = null) => {
    clearTimeoutTimer();
    const text = classification?.text ?? assistantText(lastAssistant) ?? '';
    setOutput(text);
    persist((current) => {
      current.state = state;
      current.generation = generation;
      current.classification = classification;
      current.usage = usage;
      if (state !== 'idle') current.finishedAt = now();
      else delete current.finishedAt;
    });
    writeTerminal(manifest, {
      state,
      generation,
      classification,
      usage,
      output: text,
      stopRequested,
      timeoutRequested,
    });
    const waiters = settledWaiters;
    settledWaiters = [];
    for (const waiter of waiters) waiter({ state, generation, classification });
    activeGeneration = null;
    if (state !== 'idle') {
      // keep process for idle follow-up only
    }
  };

  const requestId = () => {
    requestCounter += 1;
    return `req-${requestCounter}`;
  };

  const sendRpc = (command) => new Promise((resolve, reject) => {
    if (!child?.stdin?.writable) {
      reject(new CliError('Pi RPC stdin is not writable', EX.runtime));
      return;
    }
    const id = command.id ?? requestId();
    const payload = { ...command, id };
    pendingResponse.set(id, { resolve, reject, command: payload.type });
    try {
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    } catch (error) {
      pendingResponse.delete(id);
      reject(new CliError(`failed to write RPC command: ${error.message}`, EX.runtime));
    }
  });

  const armDeadline = (timeoutMs) => {
    clearTimeoutTimer();
    generationDeadline = Date.now() + timeoutMs;
    timeoutTimer = setTimeout(async () => {
      if (!activeGeneration || stopRequested) return;
      timeoutRequested = true;
      try { await sendRpc({ type: 'abort' }); } catch { /* best effort */ }
      setTimeout(() => {
        if (activeGeneration && timeoutRequested && !stopRequested) {
          finishGeneration('timedout', {
            state: 'timedout',
            reason: 'timeout-without-settlement',
            text: assistantText(lastAssistant),
          }, extractUsage(lastAssistant));
        }
      }, STOP_GRACE_MS);
    }, Math.max(1, timeoutMs));
  };

  const waitForSettlement = (expectedGeneration, waitTimeoutMs) => new Promise((resolve, reject) => {
    if (!activeGeneration && manifest.generation === expectedGeneration && SETTLED_STATES.has(manifest.state)) {
      resolve({ state: manifest.state, generation: manifest.generation, classification: manifest.classification });
      return;
    }
    const timer = setTimeout(() => {
      settledWaiters = settledWaiters.filter((entry) => entry !== onSettle);
      reject(new CliError('wait timed out before generation settled', EX.timeout));
    }, waitTimeoutMs);
    const onSettle = (value) => {
      if (value.generation !== expectedGeneration) return;
      clearTimeout(timer);
      settledWaiters = settledWaiters.filter((entry) => entry !== onSettle);
      resolve(value);
    };
    settledWaiters.push(onSettle);
  });

  const handleLine = (line) => {
    stdoutLog.write(`${line}\n`);
    let message;
    try { message = JSON.parse(line); } catch {
      appendLine(eventsPath, { type: 'malformed_stdout', line: bounded(line, 2048), at: now() });
      if (activeGeneration) {
        finishGeneration('blocked', { state: 'blocked', reason: 'malformed-json-stdout', line: bounded(line, 512) });
      }
      return;
    }
    appendLine(eventsPath, { ...message, at: now() });

    if (message.type === 'response') {
      const pending = message.id != null ? pendingResponse.get(message.id) : null;
      if (pending) {
        pendingResponse.delete(message.id);
        if (message.success) pending.resolve(message);
        else pending.reject(new CliError(message.error || `RPC ${message.command} failed`, EX.runtime, message));
      }
      return;
    }

    if (message.type === 'extension_ui_request') {
      const method = message.method;
      if (['select', 'confirm', 'input', 'editor'].includes(method)) {
        try {
          child.stdin.write(`${JSON.stringify({ type: 'extension_ui_response', id: message.id, cancelled: true })}\n`);
        } catch { /* ignore */ }
        appendLine(eventsPath, { type: 'extension_ui_cancelled', id: message.id, method, at: now() });
      }
      return;
    }

    if (message.type === 'message_end' && message.message?.role === 'assistant') {
      lastAssistant = message.message;
      return;
    }

    if (message.type === 'agent_settled') {
      if (!activeGeneration) return;
      const classification = classifyAssistant(lastAssistant, { stopRequested, timeoutRequested });
      const usage = extractUsage(lastAssistant);
      finishGeneration(classification.state, classification, usage);
    }
  };

  const startChild = () => {
    child = spawn(manifest.runtime.executable, manifest.runtime.argv, {
      cwd: manifest.cwd,
      env: childEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    childExit = new Promise((resolve) => {
      child.on('exit', (code, signal) => resolve({ code, signal }));
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => stderrLog.write(chunk));
    attachJsonlReader(child.stdout, handleLine, (error) => {
      appendLine(eventsPath, { type: 'stdout_error', error: error.message, at: now() });
    });
    child.on('error', (error) => {
      appendLine(eventsPath, { type: 'child_error', error: error.message, at: now() });
      if (activeGeneration) finishGeneration('failed', { state: 'failed', reason: error.message });
      else {
        persist((current) => {
          current.state = 'failed';
          current.failure = error.message;
        });
        writeTerminal(manifest, { state: 'failed', reason: error.message, generation });
      }
    });
    child.on('exit', (code, signal) => {
      appendLine(eventsPath, { type: 'child_exit', code, signal, at: now() });
      if (activeGeneration) {
        finishGeneration('blocked', { state: 'blocked', reason: 'premature-eof', code, signal });
      } else if (!shuttingDown && !TERMINAL.has(manifest.state) && manifest.state !== 'idle' && manifest.state !== 'blocked') {
        persist((current) => {
          if (current.state === 'running' || current.state === 'starting') {
            current.state = 'blocked';
            current.failure = 'pi exited unexpectedly';
          }
        });
      }
      // During explicit shutdown the stop handler owns server teardown after it replies.
      if (!shuttingDown) {
        if (server) {
          try { server.close(); } catch { /* ignore */ }
        }
        try { unlinkSync(manifest.controlSocket); } catch { /* ignore */ }
        setTimeout(() => process.exit(0), 10);
      }
    });
  };

  const beginPromptGeneration = async (message, timeoutMs) => {
    if (activeGeneration) fail('a generation is already active', EX.runtime);
    if (!(manifest.state === 'idle' || manifest.state === 'starting' || (manifest.state === 'running' && generation === 0))) {
      fail(`cannot prompt while state is ${manifest.state}`, EX.safety);
    }
    stopRequested = false;
    timeoutRequested = false;
    lastAssistant = null;
    try { unlinkSync(manifest.logs.terminal); } catch { /* no prior terminal */ }
    generation += 1;
    activeGeneration = generation;
    persist((current) => {
      current.state = 'running';
      current.generation = generation;
      delete current.finishedAt;
      current.classification = null;
    });
    armDeadline(timeoutMs);
    try {
      await sendRpc({ type: 'prompt', message });
    } catch (error) {
      finishGeneration('failed', { state: 'failed', reason: error.message });
      throw error;
    }
    return generation;
  };

  const handleSend = async (request) => {
    const message = request.message;
    if (typeof message !== 'string' || !message.trim()) fail('--message is required', EX.usage);
    const behavior = request.behavior;
    const wait = Boolean(request.wait);
    if (activeGeneration) {
      if (behavior !== 'steer' && behavior !== 'follow-up') {
        fail('active generation requires --behavior steer|follow-up', EX.usage);
      }
      const rpcType = behavior === 'steer' ? 'steer' : 'follow_up';
      await sendRpc({ type: rpcType, message });
      if (wait) {
        const settled = await waitForSettlement(generation, Math.max(1, (generationDeadline ?? Date.now()) - Date.now() + 1_000));
        return { ok: true, generation, state: settled.state, waited: true };
      }
      return { ok: true, generation, state: 'running' };
    }
    if (behavior) fail('--behavior is only valid while a generation is running', EX.usage);
    if (manifest.state !== 'idle' && generation !== 0) fail(`cannot start a new prompt while state is ${manifest.state}`, EX.safety);
    if (manifest.state === 'starting') fail('cannot prompt during start transition', EX.safety);
    const timeoutMs = Number.isSafeInteger(request.timeoutMs) && request.timeoutMs > 0
      ? request.timeoutMs
      : (manifest.runtime.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const gen = await beginPromptGeneration(message, timeoutMs);
    if (wait) {
      const settled = await waitForSettlement(gen, timeoutMs + 5_000);
      return { ok: true, generation: gen, state: settled.state, waited: true };
    }
    return { ok: true, generation: gen, state: 'running' };
  };

  const gracefulShutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearTimeoutTimer();
    try {
      if (child?.stdin?.writable) {
        try { await sendRpc({ type: 'abort' }); } catch { /* ignore */ }
        try { child.stdin.end(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    const deadline = Date.now() + STOP_GRACE_MS;
    while (Date.now() < deadline && child && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (child && child.exitCode === null && child.signalCode === null) {
      try { process.kill(-pgid, 'SIGTERM'); } catch { /* ignore */ }
    }
    const membersDeadline = Date.now() + STOP_GRACE_MS;
    while (Date.now() < membersDeadline) {
      const members = processGroupMembers(pgid) ?? [];
      if (!pidAlive(child?.pid) && members.every((pid) => pid === process.pid)) break;
      if ((processGroupMembers(pgid) ?? []).length <= 1 && (child?.exitCode !== null || child?.signalCode !== null)) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  const handleStop = async () => {
    stopRequested = true;
    if (activeGeneration) {
      try { await sendRpc({ type: 'abort' }); } catch { /* ignore */ }
      try {
        await waitForSettlement(generation, STOP_GRACE_MS + 1_000);
      } catch {
        finishGeneration('stopped', { state: 'stopped', reason: 'explicit-stop', text: assistantText(lastAssistant) });
      }
    } else {
      persist((current) => {
        current.state = 'stopped';
        current.finishedAt = now();
      });
      writeTerminal(manifest, { state: 'stopped', reason: 'explicit-stop', generation });
    }
    await gracefulShutdown();
    // Reply path must complete before tearing down the control server/process.
    setTimeout(() => {
      if (server) {
        try { server.close(); } catch { /* ignore */ }
      }
      try { unlinkSync(manifest.controlSocket); } catch { /* ignore */ }
      process.exit(0);
    }, 100);
    return { ok: true, state: 'stopped' };
  };

  const enqueue = (work) => {
    const run = controlQueue.then(work, work);
    controlQueue = run.catch(() => {});
    return run;
  };

  startChild();

  // bootstrap generation 1 from prompt file
  const initialPrompt = readFileSync(manifest.logs.prompt, 'utf8');
  await beginPromptGeneration(initialPrompt, manifest.runtime.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  await new Promise((resolve, reject) => {
    try { unlinkSync(manifest.controlSocket); } catch { /* ignore */ }
    server = createServer((socket) => {
      let buffer = '';
      socket.setEncoding('utf8');
      socket.on('data', (chunk) => {
        buffer += chunk;
        const index = buffer.indexOf('\n');
        if (index === -1) return;
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        enqueue(async () => {
          let request;
          try { request = JSON.parse(line); } catch {
            socket.write(`${JSON.stringify({ ok: false, error: 'invalid control JSON', code: EX.usage })}\n`);
            socket.end();
            return;
          }
          if (request.nonce !== manifest.nonce) {
            socket.write(`${JSON.stringify({ ok: false, error: 'control nonce mismatch', code: EX.safety })}\n`);
            socket.end();
            return;
          }
          try {
            let response;
            if (request.type === 'send') response = await handleSend(request);
            else if (request.type === 'stop') response = await handleStop();
            else if (request.type === 'status') {
              response = {
                ok: true,
                state: manifest.state,
                generation: manifest.generation,
                active: Boolean(activeGeneration),
              };
            } else {
              fail(`unknown control request: ${request.type}`, EX.usage);
            }
            socket.write(`${JSON.stringify(response)}\n`);
          } catch (error) {
            const code = error instanceof CliError ? error.code : EX.runtime;
            socket.write(`${JSON.stringify({
              ok: false,
              error: error.message,
              code,
              details: error.details,
            })}\n`);
          } finally {
            socket.end();
          }
        });
      });
    });
    server.on('error', reject);
    server.listen(manifest.controlSocket, () => {
      try { chmodSync(manifest.controlSocket, 0o600); } catch { /* best effort */ }
      // ready: generation already running
      resolve();
    });
  });

  // stay alive until child exits or stop completes
  await childExit;
  stdoutLog.end();
  stderrLog.end();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    out({ ok: true, help: HELP });
    return 0;
  }
  if (options.command === '__supervisor') {
    await supervisorMain(options);
    return 0;
  }
  let result;
  switch (options.command) {
    case 'info':
      result = await info();
      break;
    case 'run': {
      const started = await launch(options);
      const lifecycle = { ...options, run: started.runId, 'state-root': started.stateRoot.realpath };
      if (!options.async) {
        // Caller wait must outlive the generation deadline plus abort/settle grace.
        const executionTimeout = integerOption(options, 'timeout', DEFAULT_TIMEOUT_MS);
        waitRun(lifecycle, { acceptIdle: true, timeoutMs: executionTimeout + STOP_GRACE_MS + 5_000 });
      }
      result = status(lifecycle);
      break;
    }
    case 'status':
      result = status(options);
      break;
    case 'send':
      result = await send(options);
      break;
    case 'stop':
      result = await stop(options);
      break;
    case 'clean':
      result = clean(options);
      break;
    default:
      fail('unreachable command', EX.usage);
  }
  out({ ok: true, ...result });
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  const code = error instanceof CliError ? error.code : EX.runtime;
  diagnostic(error?.stack && !(error instanceof CliError) ? error.stack : error.message);
  out({
    ok: false,
    error: error.message,
    category: Object.keys(EX).find((key) => EX[key] === code) ?? 'runtime',
    details: error.details,
  });
  process.exitCode = code;
}
