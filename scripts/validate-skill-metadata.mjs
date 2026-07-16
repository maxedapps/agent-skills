#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MAX_DIAGNOSTICS = 50;
const HELP = `Usage: node scripts/validate-skill-metadata.mjs <SKILL.md-or-directory> [...]

Validate Agent Skill frontmatter and the repository description policy.
Each operand may be a SKILL.md file, one skill directory, or a catalog directory.

Examples:
  node scripts/validate-skill-metadata.mjs skills
  node scripts/validate-skill-metadata.mjs skills/code-review
  node scripts/validate-skill-metadata.mjs skills/code-review/SKILL.md
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

async function collectSkillFiles(inputPath, files) {
  const absolute = path.resolve(inputPath);
  let metadata;

  try {
    metadata = await stat(absolute);
  } catch (error) {
    throw new Error(`cannot inspect operand ${JSON.stringify(inputPath)}: ${error.code ?? error.message}`);
  }

  if (metadata.isFile()) {
    if (path.basename(absolute) !== 'SKILL.md') {
      throw new Error(`operand is not a SKILL.md file: ${JSON.stringify(inputPath)}`);
    }
    files.add(absolute);
    return;
  }

  if (!metadata.isDirectory()) {
    throw new Error(`operand is neither a SKILL.md file nor a directory: ${JSON.stringify(inputPath)}`);
  }

  const entries = await readDirectoryEntries(absolute);
  if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
    files.add(path.join(absolute, 'SKILL.md'));
    return;
  }

  const found = new Set();
  for (const entry of entries) {
    if (entry.isDirectory()) await collectFromDirectory(path.join(absolute, entry.name), found);
  }
  if (found.size === 0) {
    throw new Error(`no SKILL.md file found under operand ${JSON.stringify(inputPath)}`);
  }
  for (const file of found) files.add(file);
}

async function readDirectoryEntries(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.sort((left, right) => compareNames(left.name, right.name));
  } catch (error) {
    throw new Error(`cannot read directory ${JSON.stringify(displayPath(directory))}: ${error.code ?? error.message}`);
  }
}

async function collectFromDirectory(directory, files) {
  const entries = await readDirectoryEntries(directory);
  if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
    files.add(path.join(directory, 'SKILL.md'));
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) await collectFromDirectory(path.join(directory, entry.name), files);
  }
}

function parseInlineScalar(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith('|') || value.startsWith('>')) {
    return { error: 'uses an unsupported scalar form; use a plain value or folded > scalar' };
  }
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'string'
        ? { value: parsed }
        : { error: 'must be a string scalar' };
    } catch {
      return { error: 'contains a malformed quoted scalar' };
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length === 1) {
      return { error: 'contains a malformed quoted scalar' };
    }
    return { value: value.slice(1, -1).replace(/''/g, "'") };
  }
  return { value };
}

function foldBlock(lines, chomping) {
  let trailingBlankLines = 0;
  while (lines.length > trailingBlankLines && lines[lines.length - trailingBlankLines - 1].trim() === '') {
    trailingBlankLines += 1;
  }
  const contentLines = lines.slice(0, lines.length - trailingBlankLines);
  const nonBlankIndents = contentLines
    .filter((line) => line.trim() !== '')
    .map((line) => line.match(/^[ \t]*/)[0].length);
  const indentation = nonBlankIndents.length > 0 ? Math.min(...nonBlankIndents) : 0;
  const normalized = contentLines.map((line) => line.slice(Math.min(indentation, line.length)).trimEnd());

  let value = '';
  let blankLines = 0;
  let previousHadContent = false;
  for (const line of normalized) {
    if (line.trim() === '') {
      blankLines += 1;
      previousHadContent = false;
      continue;
    }
    if (value) value += blankLines > 0 ? '\n'.repeat(blankLines) : previousHadContent ? ' ' : '';
    value += line.trim();
    blankLines = 0;
    previousHadContent = true;
  }

  if (!value || chomping === '-') return value;
  if (chomping === '+') return `${value}${'\n'.repeat(Math.max(1, trailingBlankLines + 1))}`;
  return `${value}\n`;
}

function parseFrontmatter(markdown) {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!/^---[ \t]*$/.test(lines[0] ?? '')) {
    return {
      fields: new Map(),
      diagnostics: [{ line: 1, category: 'frontmatter', message: 'missing opening --- frontmatter delimiter' }],
      fatal: true,
    };
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (/^---[ \t]*$/.test(lines[index])) {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex === -1) {
    return {
      fields: new Map(),
      diagnostics: [{ line: 1, category: 'frontmatter', message: 'missing closing --- frontmatter delimiter' }],
      fatal: true,
    };
  }

  const fields = new Map();
  const invalidFields = new Set();
  const diagnostics = [];

  for (let index = 1; index < closingIndex; index += 1) {
    const match = lines[index].match(/^(name|description):[ \t]*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const line = index + 1;
    if (fields.has(key) || invalidFields.has(key)) {
      diagnostics.push({ line, category: key, message: `duplicate ${key} field` });
      invalidFields.add(key);
      fields.delete(key);
      continue;
    }

    const folded = rawValue.match(/^>([-+]?)(?:[ \t]+#.*)?$/);
    if (folded) {
      const blockLines = [];
      let cursor = index + 1;
      for (; cursor < closingIndex; cursor += 1) {
        const candidate = lines[cursor];
        if (candidate.trim() !== '' && !/^[ \t]/.test(candidate)) break;
        blockLines.push(candidate);
      }
      fields.set(key, { value: foldBlock(blockLines, folded[1]), line });
      index = cursor - 1;
      continue;
    }

    const scalar = parseInlineScalar(rawValue);
    if (scalar.error) {
      diagnostics.push({ line, category: key, message: scalar.error });
      invalidFields.add(key);
    } else {
      fields.set(key, { value: scalar.value, line });
    }
  }

  for (const key of ['name', 'description']) {
    if (!fields.has(key) && !invalidFields.has(key)) {
      diagnostics.push({ line: 1, category: key, message: `missing required ${key} field` });
    }
  }

  return { fields, diagnostics, fatal: false };
}

function starterSentinel(value, field) {
  if (/REPLACE_ME/.test(value)) return 'REPLACE_ME';
  if (/\.\.\.|…/.test(value)) return 'ellipsis';
  if (field === 'name' && value.trim() === 'my-skill') return 'my-skill';
  if (field === 'description' && /Summarizes the skill capability/.test(value)) {
    return 'Summarizes the skill capability';
  }
  if (field === 'description' && /\[Capability summary\]/.test(value)) {
    return '[Capability summary]';
  }
  return null;
}

function hasMaterialNonUseBoundary(description) {
  const match = description.match(/\bDo not use\b([\s\S]*)/);
  if (!match) return false;
  let boundary = match[1].split(/[.!?]/, 1)[0];
  boundary = boundary.replace(/^\s*(?:this skill\s+)?(?:when(?:ever)?|for|if|to)\b\s*/i, '');
  const material = boundary.match(/[\p{L}\p{N}]/gu)?.join('') ?? '';
  return material.length >= 3;
}

function validateMetadata(sourceFile, markdown) {
  const parsed = parseFrontmatter(markdown);
  const diagnostics = [...parsed.diagnostics];
  if (parsed.fatal) return diagnostics;

  const name = parsed.fields.get('name');
  if (name) {
    const sentinel = starterSentinel(name.value, 'name');
    if (sentinel) {
      diagnostics.push({ line: name.line, category: 'name', message: `contains unresolved starter sentinel ${JSON.stringify(sentinel)}` });
    }
    if (Array.from(name.value).length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name.value)) {
      diagnostics.push({ line: name.line, category: 'name', message: 'must be 1-64 lowercase letters, digits, or single hyphen-separated segments' });
    }
    const directoryName = path.basename(path.dirname(sourceFile));
    if (name.value !== directoryName) {
      diagnostics.push({ line: name.line, category: 'name', message: `does not match skill directory ${JSON.stringify(directoryName)}` });
    }
  }

  const description = parsed.fields.get('description');
  if (description) {
    const value = description.value;
    if (value.trim() === '') {
      diagnostics.push({ line: description.line, category: 'description', message: 'must not be empty' });
    } else {
      const length = Array.from(value).length;
      if (length > 1024) {
        diagnostics.push({ line: description.line, category: 'description', message: `is ${length} characters; maximum is 1024` });
      }
      const sentinel = starterSentinel(value, 'description');
      if (sentinel) {
        diagnostics.push({ line: description.line, category: 'description', message: `contains unresolved starter sentinel ${JSON.stringify(sentinel)}` });
      }
      if (!/\bUse this skill (?:when|whenever)\b/.test(value)) {
        diagnostics.push({ line: description.line, category: 'description', message: 'must contain literal "Use this skill when" or "Use this skill whenever" routing' });
      }
      if (!hasMaterialNonUseBoundary(value)) {
        diagnostics.push({ line: description.line, category: 'description', message: 'must contain a material "Do not use" boundary' });
      }
    }
  }

  diagnostics.sort(
    (left, right) =>
      left.line - right.line ||
      compareNames(left.category, right.category) ||
      compareNames(left.message, right.message),
  );
  return diagnostics;
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }
  if (arguments_.length === 0) {
    process.stderr.write(`${HELP}\nError: provide at least one SKILL.md file, skill directory, or catalog directory.\n`);
    return 2;
  }
  if (arguments_.some((argument) => argument.startsWith('-'))) {
    const option = arguments_.find((argument) => argument.startsWith('-'));
    process.stderr.write(`Unknown option: ${option}\nUse --help for usage.\n`);
    return 2;
  }

  const fileSet = new Set();
  try {
    for (const operand of arguments_) await collectSkillFiles(operand, fileSet);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 2;
  }

  const files = [...fileSet].sort(compareNames);
  const problems = [];
  for (const sourceFile of files) {
    let markdown;
    try {
      markdown = await readFile(sourceFile, 'utf8');
    } catch (error) {
      process.stderr.write(`Error: cannot read ${JSON.stringify(displayPath(sourceFile))}: ${error.code ?? error.message}\n`);
      return 2;
    }
    for (const diagnostic of validateMetadata(sourceFile, markdown)) {
      problems.push({ source: sourceFile, ...diagnostic });
    }
  }

  const summary = `Checked metadata for ${files.length} skill${files.length === 1 ? '' : 's'}`;
  if (problems.length === 0) {
    process.stdout.write(`${summary}; all metadata is valid.\n`);
    return 0;
  }

  for (const problem of problems.slice(0, MAX_DIAGNOSTICS)) {
    process.stderr.write(`${displayPath(problem.source)}:${problem.line}:${problem.category}: ${problem.message}\n`);
  }
  if (problems.length > MAX_DIAGNOSTICS) {
    process.stderr.write(`... ${problems.length - MAX_DIAGNOSTICS} additional diagnostics omitted.\n`);
  }
  process.stderr.write(`${summary}; ${problems.length} policy violation${problems.length === 1 ? '' : 's'}.\n`);
  return 1;
}

process.exitCode = await main();
