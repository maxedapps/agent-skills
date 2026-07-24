import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  main,
  openInDefaultBrowser,
  openerCommand
} from './render-explainer.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptsDirectory, '..');
const renderer = path.join(scriptsDirectory, 'render-explainer.mjs');
const runtimePath = path.join(skillDirectory, 'assets', 'explainer.js');
const mermaidLicensePath = path.join(skillDirectory, 'node_modules', 'mermaid', 'LICENSE');
const workspaces = new Set();

async function workspace() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'render-explainer-test-'));
  workspaces.add(directory);
  return directory;
}

after(async () => {
  for (const directory of workspaces) {
    await rm(directory, { recursive: true, force: true });
  }
});

function run(args, options = {}) {
  return spawnSync(process.execPath, [renderer, ...args], {
    cwd: options.cwd ?? skillDirectory,
    encoding: 'utf8',
    timeout: 60_000
  });
}

async function renderMarkdown(markdown, options = {}) {
  const directory = options.directory ?? await workspace();
  const input = path.join(directory, options.inputName ?? 'document.md');
  const output = path.join(directory, options.outputName ?? 'document.html');
  await writeFile(input, markdown, 'utf8');
  const args = ['--input', input, '--output', output, '--no-open'];
  if (Object.hasOwn(options, 'title')) args.push('--title', options.title);
  if (options.force) args.push('--force');
  const result = run(args, { cwd: options.cwd });
  const html = result.status === 0 ? await readFile(output, 'utf8') : null;
  return { directory, input, output, result, html };
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function captureStream() {
  let value = '';
  return {
    stream: { write: (chunk) => { value += chunk; } },
    value: () => value
  };
}

function fakeSpawn(outcome) {
  return () => {
    const child = new EventEmitter();
    child.kill = () => true;
    queueMicrotask(() => {
      if (outcome === 'missing') {
        child.emit('error', Object.assign(new Error('not found'), { code: 'ENOENT' }));
      } else if (outcome === 'nonzero') {
        child.emit('close', 7, null);
      } else if (outcome === 'success') {
        child.emit('close', 0, null);
      }
    });
    return child;
  };
}

async function runMainRender(markdown, { extraArgs = [], openOutput } = {}) {
  const directory = await workspace();
  const input = path.join(directory, 'input.md');
  const output = path.join(directory, 'output.html');
  await writeFile(input, markdown, 'utf8');
  const stdout = captureStream();
  const stderr = captureStream();
  const status = await main(
    ['--input', input, '--output', output, ...extraArgs],
    { stdout: stdout.stream, stderr: stderr.stream, openOutput }
  );
  return {
    status,
    output,
    stdout: stdout.value(),
    stderr: stderr.value()
  };
}

test('--help reports auto-open and --no-open without requiring render arguments', () => {
  const result = run(['--help'], { cwd: os.tmpdir() });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Usage: node scripts\/render-explainer\.mjs/);
  assert.match(result.stdout, /open it in the default browser/);
  assert.match(result.stdout, /--input <markdown>/);
  assert.match(result.stdout, /--force/);
  assert.match(result.stdout, /--no-open.*CI, tests, SSH, or headless/);
  assert.equal(result.stderr, '');
});

test('every argument rejects duplicate occurrences', () => {
  for (const args of [
    ['--help', '--help'],
    ['--force', '--force'],
    ['--no-open', '--no-open'],
    ['--input', 'one.md', '--input', 'two.md'],
    ['--output', 'one.html', '--output', 'two.html'],
    ['--title', 'one', '--title', 'two']
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0, `expected duplicate failure for ${JSON.stringify(args)}`);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /may only be specified once/);
  }
});

test('argument and input errors are concise diagnostics on stderr', () => {
  for (const [args, diagnostic] of [
    [[], /missing required --input/],
    [['--wat'], /unknown argument: --wat/],
    [['--input'], /--input requires a value/],
    [['--input', 'missing.md', '--output', 'out.html', '--no-open'], /cannot read input/]
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0, `expected failure for ${JSON.stringify(args)}`);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^render-explainer: /);
    assert.match(result.stderr, diagnostic);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});

test('opener command mapping is cross-platform and uses safe argument arrays', () => {
  const output = path.resolve('artifact with spaces.html');
  assert.deepEqual(openerCommand(output, 'darwin'), {
    command: 'open',
    args: [output]
  });
  assert.deepEqual(openerCommand(output, 'linux'), {
    command: 'xdg-open',
    args: [output]
  });
  assert.deepEqual(openerCommand(output, 'freebsd'), {
    command: 'xdg-open',
    args: [output]
  });

  const unsafeOutput = path.resolve('artifact with spaces & | < > ^ ( ) % !.html');
  const windowsOpener = openerCommand(unsafeOutput, 'win32');
  assert.deepEqual(windowsOpener, {
    command: 'rundll32.exe',
    args: ['url.dll,FileProtocolHandler', pathToFileURL(unsafeOutput).href]
  });
  assert.notEqual(windowsOpener.command.toLowerCase(), 'cmd.exe');
  assert.ok(!windowsOpener.args.includes('/c'), 'Windows opener must not invoke a command shell');
  assert.equal(fileURLToPath(windowsOpener.args[1]), unsafeOutput);
});

test('--no-open skips the opener and reports that result explicitly', async () => {
  let calls = 0;
  const rendered = await runMainRender('# No browser\n', {
    extraArgs: ['--no-open'],
    openOutput: async () => {
      calls += 1;
      return { status: 'launched' };
    }
  });

  assert.equal(rendered.status, 0, rendered.stderr);
  assert.equal(calls, 0);
  assert.deepEqual(JSON.parse(rendered.stdout).open, {
    status: 'skipped',
    reason: '--no-open'
  });
  assert.equal(rendered.stderr, '');
  assert.match(await readFile(rendered.output, 'utf8'), /<h1>No browser<\/h1>/);
});

test('default rendering launches the opener and reports success explicitly', async () => {
  let invocation;
  const spawnProcess = (...args) => {
    invocation = args;
    return fakeSpawn('success')();
  };
  const rendered = await runMainRender('# Open locally\n', {
    openOutput: (output) => openInDefaultBrowser(output, {
      platform: 'darwin',
      spawnProcess,
      observationMs: 50
    })
  });

  assert.equal(rendered.status, 0, rendered.stderr);
  assert.deepEqual(invocation.slice(0, 2), ['open', [rendered.output]]);
  assert.deepEqual(invocation[2], {
    detached: true,
    shell: false,
    stdio: 'ignore',
    windowsHide: true
  });
  assert.deepEqual(JSON.parse(rendered.stdout).open, { status: 'launched' });
  assert.equal(rendered.stderr, '');
  assert.match(await readFile(rendered.output, 'utf8'), /<h1>Open locally<\/h1>/);
});

test('a long-running opener is treated as handed off, unreferenced, and cleaned up', async () => {
  let child;
  let closed;
  let unrefCalls = 0;
  const spawnProcess = (_command, _args, options) => {
    child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], options);
    closed = new Promise((resolve) => child.once('close', resolve));
    const unref = child.unref.bind(child);
    child.unref = () => {
      unrefCalls += 1;
      return unref();
    };
    return child;
  };

  const startedAt = Date.now();
  let result;
  try {
    result = await openInDefaultBrowser('/tmp/long-running-opener.html', {
      platform: 'linux',
      spawnProcess,
      observationMs: 50
    });
    assert.ok(Date.now() - startedAt < 1_000, 'handoff should return promptly');
    assert.deepEqual(result, { status: 'launched' });
    assert.equal(unrefCalls, 1);
    assert.doesNotThrow(() => process.kill(child.pid, 0), 'opener should still be running at handoff');
  } finally {
    if (child?.pid) {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    if (closed) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('opener child did not exit during cleanup')), 2_000);
        closed.then(() => {
          clearTimeout(timer);
          resolve();
        }, reject);
      });
    }
  }

  assert.throws(() => process.kill(child.pid, 0), { code: 'ESRCH' }, 'opener process leaked after cleanup');
});

test('missing and immediate nonzero openers warn without invalidating output', async () => {
  const cases = [
    ['missing', { status: 'failed', reason: 'missing' }],
    ['nonzero', { status: 'failed', reason: 'nonzero', code: 7 }]
  ];

  for (const [outcome, expected] of cases) {
    const openOutput = (output) => openInDefaultBrowser(output, {
      platform: 'linux',
      spawnProcess: fakeSpawn(outcome),
      observationMs: 50
    });
    const rendered = await runMainRender(`# ${outcome}\n`, { openOutput });

    assert.equal(rendered.status, 0, rendered.stderr);
    assert.deepEqual(JSON.parse(rendered.stdout).open, expected);
    assert.match(rendered.stderr, /^render-explainer: warning: could not open output/);
    assert.match(rendered.stderr, /HTML was written to/);
    assert.match(await readFile(rendered.output, 'utf8'), new RegExp(`<h1>${outcome}</h1>`));
  }
});

test('existing output is protected unless --force is supplied', async () => {
  const directory = await workspace();
  const input = path.join(directory, 'input.md');
  const output = path.join(directory, 'output.html');
  await writeFile(input, '# First\n', 'utf8');

  const first = run(['--input', input, '--output', output, '--no-open']);
  assert.equal(first.status, 0, first.stderr);
  const original = await readFile(output, 'utf8');

  await writeFile(input, '# Second\n', 'utf8');
  const protectedResult = run(['--input', input, '--output', output, '--no-open']);
  assert.notEqual(protectedResult.status, 0);
  assert.match(protectedResult.stderr, /output already exists.*--force/);
  assert.equal(await readFile(output, 'utf8'), original);

  const forced = run(['--input', input, '--output', output, '--force', '--no-open']);
  assert.equal(forced.status, 0, forced.stderr);
  assert.match(await readFile(output, 'utf8'), /<h1>Second<\/h1>/);
});

test('title precedence is CLI title, first h1, then filename stem', async () => {
  const cli = await renderMarkdown('# Heading\n', { title: 'CLI & title' });
  assert.equal(cli.result.status, 0, cli.result.stderr);
  assert.match(cli.html, /<title>CLI &amp; title<\/title>/);
  assert.match(cli.html, /aria-label="CLI &amp; title"/);

  const heading = await renderMarkdown('intro\n\n# *Rendered* `heading`\n');
  assert.equal(heading.result.status, 0, heading.result.stderr);
  assert.match(heading.html, /<title>Rendered heading<\/title>/);

  const filename = await renderMarkdown('No heading.\n', { inputName: 'fallback-name.md' });
  assert.equal(filename.result.status, 0, filename.result.stderr);
  assert.match(filename.html, /<title>fallback-name<\/title>/);
});

test('template marker literals in titles and Markdown remain escaped literal content', async () => {
  const markers = [
    '@@EXPLAINER_TITLE@@',
    '@@EXPLAINER_CSS@@',
    '@@EXPLAINER_CONTENT@@',
    '@@EXPLAINER_MERMAID@@'
  ];
  const markerText = markers.join(' ');
  const markdown = `# Heading <tag> & ${markerText}

Prose <tag> & ${markerText}

\`\`\`
code <tag> & ${markerText}
\`\`\`
`;
  const rendered = await renderMarkdown(markdown, {
    title: `CLI <title> & ${markerText}`
  });

  assert.equal(rendered.result.status, 0, rendered.result.stderr);
  assert.match(rendered.html, new RegExp(`<title>CLI &lt;title&gt; &amp; ${markerText}</title>`));
  assert.match(rendered.html, new RegExp(`<h1>Heading &lt;tag&gt; &amp; ${markerText}</h1>`));
  assert.match(rendered.html, new RegExp(`<p>Prose &lt;tag&gt; &amp; ${markerText}</p>`));
  assert.match(rendered.html, new RegExp(`<code>code &lt;tag&gt; &amp; ${markerText}`));
  for (const marker of markers) {
    assert.equal(count(rendered.html, marker), 5, `${marker} should remain literal everywhere`);
  }
});

test('Markdown features render safely with responsive table and code structures', async () => {
  const markdown = `# Safety

| Name | Value |
| --- | --- |
| one | two |

[HTTPS](https://example.com/docs) [relative](./guide.html)
[script](javascript:alert(1)) [data](data:text/html,bad)

![remote image](https://images.example.test/tracker.png "title")

<strong>raw inline</strong>

<div>raw block</div>

\`\`\`javascript
const answer = 42;
\`\`\`

\`\`\`made-up-language
<tag>& text
\`\`\`

\`\`\`
unlabelled <tag>
\`\`\`
`;
  const rendered = await renderMarkdown(markdown);
  assert.equal(rendered.result.status, 0, rendered.result.stderr);
  const { html } = rendered;

  assert.match(html, /class="table-wrap"[^>]*tabindex="0"/);
  assert.match(html, /<table>/);
  assert.match(html, /data-language="javascript" class="shiki/);
  assert.match(html, /class="code-block plaintext"><code>&lt;tag&gt;&amp; text/);
  assert.match(html, /class="code-block plaintext"><code>unlabelled &lt;tag&gt;/);
  assert.match(html, /&lt;strong&gt;raw inline&lt;\/strong&gt;/);
  assert.match(html, /&lt;div&gt;raw block&lt;\/div&gt;/);

  assert.match(html, /href="https:\/\/example\.com\/docs"/);
  assert.match(html, /href="\.\/guide\.html"/);
  assert.doesNotMatch(html, /href="(?:javascript|data):/i);
  assert.match(html, /\[script\]\(javascript:alert\(1\)\)/);

  assert.match(html, /class="markdown-image-placeholder"/);
  assert.match(html, /\[Image: remote image\]/);
  assert.doesNotMatch(html, /<img\b/i);
  assert.doesNotMatch(html, /images\.example\.test/);
  assert.equal(count(html, '<article '), 1);
});

test('rendering resolves installed dependencies and assets outside the skill cwd', async () => {
  const rendered = await renderMarkdown('# External cwd\n\n```js\nlet ok = true;\n```\n', {
    cwd: os.tmpdir()
  });
  assert.equal(rendered.result.status, 0, rendered.result.stderr);
  assert.match(rendered.html, /class="shiki/);

  const success = JSON.parse(rendered.result.stdout);
  assert.deepEqual(Object.keys(success).sort(), ['mermaidDiagrams', 'open', 'output', 'title']);
  assert.equal(success.output, rendered.output);
  assert.equal(success.title, 'External cwd');
  assert.equal(success.mermaidDiagrams, 0);
  assert.deepEqual(success.open, { status: 'skipped', reason: '--no-open' });
  assert.ok(rendered.result.stdout.length < 1_000, 'success output should stay bounded');
  assert.equal(rendered.result.stderr, '');
});

test('the same input and options produce byte-identical HTML', async () => {
  const directory = await workspace();
  const input = path.join(directory, 'stable.md');
  const firstOutput = path.join(directory, 'one.html');
  const secondOutput = path.join(directory, 'two.html');
  await writeFile(input, '# Stable\n\n```ts\nconst value: number = 1;\n```\n', 'utf8');

  const first = run(['--input', input, '--output', firstOutput, '--no-open']);
  const second = run(['--input', input, '--output', secondOutput, '--no-open']);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(await readFile(firstOutput, 'utf8'), await readFile(secondOutput, 'utf8'));
});

test('non-Mermaid output is CSS-only and contains no loadable resources', async () => {
  const rendered = await renderMarkdown('# Plain\n\nNo diagrams.\n');
  assert.equal(rendered.result.status, 0, rendered.result.stderr);
  assert.doesNotMatch(rendered.html, /<script\b/i);
  assert.doesNotMatch(rendered.html, /<link\b|<img\b|<iframe\b|<object\b/i);
  assert.doesNotMatch(rendered.html, /The MIT License \(MIT\)/);
  assert.match(rendered.html, /<style>/);
  assert.match(rendered.html, /prefers-color-scheme: dark/);
  assert.match(rendered.html, /prefers-reduced-motion: reduce/);
  assert.match(rendered.html, /@media print/);
});

test('Mermaid is bundled and licensed exactly once with strict, local failure handling', async () => {
  const markdown = `# Diagrams

\`\`\`mermaid
graph TD
  A["<unsafe>"] --> B
\`\`\`

Text between diagrams.

\`\`\`MERMAID
this is invalid
\`\`\`
`;
  const rendered = await renderMarkdown(markdown);
  assert.equal(rendered.result.status, 0, rendered.result.stderr);
  const license = (await readFile(mermaidLicensePath, 'utf8')).trimEnd();
  const runtime = await readFile(runtimePath, 'utf8');
  const success = JSON.parse(rendered.result.stdout);

  assert.equal(success.mermaidDiagrams, 2);
  assert.equal(count(rendered.html, license), 1, 'the complete Mermaid license must occur once');
  assert.equal(count(rendered.html, 'globalThis["mermaid"] ='), 1, 'standalone bundle must occur once');
  assert.equal(count(rendered.html, "securityLevel: 'strict'"), 1);
  assert.equal(count(rendered.html, 'globalThis.ExplainerMermaidRuntime ='), 1, 'local runtime must occur once');
  assert.equal(count(rendered.html, 'data-diagram-index="1" data-state="source"'), 1);
  assert.equal(count(rendered.html, 'data-diagram-index="2" data-state="source"'), 1);
  assert.match(rendered.html, /A\[&quot;&lt;unsafe&gt;&quot;\] --&gt; B/);
  assert.match(rendered.html, /Text between diagrams/);
  assert.doesNotMatch(rendered.html, /sourceMappingURL/);

  assert.match(runtime, /for \(var index = 0; index < diagrams\.length; index \+= 1\)/);
  assert.match(runtime, /await renderDiagram\(diagrams\[index\]/);
  assert.match(runtime, /async function renderDiagram[\s\S]*?try \{[\s\S]*?catch \(_error\) \{\s*showLocalError\(diagram\)/);
  assert.match(runtime, /sourceNode\.textContent/);
  assert.match(runtime, /output\.innerHTML = result\.svg/);
  assert.match(runtime, /fitSvgToContent\(output\.querySelector\('svg'\)\)/);
  assert.match(runtime, /graphics\.getBBox\(\)/);
  assert.match(runtime, /svg\.setAttribute\('viewBox'/);
  assert.match(runtime, /diagram\.setAttribute\('data-state', 'error'\)/);
  assert.match(runtime, /Its source is shown below/);
});
