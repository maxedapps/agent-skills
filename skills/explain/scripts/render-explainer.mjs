import { constants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptDirectory, '..');
const assetsDirectory = path.join(skillDirectory, 'assets');
const require = createRequire(import.meta.url);

const HELP = `Usage: node scripts/render-explainer.mjs --input <markdown> --output <html> [--title <text>] [--force] [--no-open]

Render Markdown as a deterministic, standalone HTML explainer and open it in the default browser.

Options:
  --input <markdown>  Markdown source file
  --output <html>     Destination HTML file
  --title <text>      Document title (defaults to first h1, then filename)
  --force             Overwrite an existing output file
  --no-open           Do not open the output (for CI, tests, SSH, or headless use)
  --help              Show this help
`;

export function parseArguments(argv) {
  const result = { force: false, noOpen: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--force' || argument === '--no-open' || argument === '--help') {
      const key = argument === '--no-open' ? 'noOpen' : argument.slice(2);
      if (result[key]) throw new Error(`${argument} may only be specified once`);
      result[key] = true;
      continue;
    }
    if (argument === '--input' || argument === '--output' || argument === '--title') {
      const key = argument.slice(2);
      if (Object.hasOwn(result, key)) throw new Error(`${argument} may only be specified once`);
      if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
        throw new Error(`${argument} requires a value`);
      }
      result[key] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }

  if (result.help) return result;
  if (!Object.hasOwn(result, 'input')) throw new Error('missing required --input <markdown>');
  if (!Object.hasOwn(result, 'output')) throw new Error('missing required --output <html>');
  return result;
}

function assertSupportedNode() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major < 20) throw new Error(`Node.js 20 or newer is required (found ${process.versions.node})`);
}

async function readRequiredAsset(filename) {
  const assetPath = path.join(assetsDirectory, filename);
  try {
    return await readFile(assetPath, 'utf8');
  } catch (error) {
    throw new Error(`required asset is unavailable: ${assetPath} (${error.code ?? error.message}). Restore the skill assets and try again.`);
  }
}

async function loadDependencies() {
  try {
    const [markdownItModule, shikiModule] = await Promise.all([
      import('markdown-it'),
      import('shiki')
    ]);
    return { MarkdownIt: markdownItModule.default, shiki: shikiModule };
  } catch (error) {
    throw new Error(`renderer packages are unavailable (${error.code ?? error.message}). Run "npm ci --ignore-scripts --no-audit --no-fund" in ${skillDirectory}.`);
  }
}

function languageFromFence(token) {
  return token.info.trim().split(/\s+/, 1)[0].toLowerCase();
}

function headingText(tokens) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].type !== 'heading_open' || tokens[index].tag !== 'h1') continue;
    const inline = tokens[index + 1];
    if (inline.type !== 'inline') continue;
    const text = (inline.children ?? [])
      .map((token) => {
        if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
        if (token.type === 'text' || token.type === 'code_inline' || token.type === 'image') return token.content;
        return '';
      })
      .join('')
      .trim();
    if (text) return text;
  }
  return null;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const TEMPLATE_MARKER_COUNTS = new Map([
  ['@@EXPLAINER_TITLE@@', 2],
  ['@@EXPLAINER_CSS@@', 1],
  ['@@EXPLAINER_CONTENT@@', 1],
  ['@@EXPLAINER_MERMAID@@', 1]
]);

function fillTemplate(template, replacements) {
  for (const [marker, expectedCount] of TEMPLATE_MARKER_COUNTS) {
    const count = template.split(marker).length - 1;
    if (count !== expectedCount) {
      throw new Error(`required template marker ${marker} is invalid in assets/explainer.html`);
    }
  }

  return template.replace(
    /@@EXPLAINER_(?:TITLE|CSS|CONTENT|MERMAID)@@/g,
    (marker) => replacements.get(marker)
  );
}

function inlineScript(source) {
  return source.replace(/<\/script/gi, '<\\/script');
}

async function readMermaidAssets() {
  let bundlePath;
  let licensePath;
  try {
    bundlePath = require.resolve('mermaid/dist/mermaid.min.js');
    licensePath = path.join(path.dirname(require.resolve('mermaid/package.json')), 'LICENSE');
  } catch (error) {
    throw new Error(`Mermaid 11.16.0 is unavailable (${error.code ?? error.message}). Run "npm ci --ignore-scripts --no-audit --no-fund" in ${skillDirectory}.`);
  }

  try {
    const [bundle, license] = await Promise.all([
      readFile(bundlePath, 'utf8'),
      readFile(licensePath, 'utf8')
    ]);
    return { bundle, license: license.trimEnd() };
  } catch (error) {
    throw new Error(`Mermaid bundle or license is unavailable (${error.code ?? error.message}). Reinstall dependencies in ${skillDirectory}.`);
  }
}

async function outputExists(outputPath) {
  try {
    await access(outputPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw new Error(`cannot inspect output path ${outputPath}: ${error.message}`);
  }
}

export function openerCommand(outputPath, platform = process.platform) {
  if (platform === 'darwin') return { command: 'open', args: [outputPath] };
  if (platform === 'win32') {
    return {
      command: 'rundll32.exe',
      args: ['url.dll,FileProtocolHandler', pathToFileURL(outputPath).href]
    };
  }
  return { command: 'xdg-open', args: [outputPath] };
}

export async function openInDefaultBrowser(outputPath, options = {}) {
  const spawnProcess = options.spawnProcess ?? spawn;
  const observationMs = options.observationMs ?? 100;
  const opener = openerCommand(outputPath, options.platform);

  return await new Promise((resolve) => {
    let child;
    let settled = false;
    let timer;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    try {
      child = spawnProcess(opener.command, opener.args, {
        detached: true,
        shell: false,
        stdio: 'ignore',
        windowsHide: true
      });
    } catch (error) {
      finish({ status: 'failed', reason: error.code === 'ENOENT' ? 'missing' : 'launch-error' });
      return;
    }

    child.once('error', (error) => {
      finish({ status: 'failed', reason: error.code === 'ENOENT' ? 'missing' : 'launch-error' });
    });
    child.once('close', (code, signal) => {
      if (code === 0) {
        finish({ status: 'launched' });
      } else if (code === null && signal) {
        finish({ status: 'failed', reason: 'terminated' });
      } else {
        finish({ status: 'failed', reason: 'nonzero', code });
      }
    });
    timer = setTimeout(() => {
      child.unref();
      finish({ status: 'launched' });
    }, observationMs);
  });
}

async function render(options) {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  if (!options.force && await outputExists(outputPath)) {
    throw new Error(`output already exists: ${outputPath} (pass --force to overwrite)`);
  }

  let markdown;
  try {
    markdown = await readFile(inputPath, 'utf8');
  } catch (error) {
    throw new Error(`cannot read input ${inputPath}: ${error.code ?? error.message}`);
  }

  const [{ MarkdownIt, shiki }, template, css, mermaidRuntime] = await Promise.all([
    loadDependencies(),
    readRequiredAsset('explainer.html'),
    readRequiredAsset('explainer.css'),
    readRequiredAsset('explainer.js')
  ]);

  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const tokens = md.parse(markdown, {});
  const fenceTokens = tokens.filter((token) => token.type === 'fence');
  const mermaidCount = fenceTokens.filter((token) => languageFromFence(token) === 'mermaid').length;
  const highlightedLanguages = [...new Set(
    fenceTokens
      .map(languageFromFence)
      .filter((language) => language && language !== 'mermaid')
      .filter((language) => Object.hasOwn(shiki.bundledLanguages, language))
  )].sort();

  let highlighter = null;
  if (highlightedLanguages.length > 0) {
    try {
      highlighter = await shiki.createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: highlightedLanguages
      });
    } catch (error) {
      throw new Error(`syntax highlighter setup failed: ${error.message}`);
    }
  }

  let diagramIndex = 0;
  md.renderer.rules.fence = (renderTokens, index) => {
    const token = renderTokens[index];
    const language = languageFromFence(token);
    if (language === 'mermaid') {
      diagramIndex += 1;
      return `<figure class="mermaid-diagram" data-mermaid-diagram data-diagram-index="${diagramIndex}" data-state="source"><div class="mermaid-output" aria-live="polite"></div><pre class="mermaid-source"><code>${md.utils.escapeHtml(token.content)}</code></pre></figure>\n`;
    }
    if (highlighter && Object.hasOwn(shiki.bundledLanguages, language)) {
      const highlighted = highlighter.codeToHtml(token.content, {
        lang: language,
        themes: { light: 'github-light', dark: 'github-dark' }
      });
      return `${highlighted.replace('<pre ', `<pre data-language="${escapeHtml(language)}" `)}\n`;
    }
    return `<pre class="code-block plaintext"><code>${md.utils.escapeHtml(token.content)}</code></pre>\n`;
  };

  md.renderer.rules.image = (renderTokens, index) => {
    const alt = escapeHtml(renderTokens[index].content || 'image');
    return `<span class="markdown-image-placeholder" role="img" aria-label="${alt}">[Image: ${alt}]</span>`;
  };

  md.renderer.rules.table_open = () => '<div class="table-wrap" role="region" tabindex="0" aria-label="Scrollable table"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';

  let content;
  try {
    content = md.renderer.render(tokens, md.options, {});
  } finally {
    highlighter?.dispose();
  }

  const fallbackName = path.basename(inputPath, path.extname(inputPath));
  const title = Object.hasOwn(options, 'title') ? options.title : (headingText(tokens) ?? fallbackName);

  let mermaidMarkup = '';
  if (mermaidCount > 0) {
    const { bundle, license } = await readMermaidAssets();
    mermaidMarkup = `  <!--\n${license}\n  -->\n  <script>\n${inlineScript(bundle)}\n  </script>\n  <script>\n${inlineScript(mermaidRuntime)}\n  </script>`;
  }

  const html = fillTemplate(template, new Map([
    ['@@EXPLAINER_TITLE@@', escapeHtml(title)],
    ['@@EXPLAINER_CSS@@', css],
    ['@@EXPLAINER_CONTENT@@', content.trimEnd()],
    ['@@EXPLAINER_MERMAID@@', mermaidMarkup]
  ]));

  try {
    await writeFile(outputPath, html, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`output already exists: ${outputPath} (pass --force to overwrite)`);
    }
    throw new Error(`cannot write output ${outputPath}: ${error.code ?? error.message}`);
  }

  return { output: outputPath, title, mermaidDiagrams: mermaidCount };
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const openOutput = dependencies.openOutput ?? openInDefaultBrowser;

  try {
    const options = parseArguments(argv);
    if (options.help) {
      stdout.write(HELP);
      return 0;
    }
    assertSupportedNode();
    const result = await render(options);
    if (options.noOpen) {
      result.open = { status: 'skipped', reason: '--no-open' };
    } else {
      try {
        result.open = await openOutput(result.output);
      } catch {
        result.open = { status: 'failed', reason: 'launch-error' };
      }
      if (result.open.status === 'failed') {
        const detail = result.open.reason === 'nonzero' ? `nonzero exit ${result.open.code}` : result.open.reason;
        stderr.write(`render-explainer: warning: could not open output in the default browser (${detail}); HTML was written to ${result.output}\n`);
      }
    }
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`render-explainer: ${error.message}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = await main();
