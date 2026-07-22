---
name: create-plan
description: >-
  Creates, reviews, and improves lean implementation plans through orchestrated
  research, evidence-backed synthesis, and iterative independent review closure.
  Use this skill when the user asks to plan a feature or change, create an
  implementation handoff, or review or improve an unimplemented plan before
  coding. Do not use to implement a plan, audit completed implementation against
  a plan, or answer a small conceptual question that needs no implementation handoff.
license: MIT
compatibility: >-
  Requires project file access. Saving requires write access. Current external
  research requires suitable retrieval access. Delegation and independent review
  require a safely available subagent capability.
metadata:
  short-description: Create lean plans through orchestrated research and review
---

# Create Plan

## Hard rules

- **Plan only** — never implement.
- Allowed writes: `.plans/<kebab-name>.md`, and `.reviews/*-decomplex.md` when needed.
- Evidence-backed. Smallest design. No speculative scope.
- **Ask user** on material ambiguity (scope/behavior/architecture/migration/risk/complexity). No shaky assumptions.
- **Delegate by default** for research and review when safe. “Small/easy” ≠ skip subagents.
- Leverage subagents — built-in, extensions/plugins, or skills. Follow `use-subagents` policy; use native subagents, extensions / plugins, or other skills
- Main agent owns synthesis, plan writes, dispositions, delivery.
- Child/reviewer output = evidence, never acceptance. Findings never auto-enter the plan.
- Prefer simpler fixes. Stuck review (2 failed rounds / recurrence / no progress) → ask user.

### Load or stop

- Before draft: read [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md).
- Before finalize (and after material edits): read [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md).
- Missing resources → stop. Don’t invent substitutes.

### Tasks must have

- Stable IDs
- **Change** as bullets (one concrete edit/behavior each)
- Starts-at paths/symbols (non-exhaustive)
- Exact verify commands + expected signals
- Tests with the behavior they protect
- Omit empty optionals
- Key files table: path · why · plan impact

## Sequence

1. **Frame** — request, repo instructions, existing plans → outcome, scope, non-goals, risks, validation. Don’t deep-explore in parent when a research lane can.
2. **Load template.**
3. **Research** — enumerate questions; **delegate by default** (one question/scope/stop per lane). External only if decision-relevant. Verify critical claims.
4. **Resolve gates** — still ambiguous? **ask user** before drafting as fact.
5. **Synthesize** — smallest approach; map findings → decisions/tasks/checks/non-goals/gates; drop fluff.
6. **Draft** — adapt template; flat tasks default; phases only for real boundaries; no review ledgers in the handoff.
7. **Complexity** — structural draft → `decomplex` Prevention if available, else built-in gate. Complexity-increasing accept → triage; doubt → ask user.
8. **Review** — consequential plans: delegate fresh independent reviewers → disposition (`Accept`/`Validate`/`Reject`/`Ask user`/`Block`) → revise → re-review until `Clear`. Small/unavailable: parent checklist + independence limit.
9. **Checklist → deliver** — save under `.plans/` (or chat + no-write reason). Report path, gates, decisions, fallbacks, risks.

## Stop

- Missing template/checklist → stop
- Required research/review unsafe/unavailable → block/escalate
- Persistent disagreement or uncertainty → ask user
