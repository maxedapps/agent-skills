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

## Mandatory resources and checks

- **Before using a starter skeleton, read and adapt [`assets/skill-template.md`](assets/skill-template.md).** Replace every sentinel, remove unused sections, and add no resource pointer until that exact file exists.
- **Before finalizing or reviewing a skill, read [`references/skill-quality-checklist.md`](references/skill-quality-checklist.md)** and record the applicable validation/evaluation evidence.
- When this catalog's root scripts are available, run `node scripts/validate-skill-metadata.mjs <skill-path>` and `node scripts/validate-skill-links.mjs <skill-path>` from the repository root. Otherwise perform the same metadata/resource checks manually and state the unavailable gate.

Follow explicit user and higher-priority constraints. Keep the skill focused on one coherent job and preserve existing behavior outside an evidence-backed requested change.

## Authoring and improvement contract

- Put all activation guidance in frontmatter `description`; the body is available only after activation.
- Use this exact description shape: `[Third-person capability]. Use this skill when [intents/triggers]. Do not use when/for [material near misses].` Keep it under 1024 characters and focused on user intent, outcomes, and adjacent boundaries—not internal mechanics.
- Keep `SKILL.md` concise and actionable. Put critical constraints, mandatory resources, fragile sequencing, validation, and safety rules early enough to survive partial reading.
- Use progressive disclosure: conditional/bulky detail in `references/`, reusable skeletons in `assets/`, and deterministic reusable CLIs in `scripts/`. Keep references one level deep.
- Every resource pointer names an exact relative path, what it contains, and when to read/use/run it. Repeat mandatory loading at the point of use. Delete pointers and empty directories for resources that do not exist.
- Cross-skill references use skill names such as `create-plan`, never relative filesystem paths to another skill's `SKILL.md`.
- Ground changes in real tasks, artifacts, recurring failures, user corrections, or evaluation evidence. For an existing skill, reject one-off/speculative preferences, prefer the smallest durable update, check tool/schema/command examples for staleness, and ask when reusability is unclear.
- Calibrate strictness: prescribe fragile, destructive, security-sensitive, or validation-critical sequences; allow judgment where project context should decide.

## Workflow

### 1. Define observable use cases

Before drafting, record:

- two or three realistic user prompts/tasks the skill must handle;
- representative inputs and expected output/artifact for each;
- observable success criteria and important constraints;
- two or three strong near misses, including the adjacent skill or direct workflow that should handle them.

For an existing skill, also record the reusable evidence for changing it and the smallest durable correction. Do not broaden scope merely because related guidance is available.

### 2. Inspect the current ecosystem

Read the target skill and applicable project instructions, then inspect nearby global/project skills and conventions. Identify duplicated policy, resource boundaries, current scripts/tools/schemas, and adjacent routing. Reuse good patterns without copying generic advice or another skill's whole workflow.

### 3. Draft frontmatter first

Write the description before the body. Include realistic user phrasing, useful co-activation where appropriate, and material near misses. Ensure `name` is lowercase kebab-case, under 64 characters, and exactly matches its directory.

### 4. Build the post-activation contract

Write only rules needed after activation: critical constraints, a concrete execution sequence, exact resource routing, validation, failure handling, and safety. Remove redundant explanation, excessive menus, stale examples, vague “as needed” guidance, and content unrelated to the coherent job.

Add resources only when they materially improve repeated execution:

- `references/` for detailed conditional rules, schemas, gotchas, or command cookbooks;
- `assets/` for reusable templates or static output shapes;
- `scripts/` for complex, repeated, or fragile deterministic operations.

Scripts must be non-interactive, support `--help`, have bounded output and clear exit codes, use safe/idempotent defaults (or explicit `--dry-run`/confirmation for destructive behavior), print structured data to stdout and diagnostics to stderr, and document prerequisites.

### 5. Evaluate routing and real execution

Use at least three to five realistic should-trigger prompts and two to three strong near misses. Check whether the description alone routes each case correctly; expand only for broadly distributed or high-risk skills.

Run at least one representative real-use task with realistic input and inspect the produced output against the recorded success criteria. Prefer a fresh safely available subagent for unbiased execution/review; otherwise record why direct execution was used and its independence limitation. A child claim is evidence, not acceptance.

Review the result concisely, revise only material evidence-backed gaps, then rerun affected routing/output checks once. Avoid building a benchmark framework for a small skill.

### 6. Validate and finalize

Run applicable commands from the repository root:

```sh
node scripts/validate-skill-metadata.mjs path/to/skill
node scripts/validate-skill-links.mjs path/to/skill
npx -y skills-ref validate path/to/skill
```

Also run each added/changed script's `--help`, focused tests, and one representative safe execution. Complete the quality checklist after the final revision. Report changed files, evaluated cases/results, commands/results, skipped checks with reasons, and remaining risks; never claim resources or artifacts that do not exist.
