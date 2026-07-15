import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const renderer = fileURLToPath(new URL('./render-plan-html.mjs', import.meta.url))

function runRenderer(args, { cwd, env = process.env } = {}) {
  return spawnSync(process.execPath, [renderer, ...args], {
    cwd,
    env,
    encoding: 'utf8',
  })
}

function requireBun() {
  const result = spawnSync('bun', ['--version'], { encoding: 'utf8' })
  assert.equal(
    result.status,
    0,
    `Bun is mandatory for rich renderer safety tests: ${result.error?.message || result.stderr}`,
  )
}

async function withTempDir(run) {
  const root = await mkdtemp(join(tmpdir(), 'render-plan-html-'))
  try {
    return await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

async function renderFixture(root, markdown, {
  input = 'plan.md',
  output = 'out/plan.html',
  cwd = root,
  env = process.env,
} = {}) {
  const inputPath = join(root, input)
  const outputPath = join(root, output)
  await mkdir(dirname(inputPath), { recursive: true })
  await writeFile(inputPath, markdown, 'utf8')
  const result = runRenderer([inputPath, '--out', outputPath], { cwd, env })
  const html = result.status === 0 ? await readFile(outputPath, 'utf8') : ''
  return { result, html, inputPath, outputPath }
}

function extractNonce(html) {
  const cspNonce = html.match(/script-src 'nonce-([^']+)'/)?.[1]
  const scriptNonce = html.match(/<script nonce="([^"]+)">/)?.[1]
  assert.ok(cspNonce, 'CSP script nonce should be present')
  assert.ok(scriptNonce, 'bundled script nonce should be present')
  assert.equal(scriptNonce, cspNonce, 'CSP and bundled script nonces must match')
  return cspNonce
}

test('requires Bun and renders normal Markdown as rich HTML', async () => {
  requireBun()
  await withTempDir(async (root) => {
    const { result, html, outputPath } = await renderFixture(
      root,
      '# Rich plan\n\nA **bold** decision.\n',
      { input: 'plans/rich.md' },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.match(html, /<h1 id="rich-plan">Rich plan<\/h1>/)
    assert.match(html, /<strong>bold<\/strong>/)
    assert.doesNotMatch(html, /<pre><code># Rich plan/)
    assert.equal(await readFile(outputPath, 'utf8'), html)
    assert.match(html, /Source: plans\/rich\.md/)
  })
})

test('falls back to escaped plain text when Bun is hidden from PATH', async () => {
  await withTempDir(async (root) => {
    const env = { ...process.env, PATH: join(root, 'no-bin') }
    const { result, html } = await renderFixture(
      root,
      '# Fallback\n\n<script>globalThis.probe = true</script>\n',
      { env },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stderr, /Falling back to escaped plain text/)
    assert.match(html, /<pre><code># Fallback/)
    assert.match(html, /&lt;script&gt;globalThis\.probe = true&lt;\/script&gt;/)
    assert.equal((html.match(/<script\b/g) || []).length, 1)
  })
})

test('Bun-rich rendering neutralizes raw active HTML and CSP contains remaining script-capable URLs', async () => {
  requireBun()
  await withTempDir(async (root) => {
    const malicious = `# Hostile plan

<script>globalThis.rawScriptProbe = true</script>
<img src="https://attacker.invalid/pixel" onerror="globalThis.eventProbe=true">
[JavaScript probe](javascript:globalThis.javascriptProbe=true)
<svg onload="globalThis.svgProbe=true"><script>globalThis.svgScriptProbe=true</script></svg>
<math><mtext onclick="globalThis.mathProbe=true">probe</mtext></math>
<iframe src="https://attacker.invalid/frame" srcdoc="<script>globalThis.frameProbe=true</script>"></iframe>
<form action="https://attacker.invalid/form"><input name="secret"><button formaction="https://attacker.invalid/button">Send</button></form>
`
    const { result, html } = await renderFixture(root, malicious)

    assert.equal(result.status, 0, result.stderr)
    const actualTags = html.match(/<[^>]+>/g) || []
    for (const dangerousName of ['img', 'svg', 'math', 'iframe', 'form', 'input']) {
      assert.equal(
        actualTags.filter((tag) => new RegExp(`^<${dangerousName}\\b`, 'i').test(tag)).length,
        0,
        `rendered output must not contain a ${dangerousName} element`,
      )
    }
    assert.equal(actualTags.filter((tag) => /^<button\b/i.test(tag)).length, 1)
    assert.equal(actualTags.filter((tag) => /^<script\b/i.test(tag)).length, 1)
    for (const tag of actualTags) {
      assert.doesNotMatch(tag, /\son[a-z]+\s*=/i)
    }

    assert.match(html, /href="javascript:globalThis\.javascriptProbe=true"/)
    assert.match(html, /script-src 'nonce-[^']+'/)
    assert.doesNotMatch(html, /script-src[^;]*(?:'unsafe-inline'|\*)/)
    assert.doesNotMatch(html, /<script(?! nonce=)/)
  })
})

test('emits restrictive CSP with a matching, cryptographically random per-render nonce', async () => {
  requireBun()
  await withTempDir(async (root) => {
    const first = await renderFixture(root, '# First\n', { output: 'first.html' })
    const second = await renderFixture(root, '# Second\n', { output: 'second.html' })
    assert.equal(first.result.status, 0, first.result.stderr)
    assert.equal(second.result.status, 0, second.result.stderr)

    const firstNonce = extractNonce(first.html)
    const secondNonce = extractNonce(second.html)
    assert.notEqual(firstNonce, secondNonce)
    assert.ok(firstNonce.length >= 24)

    for (const directive of [
      "default-src 'none'",
      "base-uri 'none'",
      "connect-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'none'",
      "object-src 'none'",
      "script-src-attr 'none'",
      "form-action 'none'",
      "worker-src 'none'",
      "style-src 'unsafe-inline'",
    ]) {
      assert.match(first.html, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
    assert.equal((first.html.match(/<script\b/g) || []).length, 1)
  })
})

test('never embeds an absolute input path and uses basename outside cwd', async () => {
  await withTempDir(async (cwdRoot) => {
    await withTempDir(async (inputRoot) => {
      const { result, html, inputPath } = await renderFixture(inputRoot, '# Private\n', {
        cwd: cwdRoot,
      })
      assert.equal(result.status, 0, result.stderr)
      assert.match(html, /Source: plan\.md/)
      assert.doesNotMatch(html, new RegExp(inputPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      assert.doesNotMatch(html, new RegExp(inputRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    })
  })
})

test('escapes the copy-script source without changing the copied Markdown value', async () => {
  requireBun()
  await withTempDir(async (root) => {
    const markdown = '# Copy\n\n</script><script>globalThis.copyProbe=true</script> & value\u2028next\n'
    const { result, html } = await renderFixture(root, markdown)
    assert.equal(result.status, 0, result.stderr)
    assert.equal((html.match(/<script\b/g) || []).length, 1)

    const sourceLiteral = html.match(/const source = ("(?:\\.|[^"\\])*");/)?.[1]
    assert.ok(sourceLiteral, 'copy source string should be embedded')
    assert.match(sourceLiteral, /\\u003c\/script\\u003e/)
    assert.match(sourceLiteral, /\\u003cscript\\u003e/)
    assert.match(sourceLiteral, /\\u0026/)
    assert.match(sourceLiteral, /\\u2028/)
    assert.equal(JSON.parse(sourceLiteral), markdown)
  })
})

test('--help succeeds without creating output', () => {
  const result = runRenderer(['--help'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Usage:/)
  assert.match(result.stdout, /--out <path>/)
})

test('missing input and missing input files fail with precise diagnostics', async () => {
  await withTempDir(async (root) => {
    const missingArgument = runRenderer(['--out', join(root, 'out.html')], { cwd: root })
    assert.equal(missingArgument.status, 1)
    assert.match(missingArgument.stderr, /Missing input Markdown path/)

    const nonexistent = runRenderer(['absent.md'], { cwd: root })
    assert.equal(nonexistent.status, 2)
    assert.match(nonexistent.stderr, /Input Markdown file not found/)
  })
})

test('creates nested output directories', async () => {
  await withTempDir(async (root) => {
    const { result, outputPath, html } = await renderFixture(root, '# Output\n', {
      output: 'deep/nested/generated.html',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(await readFile(outputPath, 'utf8'), html)
    assert.match(result.stdout, /generated\.html/)
  })
})
