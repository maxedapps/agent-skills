#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const HELP = `Usage: node scripts/list-server-names.mjs [--source local|import|all]

List only configured MCP server names through mcporter without exposing full
server definitions, URLs, commands, arguments, headers, or environment values.

Output: JSON { "servers": [{ "name": string, "source": "local"|"import" }] }
Exit codes: 0 success, 1 safe enumeration failure, 2 invalid usage.
`;

function parseArguments(args) {
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  if (args.length === 0) return { source: 'all' };
  if (args.length === 2 && args[0] === '--source' && ['local', 'import', 'all'].includes(args[1])) {
    return { source: args[1] };
  }
  return { error: 'Expected only --source local|import|all.' };
}

async function listSource(source) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      'mcporter',
      ['config', 'list', '--json', '--source', source],
      {
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT_BYTES,
        timeout: TIMEOUT_MS,
        windowsHide: true,
      },
    ));
  } catch {
    throw new Error(`Unable to enumerate ${source} MCP server names safely.`);
  }

  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(`mcporter returned invalid JSON while enumerating ${source} MCP server names.`);
  }
  if (!payload || !Array.isArray(payload.servers)) {
    throw new Error(`mcporter returned an unexpected shape while enumerating ${source} MCP server names.`);
  }

  return payload.servers.map((server) => {
    if (!server || typeof server.name !== 'string' || server.name.length === 0) {
      throw new Error(`mcporter returned an invalid server name while enumerating ${source} definitions.`);
    }
    return { name: server.name, source };
  });
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\nUse --help for usage.\n`);
    return 2;
  }

  try {
    const sources = parsed.source === 'all' ? ['local', 'import'] : [parsed.source];
    const groups = await Promise.all(sources.map((source) => listSource(source)));
    const servers = groups.flat().sort((left, right) =>
      left.name.localeCompare(right.name) || left.source.localeCompare(right.source),
    );
    process.stdout.write(`${JSON.stringify({ servers }, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Unable to enumerate MCP server names safely.'}\n`);
    return 1;
  }
}

process.exitCode = await main();
