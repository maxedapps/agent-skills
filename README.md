# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adversarial, evidence-bound code reviews and produce an HTML report.
- `create-plan` — create researched, implementation-ready plans.
- `implement-plan` — execute existing Markdown implementation plans with active tracking and verification.
- `improve-skills` — improve Agent Skills from evidence gathered during real interactions.
- `review-plan-implementation` — verify an implementation against its source plan and acceptance criteria.
- `use-subagents` — delegate bounded work to visible Herdr-managed agent panes.
- `web-research` — perform current, source-backed research across web content and repositories.

## Install

List all available skills:

```sh
npx skills add maxedapps/agent-skills --list
```

Install one skill:

```sh
npx skills add maxedapps/agent-skills@create-plan
```

Or use the explicit option:

```sh
npx skills add maxedapps/agent-skills --skill create-plan
```

Install multiple selected skills:

```sh
npx skills add maxedapps/agent-skills \
  --skill create-plan \
  --skill implement-plan \
  --skill code-review
```

Review each skill and its compatibility requirements before use. Some skills integrate with other skills or external tooling such as Herdr.

## Runtime and related skills

- **Bun is optional.** Only `create-plan` and `code-review` attempt to use Bun, and only for rich Markdown-to-HTML rendering. If Bun is unavailable, their Node.js renderers warn and produce escaped plain-text HTML instead. No skill fails solely because Bun is missing.
- **Node.js 18+ is required** when `create-plan` or `code-review` renders HTML.
- **Herdr 0.7.3+ is required** by `use-subagents`. `create-plan` uses it for independent review, and `implement-plan` uses it for workers and reviewers.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs an adversarial but evidence-bound review of a codebase or change. It checks correctness, security, test quality, maintainability, typing, performance, and unnecessary complexity, then produces Markdown and HTML reports.

### `create-plan`

Researches a requested change and turns the findings into a concrete, implementation-ready Markdown plan. It records decisions, affected files, risks, validation steps, and review checkpoints without implementing the change.

### `implement-plan`

Executes an existing Markdown plan through tracked Analyze → Plan → Implement → Verify loops. It maintains a detailed progress tracker, delegates implementation work through `use-subagents`, validates each task, and reconciles the final result against the original plan.

### `improve-skills`

Refines Agent Skills using evidence from real interactions. It favors small, reusable corrections to routing, instructions, resource references, scripts, or safety guidance instead of speculative rewrites.

### `review-plan-implementation`

Compares an implemented change with its source plan, acceptance criteria, and implied requirements. It verifies claims against code, tests, configuration, documentation, and Git evidence and reports missing, partial, or incorrect work.

### `use-subagents`

Runs bounded worker, reviewer, research, or validation tasks in visible Herdr-managed panes. It defines strict isolation, permissions, handoff, verification, and cleanup rules and requires Herdr 0.7.3 or newer.

### `web-research`

Researches current web and external technical information with whatever search, retrieval, repository, document, media, and browser capabilities are available. It also covers version-specific library, framework, SDK, and API research, favoring official documentation and source code while recording evidence, conflicts, and implementation implications.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` file and optional `references/`, `assets/`, and `scripts/` resources.

## Validate

```sh
for d in skills/*; do
  [ -d "$d" ] && npx -y skills-ref validate "$d"
done
```

Verify CLI discovery without telemetry:

```sh
DISABLE_TELEMETRY=1 npx -y skills@latest add . --list
```

## License

MIT
