#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MAX_DIAGNOSTICS = 50;
const HELP = `Usage: node scripts/validate-skill-links.mjs <file-or-directory> [...]

Recursively inspect Markdown files and verify their relative link targets.
Absolute URLs, mailto links, and fragment-only links are ignored.

Examples:
  node scripts/validate-skill-links.mjs README.md skills
  node scripts/validate-skill-links.mjs skills/code-review
`;

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function displayPath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return (relative && !relative.startsWith(`..${path.sep}`) ? relative : filePath)
    .split(path.sep)
    .join('/');
}

async function collectMarkdownFiles(inputPath, files) {
  const absolute = path.resolve(inputPath);
  let metadata;

  try {
    metadata = await stat(absolute);
  } catch (error) {
    throw new Error(`cannot inspect operand ${JSON.stringify(inputPath)}: ${error.code ?? error.message}`);
  }

  if (metadata.isFile()) {
    if (path.extname(absolute).toLowerCase() !== '.md') {
      throw new Error(`operand is not a Markdown file: ${JSON.stringify(inputPath)}`);
    }
    files.add(absolute);
    return;
  }

  if (!metadata.isDirectory()) {
    throw new Error(`operand is neither a file nor a directory: ${JSON.stringify(inputPath)}`);
  }

  const entries = await readdir(absolute, { withFileTypes: true });
  entries.sort((left, right) => compareNames(left.name, right.name));

  for (const entry of entries) {
    const entryPath = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(entryPath, files);
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
      files.add(entryPath);
    }
  }
}

function spacesPreservingNewlines(value) {
  return value.replace(/[^\n]/g, ' ');
}

function blockMaskPreservingNewlines(value) {
  return value.replace(/[^\n]/g, '\0');
}

function maskNonContent(markdown) {
  const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, spacesPreservingNewlines);
  const lines = withoutComments.split(/(?<=\n)/);
  let fence = null;
  const listContentIndents = [];
  const maskedLines = [];

  for (const line of lines) {
    if (fence) {
      const relativeLine = stripIndentColumns(line, fence.containerIndent);
      const closing = relativeLine.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      const closesFence =
        closing && closing[1][0] === fence.marker && closing[1].length >= fence.length;
      if (closesFence) fence = null;
      maskedLines.push(blockMaskPreservingNewlines(line));
      continue;
    }
    if (/^\s*$/.test(line)) {
      maskedLines.push(line);
      continue;
    }

    const indent = leadingIndentColumns(line);
    const listItem = line.match(/^([ \t]*)([-+*]|\d{1,9}[.)])([ \t]+)/);
    const blockIndent = listItem ? leadingIndentColumns(listItem[1]) : indent;
    while (
      listContentIndents.length > 0 &&
      blockIndent < listContentIndents[listContentIndents.length - 1]
    ) {
      listContentIndents.pop();
    }

    const containerIndent = listContentIndents[listContentIndents.length - 1] ?? 0;
    if (indent >= containerIndent + 4) {
      maskedLines.push(blockMaskPreservingNewlines(line));
      continue;
    }

    const relativeLine = stripIndentColumns(line, containerIndent);
    const opening = relativeLine.match(/^ {0,3}(`{3,}|~{3,})/);
    if (opening) {
      fence = {
        marker: opening[1][0],
        length: opening[1].length,
        containerIndent,
      };
      maskedLines.push(blockMaskPreservingNewlines(line));
      continue;
    }

    if (listItem) {
      const markerIndent = leadingIndentColumns(listItem[1]);
      const markerEnd = markerIndent + listItem[2].length;
      listContentIndents.push(leadingIndentColumns(listItem[3], markerEnd));
    }
    maskedLines.push(line);
  }

  return maskCodeSpans(maskedLines.join(''));
}

function leadingIndentColumns(value, initialColumns = 0) {
  let columns = initialColumns;
  for (const character of value) {
    if (character === ' ') {
      columns += 1;
    } else if (character === '\t') {
      columns += 4 - (columns % 4);
    } else {
      break;
    }
  }
  return columns;
}

function stripIndentColumns(value, columnsToStrip) {
  let columns = 0;
  let index = 0;
  while (index < value.length && columns < columnsToStrip) {
    if (value[index] === ' ') {
      columns += 1;
    } else if (value[index] === '\t') {
      columns += 4 - (columns % 4);
    } else {
      break;
    }
    index += 1;
  }
  return value.slice(index);
}

function maskCodeSpans(text) {
  const characters = text.split('');

  for (let index = 0; index < characters.length; index += 1) {
    if (characters[index] !== '`' || characters[index - 1] === '\\') continue;

    let runLength = 1;
    while (characters[index + runLength] === '`') runLength += 1;
    const closingIndex = findClosingBacktickRun(characters, index + runLength, runLength);
    if (closingIndex === -1) {
      index += runLength - 1;
      continue;
    }

    for (let maskIndex = index; maskIndex < closingIndex + runLength; maskIndex += 1) {
      if (characters[maskIndex] !== '\n') characters[maskIndex] = ' ';
    }
    index = closingIndex + runLength - 1;
  }

  return characters.join('');
}

function findClosingBacktickRun(characters, start, expectedLength) {
  for (let index = start; index < characters.length; index += 1) {
    if (characters[index] === '\0') return -1;
    if (characters[index] === '\n' && nextLineStartsNewBlock(characters, index + 1)) return -1;
    if (characters[index] !== '`') continue;

    let runLength = 1;
    while (characters[index + runLength] === '`') runLength += 1;
    if (runLength === expectedLength) return index;
    index += runLength - 1;
  }
  return -1;
}

function nextLineStartsNewBlock(characters, start) {
  let end = start;
  while (end < characters.length && characters[end] !== '\n') end += 1;
  const line = characters.slice(start, end).join('');

  if (line.includes('\0') || /^\s*$/.test(line)) return true;
  return [
    /^[ \t]{0,3}#{1,6}(?:[ \t]+|$)/,
    /^[ \t]*>/,
    /^[ \t]*(?:[-+*]|1[.)])[ \t]+/,
    /^[ \t]*(?:`{3,}|~{3,})/,
    /^[ \t]{0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/,
    /^[ \t]{0,3}(?:=+|-+)[ \t]*$/,
    /^[ \t]{0,3}<(?:script|pre|style|textarea)(?:[ \t>]|$)/i,
    /^[ \t]{0,3}<!--/,
    /^[ \t]{0,3}<\?/,
    /^[ \t]{0,3}<![A-Z]/,
    /^[ \t]{0,3}<!\[CDATA\[/i,
    /^[ \t]{0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \t/>]|$)/i,
  ].some((pattern) => pattern.test(line));
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function findClosingBracket(text, openingIndex) {
  let depth = 0;
  for (let index = openingIndex + 1; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === '[') depth += 1;
    if (text[index] === ']') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
}

function readInlineDestination(text, openingParenthesis) {
  let index = openingParenthesis + 1;
  while (/\s/.test(text[index] ?? '')) index += 1;

  if (text[index] === '<') {
    const start = index + 1;
    for (index = start; index < text.length; index += 1) {
      if (text[index] === '\\') {
        index += 1;
      } else if (text[index] === '>') {
        return { target: text.slice(start, index), end: index };
      }
    }
    return null;
  }

  const start = index;
  let nestedParentheses = 0;
  for (; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === '(') {
      nestedParentheses += 1;
      continue;
    }
    if (text[index] === ')') {
      if (nestedParentheses === 0) {
        return { target: text.slice(start, index), end: index };
      }
      nestedParentheses -= 1;
      continue;
    }
    if (/\s/.test(text[index]) && nestedParentheses === 0) {
      return { target: text.slice(start, index), end: index };
    }
  }
  return null;
}

function extractLinks(markdown) {
  const text = maskNonContent(markdown);
  const links = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '[' || text[index - 1] === '\\') continue;
    const closingBracket = findClosingBracket(text, index);
    if (closingBracket === -1 || text[closingBracket + 1] !== '(') continue;
    const destination = readInlineDestination(text, closingBracket + 1);
    if (!destination) continue;
    links.push({ target: destination.target, line: lineNumberAt(text, index) });
    index = destination.end;
  }

  const definitionPattern = /^ {0,3}\[[^\]\n]+\]:[ \t]*(?:<([^>\n]*)>|([^\s]+))/gm;
  for (const match of text.matchAll(definitionPattern)) {
    links.push({ target: match[1] ?? match[2], line: lineNumberAt(text, match.index) });
  }

  links.sort((left, right) => left.line - right.line || compareNames(left.target, right.target));
  return links;
}

function isIgnoredTarget(target) {
  const value = target.trim();
  return (
    value.startsWith('#') ||
    value.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(value)
  );
}

function normalizeTarget(rawTarget) {
  const unescaped = rawTarget.replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1');
  const fragmentIndex = unescaped.indexOf('#');
  const withoutFragment = fragmentIndex === -1 ? unescaped : unescaped.slice(0, fragmentIndex);
  const queryIndex = withoutFragment.indexOf('?');
  const pathOnly = queryIndex === -1 ? withoutFragment : withoutFragment.slice(0, queryIndex);

  try {
    return { value: decodeURIComponent(pathOnly) };
  } catch {
    return { error: 'invalid percent-encoding' };
  }
}

async function targetExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }
  if (arguments_.length === 0) {
    process.stderr.write(`${HELP}\nError: provide at least one Markdown file or directory.\n`);
    return 2;
  }
  if (arguments_.some((argument) => argument.startsWith('-'))) {
    const option = arguments_.find((argument) => argument.startsWith('-'));
    process.stderr.write(`Unknown option: ${option}\nUse --help for usage.\n`);
    return 2;
  }

  const fileSet = new Set();
  try {
    for (const operand of arguments_) await collectMarkdownFiles(operand, fileSet);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 2;
  }

  const files = [...fileSet].sort(compareNames);
  const problems = [];
  let checkedLinks = 0;

  for (const sourceFile of files) {
    const markdown = await readFile(sourceFile, 'utf8');
    for (const link of extractLinks(markdown)) {
      const rawTarget = link.target.trim();
      if (isIgnoredTarget(rawTarget)) continue;
      checkedLinks += 1;

      const normalized = normalizeTarget(rawTarget);
      if (normalized.error) {
        problems.push({
          source: sourceFile,
          line: link.line,
          target: rawTarget,
          detail: normalized.error,
        });
        continue;
      }
      if (path.isAbsolute(normalized.value)) {
        problems.push({
          source: sourceFile,
          line: link.line,
          target: rawTarget,
          detail: 'target is not relative',
        });
        continue;
      }

      const resolved = path.resolve(path.dirname(sourceFile), normalized.value || '.');
      if (!(await targetExists(resolved))) {
        problems.push({
          source: sourceFile,
          line: link.line,
          target: rawTarget,
          detail: `missing (${displayPath(resolved)})`,
        });
      }
    }
  }

  const summary = `Checked ${checkedLinks} local Markdown link${checkedLinks === 1 ? '' : 's'} in ${files.length} Markdown file${files.length === 1 ? '' : 's'}`;
  if (problems.length === 0) {
    process.stdout.write(`${summary}; all targets exist.\n`);
    return 0;
  }

  for (const problem of problems.slice(0, MAX_DIAGNOSTICS)) {
    process.stderr.write(
      `${displayPath(problem.source)}:${problem.line} -> ${problem.target || '(empty target)'} (${problem.detail})\n`,
    );
  }
  if (problems.length > MAX_DIAGNOSTICS) {
    process.stderr.write(`... ${problems.length - MAX_DIAGNOSTICS} additional problems omitted.\n`);
  }
  process.stderr.write(`${summary}; ${problems.length} invalid or missing target${problems.length === 1 ? '' : 's'}.\n`);
  return 1;
}

process.exitCode = await main();
