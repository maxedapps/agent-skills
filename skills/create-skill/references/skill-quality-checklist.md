# Skill Quality Checklist

Complete this before finalizing, reviewing, or substantially revising an Agent Skill. Record evidence rather than checking boxes from intent alone.

## Purpose and evidence

- The skill has one coherent job, explicit non-goals, and clear adjacent-skill boundaries.
- Two or three realistic use cases record inputs, expected outputs, observable success criteria, and material constraints.
- Two or three strong near misses identify the correct adjacent skill or direct workflow.
- An existing-skill change cites reusable task/evaluation evidence, is the smallest durable correction, and does not encode a one-off preference. Reusability uncertainty was resolved with the user.
- Current tool names, command flags, schemas, paths, runtime assumptions, and examples were checked rather than copied from stale memory.

## Frontmatter and routing

- `name` is lowercase kebab-case, at most 64 characters, and exactly matches the directory.
- `description` is under 1024 characters and uses: third-person capability + literal `Use this skill when...` + material `Do not use when/for...`.
- Routing focuses on user intent/outcomes, includes realistic phrasing and useful co-activation, and keeps all activation guidance out of the body.
- No unresolved starter sentinel, sample name, bare ellipsis, bracket instruction, or other placeholder remains.
- `compatibility` names material runtime, CLI, credential, platform, or capability assumptions when applicable.

## Main body

- Critical constraints, mandatory resource loads, fragile sequencing, validation, and safety rules appear early.
- The workflow is concrete enough to execute without guessing; defaults replace unnecessary menus.
- Prescriptiveness matches risk, and failure/cleanup/recovery behavior is explicit where material.
- Generic explanations, duplicated policy, transcript history, redundant examples, and unrelated guidance are removed.
- The main file matches nearby catalog density and is normally under roughly 150 lines; longer files retain only execution-critical material and move conditional detail into resources.
- The body favors short headings, compact bullets, numbered procedures, and small tables. Prose is retained only where it improves clarity.
- Bullets express one instruction or tightly coupled behavior; paragraph-length bullets, repeated rationale, and introductory filler are absent.
- Cross-skill references use skill names, not relative paths to another skill's `SKILL.md`.

## Resources and progressive disclosure

- Every referenced file exists at the exact relative path, is one level deep, and has a clear content summary plus read/use/run condition.
- Mandatory resources are named early and repeated at the point of use with “Before doing X, read/use...” force.
- No vague “see references”, “as needed”, nonexistent fake link, empty resource directory, or unreferenced resource remains.
- References over roughly 100 lines have a short table of contents.
- Assets are reusable output skeletons rather than duplicated instructions; unused sections and all template sentinels were removed.

## Scripts and safety

- Every script is justified by repeated/fragile deterministic work, not a simple pinned one-off command.
- Scripts are non-interactive, support `--help`, bound output, separate stdout data from stderr diagnostics, and document inputs, working directory, prerequisites, outputs, and exit codes.
- Stateful/destructive scripts are idempotent or provide an explicit dry-run/confirmation safeguard.
- No secrets, tokens, sessions, `.env` contents, generated credentials, unsafe third-party code, or accidental machine-only paths are included.

## Evaluation

- Three to five realistic should-trigger prompts route from the description alone; broadly distributed/high-risk skills use additional cases only when warranted.
- Two to three near-miss prompts do not trigger incorrectly and retain useful co-activation where intended.
- At least one representative real-use task ran with realistic input; its actual output meets the recorded success criteria.
- A fresh safely available subagent performed execution/review when useful, or the direct fallback and independence limitation are recorded.
- Material evidence-backed gaps received one concise revision and affected routing/output checks were rerun; no benchmark framework was added without need.

## Validation

Run applicable repository checks and retain exact results:

```sh
node scripts/validate-skill-metadata.mjs path/to/skill
node scripts/validate-skill-links.mjs path/to/skill
npx -y skills-ref validate path/to/skill
```

- Metadata, names, literal routing, description length, placeholders, and resource links pass mechanically where the catalog scripts exist; unavailable gates are checked manually and reported.
- Every added/changed script's `--help`, focused tests, and one representative safe execution pass.
- Final diff/status inspection shows only intended files, no stale generated artifacts, and no owner work lost.
