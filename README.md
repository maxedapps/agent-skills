# Maxed Apps Agent Skills

## Available skills

- `create-plan` — create researched, implementation-ready plans.
- `implement-plan` — execute existing Markdown implementation plans with active tracking and verification.
- `improve-skills` — improve Agent Skills from evidence gathered during real interactions.
- `review-plan-implementation` — verify an implementation against its source plan and acceptance criteria.
- `use-subagents` — decide when delegation is worthwhile and coordinate bounded subagent work across available backends.
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
  --skill review-plan-implementation
```

Review each skill and its compatibility requirements before use. Some skills integrate with other skills or external tooling such as Herdr.

## Runtime and related skills

- **Bun is optional.** Only `create-plan` attempts to use Bun, and only for rich Markdown-to-HTML rendering. If Bun is unavailable, its Node.js renderer warns and produces escaped plain-text HTML instead. No skill fails solely because Bun is missing.
- **Node.js 18+ is required** when `create-plan` renders HTML.
- **Subagent launches require a usable delegation backend.** `use-subagents` prefers Herdr when it is installed and passes preflight, then uses a runtime-native subagent capability, then a suitable authenticated non-interactive agent CLI. Its decision workflow can run without a backend. `implement-plan` requires a usable backend for its workers and reviewers; `create-plan` permits documented self-review only when all three backend options are unusable; large or multi-subsystem `review-plan-implementation` work requires a usable backend.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `create-plan`

Researches a requested change and turns the findings into a concrete, implementation-ready Markdown plan. It records decisions, affected files, risks, validation steps, and review checkpoints without implementing the change.

### `implement-plan`

Executes an existing Markdown plan through tracked Analyze → Plan → Implement → Verify loops. It maintains a detailed progress tracker, delegates implementation work through `use-subagents`, validates each task, and reconciles the final result against the original plan.

### `improve-skills`

Refines Agent Skills using evidence from real interactions. It favors small, reusable corrections to routing, instructions, resource references, scripts, or safety guidance instead of speculative rewrites.

### `review-plan-implementation`

Compares an implemented change with its source plan, acceptance criteria, and implied requirements. It verifies claims against code, tests, configuration, documentation, and Git evidence and reports missing, partial, or incorrect work.

### `use-subagents`

Decides whether bounded worker, reviewer, research, or validation work benefits from delegation, then coordinates it with least-privilege permissions, writer isolation, monitored handoffs, parent verification, and owned-resource cleanup. It prefers Herdr when installed and usable, falls back to runtime-native delegation, then to a suitable authenticated non-interactive agent CLI.

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
