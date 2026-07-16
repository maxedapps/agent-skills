# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `create-skill` — create, rewrite, and review concise, actionable Agent Skills.
- `implement-plan` — execute existing Markdown implementation plans with delegation-first tracking and verification.
- `use-subagents` — plan and coordinate portable, bounded subagent work with runtime-specific lifecycle adapters.
- `web-research` — perform current, source-backed research across web content and repositories.

## Install

List all available skills:

```sh
npx skills add maxedapps/agent-skills --list
```

Install one skill:

```sh
npx skills add maxedapps/agent-skills@code-review
```

Or use the explicit option:

```sh
npx skills add maxedapps/agent-skills --skill code-review
```

Install all six skills explicitly:

```sh
npx skills add maxedapps/agent-skills \
  --skill code-review \
  --skill create-plan \
  --skill create-skill \
  --skill implement-plan \
  --skill use-subagents \
  --skill web-research
```

Review each skill and its compatibility requirements before use. `create-plan` and `implement-plan` default suitable bounded work and independent review to safe subagent lanes, with recorded direct fallbacks. The generic `use-subagents` contract remains portable, and no catalog skill is a hard runtime dependency of another.

## Runtime and related skills

- **`create-plan` rendering requires Node.js 18+.** Bun is optional and enables rich Markdown-to-HTML rendering. Without Bun, the bundled Node.js renderer warns and produces escaped plain-text HTML instead.
- **Subagent coordination is portable.** The generic `use-subagents` strategy can pair with a runtime-specific adapter for exact lifecycle mechanics, or use an inspected native capability or suitably controlled non-interactive CLI when no adapter exists. Planning and coordination do not themselves require delegation.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs evidence-bound reviews that adapt to the requested target, baseline, scope, dimensions, depth, tools, validation, writes, and output. It supports generic repository or diff review, bounded review of a phase or implementation step, and plan-backed review with requirement traceability, separate quality/compliance/test verdicts, and explicit coverage and caveats.

### `create-plan`

Researches a requested change and produces a concise problem-led Markdown plan with numbered phases and stable, actionable tasks. It actively delegates safe separable research and fresh draft review, records narrow fallbacks, validates the required structure, and keeps HTML rendering optional.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `implement-plan`

Executes an existing Markdown plan through tracked Analyze → Plan → Implement → Verify loops. It classifies bounded non-trivial work for delegation, forms safe dependency-ready batches with isolated writers, keeps the parent as tracker/integration authority, validates every task, and defaults meaningful checkpoints and final reconciliation to fresh plan-backed review.

### `use-subagents`

Decides whether delegation is worthwhile, splits work into independent fan-out, staged, fresh-review, or isolated-writer lanes, and defines bounded assignments with least privilege, monitored handoffs, parent verification, and owned-resource cleanup. Exact launch, status, stop, worktree, and cleanup mechanics belong to a runtime-specific adapter when available; otherwise the skill uses only inspected native capabilities or a suitably controlled non-interactive CLI, and fails closed when neither is safe.

### `web-research`

Researches current web and external technical information with available search, retrieval, repository, document, media, and browser capabilities. It favors official, version-matched evidence; small direct lookups can remain artifact-free, while substantive or conflicting research retains progress memory.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` file and optional `references/`, `assets/`, and `scripts/` resources.

## Validate

```sh
for d in skills/*; do
  [ -d "$d" ] && npx -y skills-ref validate "$d"
done
```

Validate catalog metadata and local Markdown links:

```sh
node scripts/validate-skill-metadata.mjs skills
node scripts/validate-skill-links.mjs README.md skills
```

Validate a generated implementation plan:

```sh
node skills/create-plan/scripts/validate-plan-structure.mjs path/to/plan.md
```

Verify CLI discovery without telemetry:

```sh
DISABLE_TELEMETRY=1 npx -y skills@latest add . --list
```

## License

MIT
