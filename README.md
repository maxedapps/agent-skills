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

Review each skill and its compatibility requirements before use. `code-review`, `create-plan`, and `implement-plan` strongly consider safe subagents for suitable bounded work, research, and review while keeping synthesis and acceptance with the parent. The generic `use-subagents` contract remains portable, and no catalog skill is a hard runtime dependency of another.

## Runtime and related skills

- **Subagent coordination is portable.** The generic `use-subagents` strategy can pair with a runtime-specific adapter for exact lifecycle mechanics, or use an inspected native capability or suitably controlled non-interactive CLI when no adapter exists. Planning and coordination do not themselves require delegation.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs evidence-bound generic and plan-backed reviews. It strongly considers bounded read-only subagents for independent review dimensions, while the parent verifies evidence, consolidates handoffs, and owns final findings and verdicts.

### `create-plan`

Produces a fixed-structure Markdown implementation plan after thorough code exploration, decision-relevant external research, and deliberate approach comparison. It strongly considers safe subagents for separable exploration, research, and review while the parent owns synthesis and decisions.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `implement-plan`

Executes an existing Markdown plan in verified dependency-ready batches. It strongly considers bounded parallel subagent lanes, keeps integration and acceptance with the parent, reviews major boundaries and the full implementation, and queues doubtful complexity-increasing findings for human decisions.

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

Verify CLI discovery without telemetry:

```sh
DISABLE_TELEMETRY=1 npx -y skills@latest add . --list
```

## License

MIT
