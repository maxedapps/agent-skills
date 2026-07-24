---
name: create-skill
description: >-
  Creates, rewrites, reviews, and evidence-backed improves Agent Skills that are
  concise, unambiguous, progressively disclosed, and agent-actionable. Use this
  skill when authoring or revising a SKILL.md, its routing description,
  references, assets, scripts, or reusable workflow guidance. Do not use for
  installing third-party skills or one-off preferences without reusable evidence.
license: MIT
metadata:
  short-description: Create and evaluate concise Agent Skills
---

# Create Skill

## Required resources and checks

- Before using a starter, read and adapt [`assets/skill-template.md`](assets/skill-template.md). Replace every sentinel and remove unused sections.
- Before finalizing or reviewing, read [`references/skill-quality-checklist.md`](references/skill-quality-checklist.md). Record applicable evidence.
- When this catalog's root scripts exist, run:
  - `node scripts/validate-skill-metadata.mjs <skill-path>`
  - `node scripts/validate-skill-links.mjs <skill-path>`
- Otherwise perform equivalent checks manually. Report the unavailable gate.

Follow user and higher-priority constraints. Keep one coherent job. Preserve behavior outside an evidence-backed requested change.

## Skill contract

- Put all activation guidance in frontmatter `description`. The body loads only after activation.
- Use: `[Third-person capability]. Use this skill when [intents/triggers]. Do not use when/for [material near misses].`
- Keep the description under 1024 characters. Focus on intent, outcomes, and adjacent boundaries—not mechanics.
- Keep `SKILL.md` concise and actionable. Put critical constraints, mandatory resources, fragile sequencing, validation, and safety early.
- Default to short headings, compact bullets, numbered procedures, and small tables. Use prose paragraphs only when they communicate necessary nuance more clearly.
- Keep each bullet focused on one instruction or tightly coupled behavior. Prefer direct wording; remove throat-clearing, repeated rationale, and paragraph-length bullets.
- Match the surrounding skill catalog's density. A longer main file requires execution-critical justification; move conditional detail into `references/`.
- Use progressive disclosure deliberately. Do not squeeze useful reusable detail into `SKILL.md` merely to avoid a resource.
- Use `references/` for detailed workflows, schemas, examples, tool guidance, and gotchas.
- Use `assets/` for reusable templates and static output shapes.
- Use `scripts/` for repeated or fragile deterministic operations.
- Add resources when they improve repeated execution, clarity, consistency, or maintenance.
- Keep references one level deep.
- Add a resource pointer only after its file exists. Give its exact path, purpose, and read/use/run condition.
- Repeat mandatory resource loading at the relevant workflow step. Delete stale pointers and empty directories.
- Refer to other skills by name, such as `create-plan`. Do not use relative paths to their `SKILL.md` files.
- Ground changes in real tasks, artifacts, recurring failures, user corrections, or evaluation evidence.
- Reject one-off or speculative preferences. Prefer the smallest durable correction.
- Check tools, schemas, commands, and examples for staleness. Ask when reusability is unclear.
- Prescribe fragile, destructive, security-sensitive, and validation-critical sequences. Allow judgment elsewhere.

## Workflow

### 1. Define observable use cases

- Record two or three realistic tasks.
- For each, record inputs, expected output, success criteria, and constraints.
- Record two or three strong near misses. Name the correct adjacent skill or direct workflow.
- For an existing skill, record reusable change evidence and the smallest durable correction.
- Do not broaden scope because related guidance is available.

### 2. Inspect the ecosystem

- Read the target skill and project instructions.
- Inspect nearby global and project skills, conventions, scripts, tools, and schemas.
- Identify duplicated policy and resource boundaries.
- Reuse good patterns. Do not copy generic advice or another skill's whole workflow.

### 3. Draft frontmatter first

- Write the description before the body.
- Include realistic user phrasing, useful co-activation, and material near misses.
- Use lowercase kebab-case for `name`. Keep it under 64 characters and match the directory.

### 4. Build the post-activation contract

- Include only rules needed after activation.
- Define critical constraints, sequence, resources, validation, failure handling, and safety.
- Remove redundant explanation, excessive menus, stale examples, vague guidance, and unrelated content.
- Perform a compression pass: shorten wording, split overloaded bullets, convert scannable prose to lists, and remove content that does not change execution.
- Create supporting resources when detail is reusable or would crowd the main file.
- Make scripts non-interactive. Support `--help`, bounded output, clear exit codes, and safe idempotent defaults.
- Require `--dry-run` or confirmation for destructive scripts.
- Print structured data to stdout and diagnostics to stderr. Document prerequisites.

### 5. Evaluate routing and execution

- Test three to five realistic should-trigger prompts and two to three strong near misses.
- Judge routing from the description alone. Expand cases only for broadly distributed or high-risk skills.
- Run one representative task with realistic input. Compare its output with the recorded success criteria.
- Prefer a fresh, safely available subagent for unbiased execution or review.
- Otherwise record the direct fallback and its independence limit. Treat child claims as evidence, not acceptance.
- Revise only material evidence-backed gaps. Rerun affected routing and output checks once.
- Do not build a benchmark framework for a small skill.

### 6. Validate and finalize

Run applicable checks from the repository root:

```sh
node scripts/validate-skill-metadata.mjs path/to/skill
node scripts/validate-skill-links.mjs path/to/skill
npx -y skills-ref validate path/to/skill
```

- Run each added or changed script's `--help`, focused tests, and one representative safe execution.
- Complete the quality checklist after the final revision.
- Report changed files, evaluated cases, exact results, skipped checks, reasons, and remaining risks.
- Never claim resources or artifacts that do not exist.
