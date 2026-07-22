# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `decomplex` — prevent, audit, and triage unnecessary complexity without editing reviewed targets.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `create-skill` — create, rewrite, and review concise, actionable Agent Skills.
- `implement-plan` — execute existing Markdown implementation plans with delegation-first tracking and verification.
- `use-subagents` — provide legacy delegation guidance only when the dynamic skill is unavailable.
- `use-subagents-dynamic` — decide, split, launch, supervise, integrate, and clean bounded CLI subagent work.
- `web-research` — perform current, source-backed research across web content and repositories.
- `vps-setup-hardening` — manually run a safety-gated Linux VPS setup and hardening workflow.

## Install

List all available skills:

```sh
npx skills add maxedapps/agent-skills --list
```

Install one skill:

```sh
npx skills add maxedapps/agent-skills@code-review
npx skills add maxedapps/agent-skills@vps-setup-hardening
```

Or use the explicit option:

```sh
npx skills add maxedapps/agent-skills --skill code-review
npx skills add maxedapps/agent-skills --skill vps-setup-hardening
```

Install all nine skills explicitly:

```sh
npx skills add maxedapps/agent-skills \
  --skill code-review \
  --skill decomplex \
  --skill create-plan \
  --skill create-skill \
  --skill implement-plan \
  --skill use-subagents \
  --skill use-subagents-dynamic \
  --skill web-research \
  --skill vps-setup-hardening
```

Review each skill and its compatibility requirements before use. `code-review`, `create-plan`, and `implement-plan` use safe subagents when bounded exploration or independent review is proportionate. Synthesis and acceptance stay with the parent. No catalog skill is a hard runtime dependency of another.

### Manual-only VPS skill

`vps-setup-hardening` performs production-impacting remote work and pauses for human authentication, independent access/exposure tests, provider firewall changes, access closure, and reboot approval. It is never intended for automatic selection.

Invoke it explicitly after installation:

- Pi: `/skill:vps-setup-hardening <target and preferences>`
- Claude Code: `/vps-setup-hardening <target and preferences>`
- Codex: `$vps-setup-hardening <target and preferences>`

Pi and Claude Code honor `disable-model-invocation: true`; Codex honors the bundled `policy.allow_implicit_invocation: false`. Other agents may ignore invocation-control metadata, so strict manual-only prevention is not claimed for them. The skill also contains a defensive in-body stop rule.

## Runtime and related skills

- **`decomplex` is a soft integration.** It can provide focused advisory reports to `code-review`, `create-plan`, and `implement-plan` when installed and proportionate. It requires write access for one distinct `.reviews/<descriptive-slug>-decomplex.md` report but never edits reviewed targets. Each owning workflow retains its concise built-in gate and records an honest fallback when the skill or report write is unavailable.
- **`use-subagents-dynamic` owns subagent coordination and runtime execution.** It decides and decomposes bounded work, then launches and supervises supported Pi, Claude Code, Codex, Grok, or Kimi CLI children through verified Herdr or standalone execution. It also integrates and cleans isolated worker worktrees. The dynamic skill requires Node, current authenticated CLIs, Git for workers, and macOS/Linux for standalone asynchronous control. Use legacy `use-subagents` only when the dynamic skill is unavailable; never load both.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Performs evidence-bound generic and plan-backed reviews. It strongly considers bounded read-only subagents for independent review dimensions, while the parent verifies evidence, consolidates handoffs, and owns final findings and verdicts. Owning workflows may request focused closure rounds that preserve finding lineage without reopening broad scope.

### `decomplex`

Reviews proposed or existing source, plans, architecture, tests, configuration, dependencies, and review recommendations for evidenced unnecessary complexity. It supports Prevention, Audit, and Finding triage modes; writes one advisory `.reviews/` report; and never edits reviewed targets.

### `create-plan`

Produces a lean Markdown implementation handoff with key planning files, material evidence and decisions, stable tasks, and observable acceptance checks. Exploration and independent review are proportionate; synthesis and acceptance stay with the parent.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `implement-plan`

Executes an existing Markdown plan in verified dependency-ready batches. It strongly considers bounded parallel implementation lanes, keeps integration and acceptance with the parent, and iteratively closes independent reviews at major boundaries and across the full implementation. The parent evidence-gates every finding, uses decomplex for complexity-increasing remedies, and asks the human when material uncertainty or reviewer disagreement remains.

### `use-subagents`

Provides legacy decision, decomposition, assignment, supervision, and verification guidance only when `use-subagents-dynamic` is unavailable. It must not co-activate with the dynamic skill.

### `use-subagents-dynamic`

Decides whether delegation helps, splits work into bounded scout, research, or worker lanes, and runs supported Pi, Claude Code, Codex, Grok, Kimi, and verified Herdr environments through one script. Readers remain read-only; workers receive isolated Git worktrees. The parent reviews and validates every result. Integration and cleanup are dry-run-first, ancestry-gated, non-force operations; unsafe or unverifiable resources are retained.

### `web-research`

Researches current web and external technical information with available search, retrieval, repository, document, media, and browser capabilities. It favors official, version-matched evidence; small direct lookups can remain artifact-free, while substantive or conflicting research retains progress memory.

### `vps-setup-hardening`

Turns a fresh supported Linux VPS into a verified baseline through inspection-first changes, named key-only administration, optional Tailscale, provider- or host-filtered ingress, optional Docker and Node.js, independent exposure tests, reboot approval, and a concise evidence-qualified report. It is manual-only and preserves the current access path until a replacement is proven.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` file and optional `references/`, `assets/`, and `scripts/` resources.

## Validate

```sh
for d in skills/*; do
  [ -d "$d" ] && npx -y skills-ref validate "$d"
done
```

`skills-ref` 0.1.5 reports `disable-model-invocation` as an unexpected field even though current Pi and Claude Code support it. For `vps-setup-hardening`, retain that required safety field and treat only that exact diagnostic as a known external-validator limitation; all other diagnostics remain failures.

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
