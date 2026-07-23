---
name: generate-image
description: >-
  Generates AI images through fal.ai HTTP queue workflows from a Bun CLI. Use
  this skill when a task needs AI image generation, schema inspection, image
  upload, or queue polling through fal.ai. Do not use for video, audio, 3D, or
  non-image workflows.
license: MIT
compatibility: >-
  Requires Bun, outbound HTTPS, and FAL_KEY in the environment or this skill's
  .env.
metadata:
  short-description: Generate images with fal.ai (default openai/gpt-image-2)
---

# Generate Image

## Rules

- Use `scripts/generate-image.ts`.
- Default endpoint: **`openai/gpt-image-2`**. Change `--endpoint` only if the user asks.
- Run `schema` before non-trivial payloads.
- Never read or print `.env` / `FAL_KEY` values.
- Image-only.

## Setup

```bash
cp .env.example .env   # from this skill directory
# set FAL_KEY=...
```

The script loads this skill's `.env` automatically. Exported env wins.

## Workflow

1. `auth-check` if credentials are uncertain.
2. `schema` for non-trivial inputs.
3. `generate` with JSON input.
4. Inspect downloaded files before using them.
5. For official logos/marks: generate scene only, composite real assets locally.

## Commands

```bash
bun run scripts/generate-image.ts auth-check
bun run scripts/generate-image.ts schema
bun run scripts/generate-image.ts generate \
  --input '{"prompt":"editorial photo of a red fox in Tokyo at night"}'
bun run scripts/generate-image.ts generate \
  --input-file ./input.json \
  --output-dir ./out
bun run scripts/generate-image.ts upload --file ./ref.png
```

Defaults: queue + poll, download images to a temp dir. Useful flags: `--output-dir`, `--no-download`, `--logs`, `--json`, `--save`.

## Failures

- **401 / missing key** → set `FAL_KEY`, run `auth-check`
- **422** → run `schema`, fix payload
- **non-image endpoint** → rejected
- **COMPLETED + error** → fix input or retry
