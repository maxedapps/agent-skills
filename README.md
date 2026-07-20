# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `create-skill` — create, rewrite, and review concise, actionable Agent Skills.
- `implement-plan` — execute existing Markdown implementation plans with delegation-first tracking and verification.
- `use-subagents` — provide legacy delegation guidance only when the dynamic skill is unavailable.
- `use-subagents-dynamic` — decide, split, launch, supervise, integrate, and clean bounded CLI subagent work.
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

Install all seven skills explicitly:

```sh
npx skills add maxedapps/agent-skills \
  --skill code-review \
  --skill create-plan \
  --skill create-skill \
  --skill implement-plan \
  --skill use-subagents \
  --skill use-subagents-dynamic \
  --skill web-research
```

Review each skill and its compatibility requirements before use. `code-review` and `implement-plan` strongly consider safe subagents for suitable bounded work and review. `create-plan` requires multiple exploration/research lanes and a fresh reviewer for non-trivial plans. Synthesis and acceptance stay with the parent. No catalog skill is a hard runtime dependency of another.

## Runtime and related skills

- **`use-subagents-dynamic` owns subagent coordination and runtime execution.** It decides and decomposes bounded work, then launches and supervises supported Pi, Claude Code, Codex, Grok, or Kimi CLI children through verified Herdr or standalone execution. It also integrates and cleans isolated worker worktrees. The dynamic skill requires Node, current authenticated CLIs, Git for workers, and macOS/Linux for standalone asynchronous control. Use legacy `use-subagents` only when the dynamic skill is unavailable; never load both.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs evidence-bound generic and plan-backed reviews. It strongly considers bounded read-only subagents for independent review dimensions, while the parent verifies evidence, consolidates handoffs, and owns final findings and verdicts.

### `create-plan`

Produces a fixed-structure Markdown implementation plan from multiple dedicated exploration/research subagents and a fresh independent reviewer. The parent verifies all evidence, rejects complexity creep, and asks the user when material decisions remain unclear.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `implement-plan`

Executes an existing Markdown plan in verified dependency-ready batches. It strongly considers bounded parallel subagent lanes, keeps integration and acceptance with the parent, reviews major boundaries and the full implementation, and queues doubtful complexity-increasing findings for human decisions.

### `use-subagents`

Provides legacy decision, decomposition, assignment, supervision, and verification guidance only when `use-subagents-dynamic` is unavailable. It must not co-activate with the dynamic skill.

### `use-subagents-dynamic`

Decides whether delegation helps, splits work into bounded scout, research, or worker lanes, and runs supported Pi, Claude Code, Codex, Grok, Kimi, and verified Herdr environments through one script. Readers remain read-only; workers receive isolated Git worktrees. The parent reviews and validates every result. Integration and cleanup are dry-run-first, ancestry-gated, non-force operations; unsafe or unverifiable resources are retained.

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
