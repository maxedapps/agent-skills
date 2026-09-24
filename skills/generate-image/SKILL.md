---
name: generate-image
description: >-
  Generates and edits images through fal.ai. Use this skill when a task needs
  text-to-image generation, reference-image editing, image upload, schema
  inspection, or queued-job recovery. Do not use for video, audio, 3D, local-only image
  manipulation, or non-image workflows.
license: MIT
compatibility: Requires Bun, outbound HTTPS, and FAL_KEY in the environment or this skill's .env.
metadata:
  short-description: Generate and edit images with Grok Imagine Image 2.0
---

# Generate Image

## Rules

- Use `scripts/generate-image.ts`; check `--help` when needed.
- Defaults: `generate` → `xai/grok-imagine-image/v2.0/text-to-image`; `edit` → `xai/grok-imagine-image/v2.0/edit`.
- `edit` requires `prompt` and 1–3 `image_urls`; upload local references first.
- Override `--endpoint` only when the user requests another model; run `schema` before unfamiliar fields or endpoints.
- Never read or expose `.env` or `FAL_KEY` values.
- Generation is billable: clarify ambiguous requests and never blindly resubmit an uncertain request.
- Inspect outputs; composite official marks from real assets.

## Commands

```bash
bun run scripts/generate-image.ts --help
bun run scripts/generate-image.ts schema
bun run scripts/generate-image.ts generate --input '{"prompt":"editorial photo of a red fox in Tokyo at night"}'
bun run scripts/generate-image.ts upload --file ./reference.png
bun run scripts/generate-image.ts edit --input '{"prompt":"make the sky stormy","image_urls":["<uploaded-url>"]}'
```

`generate` and `edit` queue, poll, and download to a temporary directory by default. Retain the reported endpoint and request ID to resume a job.
