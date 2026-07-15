# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `implement-plan` — execute existing Markdown implementation plans with active tracking and verification.
- `improve-skills` — improve Agent Skills from evidence gathered during real interactions.
- `use-subagents` — decide independently when delegation is worthwhile and coordinate bounded subagent work across available backends.
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
  --skill implement-plan \
  --skill improve-skills \
  --skill use-subagents \
  --skill web-research
```

Review each skill and its compatibility requirements before use. Skills may optionally use available research, browser, or subagent capabilities when those capabilities materially help; none requires another catalog skill as a runtime dependency.

## Runtime and related skills

- **`create-plan` rendering requires Node.js 18+.** Bun is optional and enables rich Markdown-to-HTML rendering. Without Bun, the bundled Node.js renderer warns and produces escaped plain-text HTML instead.
- **Subagent work is optional.** Planning, implementation, and review workflows may consider available subagents for bounded, independent, or separable work, but direct execution remains valid and no delegation backend is required merely to use those workflows.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs evidence-bound reviews that adapt to the requested target, baseline, scope, dimensions, depth, tools, validation, writes, and output. It supports generic repository or diff review, bounded review of a phase or implementation step, and plan-backed review with requirement traceability, separate quality/compliance/test verdicts, and explicit coverage and caveats.

### `create-plan`

Researches a requested change and turns the findings into a concrete, implementation-ready Markdown plan. It also reviews or improves an existing unimplemented plan before coding, recording decisions, affected files, risks, validation steps, and review checkpoints without implementing the change.

### `implement-plan`

Executes an existing Markdown plan through tracked Analyze → Plan → Implement → Verify loops. It maintains a detailed progress tracker, optionally delegates bounded work when useful and safe, validates each task, requests plan-backed milestone and final reviews, and reconciles the result against the original plan.

### `improve-skills`

Refines Agent Skills using evidence from real interactions. It favors small, reusable corrections to routing, instructions, resource references, scripts, or safety guidance instead of speculative rewrites.

### `use-subagents`

Independently decides whether bounded worker, reviewer, research, or validation work benefits from delegation, then coordinates it with least-privilege permissions, writer isolation, monitored handoffs, parent verification, and owned-resource cleanup. It can select Herdr, a runtime-native capability, or a suitable authenticated non-interactive agent CLI when available; deciding not to delegate is valid.

### `web-research`

Researches current web and external technical information with available search, retrieval, repository, document, media, and browser capabilities. It also covers version-specific library, framework, SDK, and API research, favoring official documentation and source code while recording evidence, conflicts, and implementation implications.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` file and optional `references/`, `assets/`, and `scripts/` resources.

## Validate

```sh
for d in skills/*; do
  [ -d "$d" ] && npx -y skills-ref validate "$d"
done
```

Validate local Markdown links:

```sh
node scripts/validate-skill-links.mjs README.md skills
```

Verify CLI discovery without telemetry:

```sh
DISABLE_TELEMETRY=1 npx -y skills@latest add . --list
```

## License

MIT
