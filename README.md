# Maxed Apps Agent Skills

## Available skills

- `awesome-tests` — plan, write, improve, and review behavior-focused automated tests and test strategies.
- `code-review` — perform adaptable generic, scoped, and plan-backed implementation reviews.
- `create-changes-report` — create an interactive HTML review artifact after repository changes.
- `decomplex` — prevent, audit, and triage unnecessary complexity without editing reviewed targets.
- `explain` — manually produce context-grounded Markdown explanations and standalone HTML that opens in the default browser unless suppressed.
- `create-plan` — create, review, and improve researched, implementation-ready plans before coding.
- `create-skill` — create, rewrite, and review concise, actionable Agent Skills.
- `create-slides` — build, verify and export templated HTML slide decks from five looks (PDF + MP4 at 1080p/2K/4K).
- `generate-image` — generate AI images through fal.ai HTTP queue workflows (Bun CLI; default `openai/gpt-image-2`).
- `implement-plan` — execute existing Markdown implementation plans with delegation-first tracking, verification, and a final changes report.
- `use-worktrees` — create, sync, merge, and clean up isolated Git worktrees safely.
- `use-subagents` — portable delegation policy, assignment contracts, worktree isolation/cleanup for any harness.
- `use-pi-subagents` — Pi RPC launcher for bounded subagents when native `subagent_*` tools are inactive (use with `use-subagents`).
- `use-mcp` — safely discover and call targeted MCP servers through mcporter with explicit authentication gates.
- `web-research` — perform current, source-backed research across web content and repositories.
- `vps-setup-hardening` — manually set up and harden Ubuntu 24.04/26.04 or AL2023 on EC2.

## Install

List all available skills:

```sh
npx skills add maxedapps/agent-skills --list
```

Install one skill:

```sh
npx skills add maxedapps/agent-skills@awesome-tests
npx skills add maxedapps/agent-skills@code-review
npx skills add maxedapps/agent-skills@create-changes-report
npx skills add maxedapps/agent-skills@use-mcp
npx skills add maxedapps/agent-skills@use-worktrees
npx skills add maxedapps/agent-skills@explain
npx skills add maxedapps/agent-skills@vps-setup-hardening
```

Or use the explicit option:

```sh
npx skills add maxedapps/agent-skills --skill awesome-tests
npx skills add maxedapps/agent-skills --skill code-review
npx skills add maxedapps/agent-skills --skill create-changes-report
npx skills add maxedapps/agent-skills --skill use-mcp
npx skills add maxedapps/agent-skills --skill use-worktrees
npx skills add maxedapps/agent-skills --skill explain
npx skills add maxedapps/agent-skills --skill vps-setup-hardening
```

Install all sixteen skills explicitly:

```sh
npx skills add maxedapps/agent-skills \
  --skill awesome-tests \
  --skill code-review \
  --skill create-changes-report \
  --skill decomplex \
  --skill explain \
  --skill create-plan \
  --skill create-skill \
  --skill create-slides \
  --skill generate-image \
  --skill implement-plan \
  --skill use-worktrees \
  --skill use-subagents \
  --skill use-pi-subagents \
  --skill use-mcp \
  --skill web-research \
  --skill vps-setup-hardening
```

Review each skill and its compatibility requirements before use. `code-review`, `create-plan`, and `implement-plan` **delegate by default** whenever a safe capability exists — not only for “hard” work. Parallelism changes scheduling only; synthesis, integration, dispositions, acceptance, cleanup, and user decisions stay with the parent. Material ambiguity and complexity-increasing review remedies escalate to the user rather than shaky assumptions. No catalog skill is a hard runtime dependency of another. Worktree isolate/integrate/remove policy is canonical in `use-subagents` and mandatory after lanes finish; harness launchers (e.g. `use-pi-subagents`) own only their runtime-state cleanup.

### Manual-only skills

These skills are never intended for automatic selection:

- `explain` — structured Markdown/HTML explanations with optional browser open
- `vps-setup-hardening` — production-impacting remote work with human authentication, independent access/exposure tests, provider firewall changes, access closure, and reboot approval gates

Invoke them explicitly after installation:

- Pi: `/skill:explain <subject>` or `/skill:vps-setup-hardening <target and preferences>`
- Claude Code: `/explain <subject>` or `/vps-setup-hardening <target and preferences>`
- Codex: `$explain <subject>` or `$vps-setup-hardening <target and preferences>`

Pi and Claude Code honor `disable-model-invocation: true`; Codex honors the bundled `policy.allow_implicit_invocation: false`. Other agents may ignore invocation-control metadata, so strict manual-only prevention is not claimed for them. Each skill also contains a defensive in-body stop rule.

## Runtime and related skills

- **`awesome-tests` works standalone and supports soft co-activation.** Use it directly for scoped test planning, authoring, repair, or review. It can co-activate with `create-plan` when a behavior-changing plan must specify tests or validation, and with `code-review` when changes materially affect tests or validation. The owning workflow retains artifact, finding, severity, matrix, report, and verdict authority. This is routing behavior, not a hard runtime dependency; all three skills remain independently useful.
- **`decomplex` is a soft integration.** It can provide focused advisory reports to `code-review`, `create-plan`, and `implement-plan` when installed and proportionate. It requires write access for one distinct `.reviews/<descriptive-slug>-decomplex.md` report but never edits reviewed targets. Each owning workflow retains its concise built-in gate and records an honest fallback when the skill or report write is unavailable.
- **`create-changes-report` is the repository-change completion artifact.** It runs after code, tests, configuration, schemas, or infrastructure changed and produces a verified standalone HTML review handoff. `implement-plan` explicitly invokes it after final checks when available and records the fallback when it is not installed.
- **`use-worktrees` owns direct worktree operations.** For delegated work, apply it together with `use-subagents`; the parent agent remains responsible for worktree creation, integration, and cleanup.
- **`use-subagents` is portable policy** (delegate-by-default, roles/assignment contract, worktrees/Git/cleanup) for any harness’s built-in tools, plugins, or CLIs. It does **not** depend on Pi.
- **`use-pi-subagents` is a Pi launcher only** — use it with `use-subagents` when native `subagent_*` tools are inactive. Never drive competing launchers for the same lane. Parent owns worktrees, Git, and workspace cleanup; Pi `clean` retires run state only. No unaccounted workflow-owned resources.
- **`agent-browser` remains external.** Install it from [skills.sh](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) when browser interaction or UI verification is needed:

  ```sh
  npx skills add vercel-labs/agent-browser@agent-browser
  ```

## What each skill does

### `awesome-tests`

Plans, writes, improves, and reviews behavior-focused automated tests and test strategies. It maps tests to observable behavior and material risk, selects the narrowest credible repository-conventional layer, checks failure sensitivity, determinism, and isolation, and assesses flaky, brittle, misleading, redundant, skipped, or false-green tests contextually rather than treating counts or coverage as quality gates.

### `code-review`

Evidence-bound generic and plan-backed reviews. Delegates read-only lanes by default; admits only material reachable findings; parent consolidates scores/verdicts. Supports focused closure rounds without reopening broad scope.

### `create-changes-report`

Creates a self-contained interactive HTML report after repository changes. The report provides a five-minute overview with drill-down evidence, architecture flow, verification commands and results, load-bearing code, calibrated findings, decisions, risks, and review guidance; mandatory light, dark, and popover browser checks verify the artifact before handoff.

### `decomplex`

Reviews proposed or existing source, plans, architecture, tests, configuration, dependencies, and review recommendations for evidenced unnecessary complexity. It supports Prevention, Audit, and Finding triage modes; writes one advisory `.reviews/` report; and never edits reviewed targets.

### `explain`

Manual-only. Produces concise, context-grounded Markdown plus polished standalone HTML for code, systems, and prior plans, reviews, or agent decisions. Explanations can use tables, syntax-highlighted code, and an optional Mermaid diagram. The Node 20+ renderer opens completed HTML in the default browser by default; pass `--no-open` for CI, tests, SSH/headless/remote work, or other contexts where browser side effects are inappropriate. After a one-time `npm ci --ignore-scripts --no-audit --no-fund` from the installed skill directory, generated HTML is standalone/offline and needs no server or network access.

### `create-plan`

Research → smallest plan → review → deliver. Delegates research/review by default; asks the user instead of shaky assumptions; writes a lean `.plans/` handoff with bullet task changes and exact verify steps.

### `create-skill`

Creates, rewrites, reviews, and evidence-backed improves Agent Skills with literal activation routing, concise execution contracts, progressive disclosure, exact resources, trigger/near-miss evaluation, and representative output checks. It includes a placeholder-safe starter and quality checklist.

### `create-slides`

Creates and materially redesigns polished, dependency-free HTML slide decks (vanilla HTML/CSS/JS) from five templates — `dark-marker`, `light-editorial`, `midnight-tech`, `bold-keynote`, `minimal-mono` — that share one archetype vocabulary, five named reveal presets, a cross-slide title morph, and runtime **plus composition** QA. Art-direction intake asks for the look, delivery mode, reveal model and density. Decks open from a local `index.html` with no server, build step, or network access; PDF and MP4 export (1080p/2K/4K, reveals optionally timed to a caption track) need Node, Chrome and ffmpeg.

### `generate-image`

Generates AI images through fal.ai via a small Bun HTTP/queue CLI. Defaults to `openai/gpt-image-2`, uses `FAL_KEY`, and downloads result files locally for inspection.

### `implement-plan`

Maps a plan to tracker tasks/subtasks, then runs a delegated loop per item: analyze → implement → check → review → fix until clear → cleanup → next. Subagents by default (built-in, plugins, or skills) under `use-subagents` policy. Parent owns tracker, integration, dispositions, acceptance, and mandatory worktree/runtime cleanup. After final checks, changed repositories receive a `create-changes-report` HTML review handoff when that skill is available.

### `use-worktrees`

Creates isolated worktrees under `~/worktrees/<project>/<branch>`, keeps their branches synchronized from the target branch, and runs repository checks after merges. It merges back only on explicit user request, verifies the final diff and push, and removes the worktree and branch only after successful integration.

### `use-subagents`

Harness-agnostic subagent playbook: delegate-by-default, scout/research/worker profiles, assignment contract, worktree isolate/integrate/remove, mandatory cleanup, supervision, and parent verification. Works with whatever launcher the host provides. No dependency on `use-pi-subagents`.

### `use-pi-subagents`

Pi RPC launcher (`scripts/subagents.mjs`) when native `subagent_*` tools are inactive. **Complements** `use-subagents` (policy) rather than replacing it. Parent supplies cwd/worktrees, verifies, integrates, removes safe workspaces per policy, then runs script `clean` for Pi run state only. Retains and reports unsafe/unknown resources.

### `use-mcp`

Uses mcporter as a narrow adapter for configured or ad-hoc MCP servers. It discovers only the requested server and tool, prefers structured calls and cached credentials, treats MCP definitions/results as untrusted, requires approval before OAuth persistence or unfamiliar stdio execution, and documents mcporter's plaintext file-backed credential storage. Requires mcporter 0.13.3+ on `PATH`.

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

`skills-ref` 0.1.5 reports `disable-model-invocation` as an unexpected field even though current Pi and Claude Code support it. For manual-only skills (`explain`, `vps-setup-hardening`), retain that required safety field and treat only that exact diagnostic as a known external-validator limitation; all other diagnostics remain failures.

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
