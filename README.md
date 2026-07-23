# Maxed Apps Agent Skills

## Available skills

- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `decomplex` — prevent, audit, and triage unnecessary complexity without editing reviewed targets.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `create-skill` — create, rewrite, and review concise, actionable Agent Skills.
- `create-slides` — create polished, dependency-free HTML slide decks from a tested stepped-reveal starter.
- `implement-plan` — execute existing Markdown implementation plans with delegation-first tracking and verification.
- `use-subagents` — portable delegation policy, assignment contracts, worktree isolation/cleanup for any harness.
- `use-pi-subagents` — Pi RPC launcher for bounded subagents when native `subagent_*` tools are inactive (use with `use-subagents`).
- `web-research` — perform current, source-backed research across web content and repositories.
- `vps-setup-hardening` — manually set up and harden Ubuntu 24.04/26.04 or AL2023 on EC2.

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

Install all ten skills explicitly:

```sh
npx skills add maxedapps/agent-skills \
  --skill code-review \
  --skill decomplex \
  --skill create-plan \
  --skill create-skill \
  --skill create-slides \
  --skill implement-plan \
  --skill use-subagents \
  --skill use-pi-subagents \
  --skill web-research \
  --skill vps-setup-hardening
```

Review each skill and its compatibility requirements before use. `code-review`, `create-plan`, and `implement-plan` **delegate by default** whenever a safe capability exists — not only for “hard” work. Parallelism changes scheduling only; synthesis, integration, dispositions, acceptance, cleanup, and user decisions stay with the parent. Material ambiguity and complexity-increasing review remedies escalate to the user rather than shaky assumptions. No catalog skill is a hard runtime dependency of another. Worktree isolate/integrate/remove policy is canonical in `use-subagents` and mandatory after lanes finish; harness launchers (e.g. `use-pi-subagents`) own only their runtime-state cleanup.

### Manual-only VPS skill

`vps-setup-hardening` performs production-impacting remote work and pauses for human authentication, independent access/exposure tests, provider firewall changes, access closure, and reboot approval. It is never intended for automatic selection.

Invoke it explicitly after installation:

- Pi: `/skill:vps-setup-hardening <target and preferences>`
- Claude Code: `/vps-setup-hardening <target and preferences>`
- Codex: `$vps-setup-hardening <target and preferences>`

Pi and Claude Code honor `disable-model-invocation: true`; Codex honors the bundled `policy.allow_implicit_invocation: false`. Other agents may ignore invocation-control metadata, so strict manual-only prevention is not claimed for them. The skill also contains a defensive in-body stop rule.

## Runtime and related skills

- **`decomplex` is a soft integration.** It can provide focused advisory reports to `code-review`, `create-plan`, and `implement-plan` when installed and proportionate. It requires write access for one distinct `.reviews/<descriptive-slug>-decomplex.md` report but never edits reviewed targets. Each owning workflow retains its concise built-in gate and records an honest fallback when the skill or report write is unavailable.
- **`use-subagents` is portable policy** (delegate-by-default, roles/assignment contract, worktrees/Git/cleanup) for any harness’s built-in tools, plugins, or CLIs. It does **not** depend on Pi.
- **`use-pi-subagents` is a Pi launcher only** — use it with `use-subagents` when native `subagent_*` tools are inactive. Never drive competing launchers for the same lane. Parent owns worktrees, Git, and workspace cleanup; Pi `clean` retires run state only. No unaccounted workflow-owned resources.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `code-review`

Evidence-bound generic and plan-backed reviews. Delegates read-only lanes by default; admits only material reachable findings; parent consolidates scores/verdicts. Supports focused closure rounds without reopening broad scope.

### `decomplex`

Reviews proposed or existing source, plans, architecture, tests, configuration, dependencies, and review recommendations for evidenced unnecessary complexity. It supports Prevention, Audit, and Finding triage modes; writes one advisory `.reviews/` report; and never edits reviewed targets.

### `create-plan`

Research → smallest plan → review → deliver. Delegates research/review by default; asks the user instead of shaky assumptions; writes a lean `.plans/` handoff with bullet task changes and exact verify steps.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `create-slides`

Creates and materially redesigns polished, dependency-free HTML slide decks (vanilla HTML/CSS/JS) from a tested stepped-reveal starter, with optional themes, art-direction intake (cover vs content layout contracts, reveal model, density), and runtime **plus composition** QA. Decks open from a local `index.html` with no server, build step, or network access; validation requires a browser or browser-automation capability.

### `implement-plan`

Maps a plan to tracker tasks/subtasks, then runs a delegated loop per item: analyze → implement → check → review → fix until clear → cleanup → next. Subagents by default (built-in, plugins, or skills) under `use-subagents` policy. Parent owns tracker, integration, dispositions, acceptance, and mandatory worktree/runtime cleanup.

### `use-subagents`

Harness-agnostic subagent playbook: delegate-by-default, scout/research/worker profiles, assignment contract, worktree isolate/integrate/remove, mandatory cleanup, supervision, and parent verification. Works with whatever launcher the host provides. No dependency on `use-pi-subagents`.

### `use-pi-subagents`

Pi RPC launcher (`scripts/subagents.mjs`) when native `subagent_*` tools are inactive. **Complements** `use-subagents` (policy) rather than replacing it. Parent supplies cwd/worktrees, verifies, integrates, removes safe workspaces per policy, then runs script `clean` for Pi run state only. Retains and reports unsafe/unknown resources.

### `web-research`

Researches current web and external technical information with available search, retrieval, repository, document, media, and browser capabilities. It favors official, version-matched evidence; small direct lookups can remain artifact-free, while substantive or conflicting research retains progress memory.

### `vps-setup-hardening`

Turns a fresh Ubuntu 24.04/26.04 or Amazon Linux 2023 EC2 host into a verified baseline through inspection-first changes, named key-only administration, optional Tailscale, UFW or provider/Security Group ingress, optional Docker and Node.js, independent exposure tests, reboot approval, and a concise evidence-qualified report. It is manual-only and preserves the current access path until a replacement is proven.

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
