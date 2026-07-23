#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const VERSION = "2.0.0";
const DEFAULT_ENDPOINT = "openai/gpt-image-2";
const DEFAULT_OUTPUT_ROOT = join(tmpdir(), "generate-image");
const DEFAULT_POLL_MS = 1500;
const DEFAULT_MAX_POLL_MS = 8000;
const DEFAULT_MAX_WAIT_SEC = 900;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

type Flags = Record<string, string | boolean>;

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

function help(command?: string): string {
  if (!command) {
    return `generate-image ${VERSION}

Usage:
  bun run scripts/generate-image.ts <command> [options]

Commands:
  auth-check    Non-secret credential diagnostics
  models        List/search image models
  schema        Show input fields for an endpoint
  generate      Queue image generation (poll + download)
  status        Queue request status
  result        Queue request result
  cancel        Cancel queue request
  upload        Upload a local image; print public URL

Default endpoint: ${DEFAULT_ENDPOINT}
Credentials: FAL_KEY in env or ${join(SKILL_DIR, ".env")}
`;
  }

  const common = `--endpoint <id>   Default: ${DEFAULT_ENDPOINT}
  --json             Machine-readable JSON`;

  const map: Record<string, string> = {
    "auth-check": `auth-check [--json]`,
    models: `models [--q <text>] [--limit <n>] [--json]`,
    schema: `schema [--endpoint <id>] [--json]
  ${common}`,
    generate: `generate (--input <json> | --input-file <path>) [options]
  ${common}
  --logs
  --no-poll
  --output-dir <path>   Default: temp dir under ${DEFAULT_OUTPUT_ROOT}
  --no-download
  --save <path>         Save full JSON response
  --max-wait-sec <n>    Default: ${DEFAULT_MAX_WAIT_SEC}`,
    status: `status --request-id <id> [--endpoint <id>] [--logs] [--json]`,
    result: `result --request-id <id> [--endpoint <id>] [--json]`,
    cancel: `cancel --request-id <id> [--endpoint <id>] [--json]`,
    upload: `upload --file <path> [--json]`,
  };

  return map[command] ? `Usage:\n  bun run scripts/generate-image.ts ${map[command]}\n` : "";
}

function parseArgs(argv: string[]): { command?: string; flags: Flags } {
  const flags: Flags = {};
  let command: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new CliError(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (key.includes("=")) {
      const [k, ...rest] = key.split("=");
      flags[k] = rest.join("=");
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }

  return { command, flags };
}

function flag(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  if (typeof value === "undefined" || typeof value === "boolean") return undefined;
  return value;
}

function bool(flags: Flags, name: string): boolean {
  const value = flags[name];
  if (typeof value === "undefined") return false;
  if (typeof value === "boolean") return value;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function requireFlag(flags: Flags, name: string): string {
  const value = flag(flags, name);
  if (!value) throw new CliError(`Missing required flag: --${name}`);
  return value;
}

function num(flags: Flags, name: string, fallback: number): number {
  const raw = flag(flags, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new CliError(`--${name} must be a positive number`);
  }
  return value;
}

function endpoint(flags: Flags): string {
  return (flag(flags, "endpoint") ?? DEFAULT_ENDPOINT).replace(/^\/+|\/+$/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function loadSkillEnv(): Promise<void> {
  const envPath = join(SKILL_DIR, ".env");
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, "utf8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function falKey(optional = false): string | undefined {
  const key = process.env.FAL_KEY?.trim();
  if (key) return key;
  if (optional) return undefined;
  throw new CliError(
    `Missing FAL_KEY. Set it in the environment or ${join(SKILL_DIR, ".env")}.`,
  );
}

function authHeaders(key: string): Record<string, string> {
  const value = /^key\s+/i.test(key) ? key : `Key ${key}`;
  return { Authorization: value };
}

async function requestJson<T = unknown>(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<T> {
  let delay = 500;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, init);
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      if (!response.ok) {
        if (attempt < retries && RETRYABLE.has(response.status)) {
          await sleep(delay);
          delay = Math.min(delay * 2, 8000);
          continue;
        }
        const err = new Error(`HTTP ${response.status} for ${url}`) as Error & {
          status: number;
          payload: unknown;
        };
        err.status = response.status;
        err.payload = body;
        throw err;
      }
      return body as T;
    } catch (error) {
      if ((error as { status?: number }).status || attempt >= retries) throw error;
      await sleep(delay);
      delay = Math.min(delay * 2, 8000);
    }
  }
}

function printError(error: unknown): never {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  const http = error as { message?: string; status?: number; payload?: unknown };
  if (typeof http.status === "number") {
    console.error(`Error: ${http.message ?? "request failed"}`);
    if (http.payload !== undefined) {
      console.error(typeof http.payload === "string" ? http.payload : pretty(http.payload));
    }
    if (http.status === 401) {
      console.error("Check FAL_KEY (auth-check). fal expects Authorization: Key <FAL_KEY>.");
    }
    process.exit(1);
  }

  console.error(`Error: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}

async function ensureImageEndpoint(id: string, key?: string): Promise<void> {
  const url = new URL("https://api.fal.ai/v1/models");
  url.searchParams.set("endpoint_id", id);
  const headers = key ? authHeaders(key) : {};
  const data = await requestJson<{ models?: Array<{ metadata?: { category?: string } }> }>(
    url.toString(),
    { headers },
  );

  let category = data.models?.[0]?.metadata?.category?.trim() ?? "";
  if (!category) {
    const openapi = await requestJson<{
      info?: { "x-fal-metadata"?: { category?: string } };
    }>(`https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${encodeURIComponent(id)}`, {});
    category = openapi.info?.["x-fal-metadata"]?.category?.trim() ?? "";
  }

  if (!category) {
    throw new CliError(`Could not determine category for '${id}'.`);
  }

  const lower = category.toLowerCase();
  const blocked = ["video", "audio", "speech", "music", "3d"].some((k) => lower.includes(k));
  if (!lower.includes("image") || blocked) {
    throw new CliError(`Endpoint '${id}' category '${category}' is not image-only.`);
  }
}

function deref(schema: any, doc: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (typeof schema.$ref === "string" && schema.$ref.startsWith("#/")) {
    let cur: any = doc;
    for (const part of schema.$ref.slice(2).split("/")) cur = cur?.[part];
    return deref(cur, doc);
  }
  return schema;
}

function typeOf(schema: any, doc: any): string {
  const s = deref(schema, doc);
  if (!s || typeof s !== "object") return "unknown";
  if (Array.isArray(s.enum)) return `enum<${s.enum.map((v: unknown) => JSON.stringify(v)).join(" | ")}>`;
  if (s.type === "array") return `array<${typeOf(s.items, doc)}>`;
  if (s.type) return String(s.type);
  if (s.properties) return "object";
  return "unknown";
}

function collectImageUrls(value: unknown, out: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, out);
    return;
  }
  if (typeof value !== "object") return;
  const rec = value as Record<string, unknown>;
  if (typeof rec.url === "string") {
    const ct = typeof rec.content_type === "string" ? rec.content_type.toLowerCase() : "";
    if (ct.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(rec.url)) {
      out.add(rec.url);
    }
  }
  for (const nested of Object.values(rec)) collectImageUrls(nested, out);
}

async function downloadImages(result: unknown, outputDir: string): Promise<string[]> {
  const urls = new Set<string>();
  collectImageUrls(result, urls);
  if (urls.size === 0) return [];

  await mkdir(outputDir, { recursive: true });
  const saved: string[] = [];
  let i = 0;
  for (const url of urls) {
    i += 1;
    const response = await fetch(url);
    if (!response.ok) throw new CliError(`Download failed (${response.status}): ${url}`);
    const ct = response.headers.get("content-type") ?? "image/png";
    let name = `image-${i}`;
    try {
      name = new URL(url).pathname.split("/").filter(Boolean).pop() || name;
    } catch {
      // keep default
    }
    if (!extname(name)) {
      const ext =
        ct.includes("jpeg") || ct.includes("jpg")
          ? ".jpg"
          : ct.includes("webp")
            ? ".webp"
            : ct.includes("gif")
              ? ".gif"
              : ".png";
      name += ext;
    }
    const path = join(outputDir, name);
    await writeFile(path, new Uint8Array(await response.arrayBuffer()));
    saved.push(path);
  }
  return saved;
}

async function readInput(flags: Flags): Promise<unknown> {
  const inline = flag(flags, "input");
  const file = flag(flags, "input-file");
  if ((inline && file) || (!inline && !file)) {
    throw new CliError("Provide exactly one of --input or --input-file");
  }
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (error) {
      throw new CliError(`Invalid --input JSON: ${error instanceof Error ? error.message : "parse error"}`);
    }
  }
  const path = file as string;
  if (!existsSync(path)) throw new CliError(`Input file not found: ${path}`);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new CliError(`Invalid --input-file JSON: ${error instanceof Error ? error.message : "parse error"}`);
  }
}

async function cmdAuthCheck(flags: Flags) {
  const key = falKey(true);
  const payload = {
    skill_dir: SKILL_DIR,
    skill_env: join(SKILL_DIR, ".env"),
    skill_env_present: existsSync(join(SKILL_DIR, ".env")),
    fal_key_present: Boolean(key),
    cwd: process.cwd(),
  };
  if (bool(flags, "json")) {
    console.log(pretty(payload));
    return;
  }
  console.log(`Skill dir: ${payload.skill_dir}`);
  console.log(`Skill .env: ${payload.skill_env_present ? "present" : "missing"}`);
  console.log(`FAL_KEY: ${payload.fal_key_present ? "present" : "missing"}`);
  console.log(`cwd: ${payload.cwd}`);
}

async function cmdModels(flags: Flags) {
  const key = falKey(true);
  const url = new URL("https://api.fal.ai/v1/models");
  url.searchParams.set("limit", String(num(flags, "limit", 20)));
  const q = flag(flags, "q");
  if (q) url.searchParams.set("q", q);

  const data = await requestJson<{
    models?: Array<{
      endpoint_id: string;
      metadata?: { display_name?: string; category?: string; status?: string; description?: string };
    }>;
    next_cursor?: string | null;
  }>(url.toString(), { headers: key ? authHeaders(key) : {} });

  const models = (data.models ?? []).filter((m) => {
    const cat = (m.metadata?.category ?? "").toLowerCase();
    return cat.includes("image") && !cat.includes("video");
  });

  if (bool(flags, "json")) {
    console.log(pretty({ models, next_cursor: data.next_cursor ?? null }));
    return;
  }

  console.log(`Models: ${models.length}`);
  for (const model of models) {
    console.log(`- ${model.endpoint_id}`);
    console.log(`  ${model.metadata?.display_name ?? "(n/a)"} | ${model.metadata?.category ?? "(n/a)"} | ${model.metadata?.status ?? "(n/a)"}`);
  }
  if (data.next_cursor) console.log(`Next cursor: ${data.next_cursor}`);
}

async function cmdSchema(flags: Flags) {
  const id = endpoint(flags);
  await ensureImageEndpoint(id, falKey(true));
  const doc = await requestJson<any>(
    `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${encodeURIComponent(id)}`,
    {},
  );

  const paths = Object.keys(doc.paths ?? {});
  const submitPath =
    paths.find((p) => p === `/${id}`) ??
    paths.find((p) => p.startsWith(`/${id}`) && !p.includes("/requests/"));
  if (!submitPath) throw new CliError(`No submit path for '${id}'`);

  const schema = deref(
    doc.paths?.[submitPath]?.post?.requestBody?.content?.["application/json"]?.schema,
    doc,
  );
  if (!schema) throw new CliError(`No request schema for '${id}'`);

  const required = new Set<string>(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(([name, raw]) => {
    const prop = deref(raw, doc);
    return {
      name,
      required: required.has(name),
      type: typeOf(raw, doc),
      default: prop?.default,
      enum: Array.isArray(prop?.enum) ? prop.enum : undefined,
      description: typeof prop?.description === "string" ? prop.description.trim() : undefined,
    };
  });
  fields.sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));

  if (bool(flags, "json")) {
    console.log(pretty({ endpoint: id, submit_path: submitPath, fields }));
    return;
  }

  console.log(`Endpoint: ${id}`);
  console.log(`Required: ${[...required].join(", ") || "(none)"}`);
  console.log("");
  for (const field of fields) {
    console.log(`- ${field.name} (${field.required ? "required" : "optional"})`);
    console.log(`  type: ${field.type}`);
    if (field.default !== undefined) console.log(`  default: ${JSON.stringify(field.default)}`);
    if (field.enum) console.log(`  enum: ${field.enum.map((v: unknown) => JSON.stringify(v)).join(", ")}`);
    if (field.description) console.log(`  description: ${field.description}`);
  }
}

async function cmdGenerate(flags: Flags) {
  const id = endpoint(flags);
  const key = falKey() as string;
  const input = await readInput(flags);
  await ensureImageEndpoint(id, key);

  const headers = {
    ...authHeaders(key),
    "Content-Type": "application/json",
  };

  const submit = await requestJson<{
    request_id: string;
    status_url?: string;
    response_url?: string;
    cancel_url?: string;
  }>(`https://queue.fal.run/${id}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  const requestId = submit.request_id;
  if (!requestId) throw new CliError("Queue submit missing request_id");

  const base = `https://queue.fal.run/${id}/requests/${requestId}`;
  const statusUrl = submit.status_url ?? `${base}/status`;
  const responseUrl = submit.response_url ?? base;
  const cancelUrl = submit.cancel_url ?? `${base}/cancel`;

  if (bool(flags, "no-poll")) {
    const payload = { request_id: requestId, status_url: statusUrl, response_url: responseUrl, cancel_url: cancelUrl };
    console.log(bool(flags, "json") ? pretty(payload) : pretty(payload));
    return;
  }

  const withLogs = bool(flags, "logs");
  const pollUrl = withLogs ? `${statusUrl}${statusUrl.includes("?") ? "&" : "?"}logs=1` : statusUrl;
  const maxWaitMs = num(flags, "max-wait-sec", DEFAULT_MAX_WAIT_SEC) * 1000;
  const started = Date.now();
  let delay = DEFAULT_POLL_MS;
  let statusPayload: any = null;

  while (true) {
    if (Date.now() - started > maxWaitMs) {
      throw new CliError(`Polling timed out after ${maxWaitMs / 1000}s (${requestId})`);
    }

    statusPayload = await requestJson<any>(pollUrl, { headers: authHeaders(key) });
    const status = String(statusPayload?.status ?? "UNKNOWN");
    if (!bool(flags, "json")) {
      const pos =
        typeof statusPayload?.queue_position === "number"
          ? ` queue_position=${statusPayload.queue_position}`
          : "";
      console.error(`[poll] status=${status}${pos}`);
    }

    if (status === "COMPLETED") {
      if (statusPayload?.error) {
        const type = statusPayload.error_type ? ` (${statusPayload.error_type})` : "";
        const msg =
          typeof statusPayload.error === "string"
            ? statusPayload.error
            : pretty(statusPayload.error);
        throw new CliError(`Request completed with error${type}: ${msg}`);
      }
      break;
    }

    if (["FAILED", "ERROR", "CANCELLED"].includes(status)) {
      throw new CliError(`Request ended with status=${status}`);
    }

    await sleep(delay + Math.floor(Math.random() * 250));
    delay = Math.min(DEFAULT_MAX_POLL_MS, Math.round(delay * 1.35));
  }

  const result = await requestJson<unknown>(responseUrl, { headers: authHeaders(key) });
  const outputDir = bool(flags, "no-download")
    ? undefined
    : flag(flags, "output-dir") ?? join(DEFAULT_OUTPUT_ROOT, requestId);
  const downloaded = outputDir ? await downloadImages(result, outputDir) : [];

  const payload = {
    endpoint: id,
    request_id: requestId,
    status: statusPayload,
    result,
    output_dir: outputDir ?? null,
    downloaded_files: downloaded,
  };

  const savePath = flag(flags, "save");
  if (savePath) {
    await writeFile(savePath, pretty(payload));
    console.error(`[info] saved ${savePath}`);
  }

  if (bool(flags, "json")) {
    console.log(pretty(payload));
    return;
  }

  console.log(`Completed request_id: ${requestId}`);
  const urls = new Set<string>();
  collectImageUrls(result, urls);
  if (urls.size) {
    console.log("Image URL(s):");
    for (const url of urls) console.log(`- ${url}`);
  }
  if (downloaded.length) {
    console.log("Downloaded file(s):");
    for (const path of downloaded) console.log(`- ${path}`);
  }
}

async function cmdStatus(flags: Flags) {
  const id = endpoint(flags);
  const requestId = requireFlag(flags, "request-id");
  const key = falKey() as string;
  let url = `https://queue.fal.run/${id}/requests/${requestId}/status`;
  if (bool(flags, "logs")) url += "?logs=1";
  const result = await requestJson(url, { headers: authHeaders(key) });
  console.log(pretty(result));
}

async function cmdResult(flags: Flags) {
  const id = endpoint(flags);
  const requestId = requireFlag(flags, "request-id");
  const key = falKey() as string;
  const result = await requestJson(
    `https://queue.fal.run/${id}/requests/${requestId}`,
    { headers: authHeaders(key) },
  );
  console.log(pretty(result));
}

async function cmdCancel(flags: Flags) {
  const id = endpoint(flags);
  const requestId = requireFlag(flags, "request-id");
  const key = falKey() as string;
  const result = await requestJson(
    `https://queue.fal.run/${id}/requests/${requestId}/cancel`,
    { method: "PUT", headers: authHeaders(key) },
  );
  console.log(pretty(result));
}

async function cmdUpload(flags: Flags) {
  const filePath = requireFlag(flags, "file");
  if (!existsSync(filePath)) throw new CliError(`File not found: ${filePath}`);

  const key = falKey() as string;
  const file = Bun.file(filePath);
  const contentType = file.type && file.type !== "application/octet-stream"
    ? file.type
    : extname(filePath).toLowerCase() === ".png"
      ? "image/png"
      : extname(filePath).toLowerCase() === ".webp"
        ? "image/webp"
        : extname(filePath).toLowerCase() === ".gif"
          ? "image/gif"
          : "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new CliError(`Not an image content type: ${contentType}`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const init = await requestJson<{ upload_url: string; file_url: string }>(
    "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
    {
      method: "POST",
      headers: {
        ...authHeaders(key),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: basename(filePath),
        content_type: contentType,
      }),
    },
  );

  const put = await fetch(init.upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!put.ok) throw new CliError(`Upload PUT failed (${put.status})`);

  const payload = { file_url: init.file_url, content_type: contentType };
  if (bool(flags, "json")) console.log(pretty(payload));
  else console.log(init.file_url);
}

async function main() {
  await loadSkillEnv();
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (bool(flags, "version")) {
    console.log(VERSION);
    return;
  }

  if (!command || command === "help" || bool(flags, "help")) {
    const text = help(command === "help" ? undefined : command);
    if (!text) throw new CliError(`Unknown command: ${command}`);
    console.log(text);
    return;
  }

  const handlers: Record<string, (flags: Flags) => Promise<void>> = {
    "auth-check": cmdAuthCheck,
    models: cmdModels,
    schema: cmdSchema,
    generate: cmdGenerate,
    status: cmdStatus,
    result: cmdResult,
    cancel: cmdCancel,
    upload: cmdUpload,
  };

  const handler = handlers[command];
  if (!handler) throw new CliError(`Unknown command: ${command}`);
  if (bool(flags, "help")) {
    console.log(help(command));
    return;
  }
  await handler(flags);
}

main().catch(printError);
