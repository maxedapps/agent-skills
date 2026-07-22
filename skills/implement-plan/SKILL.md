---
name: implement-plan
description: >-
  Implements existing Markdown plans exhaustively through orchestrator-led
  delegated batches, active validation, and iterative independent review closure.
  Use this skill when asked to implement, execute, carry out, or continue an
  existing plan. Do not use for creating a plan from scratch or only reviewing a
  plan without implementing it.
license: MIT
compatibility: >-
  Requires project write access. Delegation requires a safely available
  capability, isolated concurrent writers, terminal handoffs, and parent
  verification. Browser-visible work requires browser automation.
metadata:
  short-description: Orchestrate delegated plan implementation and review closure
---

# Implement Plan

## Non-negotiable contract

Follow higher-priority constraints. After the startup gate:

- Cover every actionable plan requirement with independently verifiable tracker rows.
- Keep implementation centered on the user’s requested outcome and the plan’s required behavior. Discovery and review do not authorize adjacent improvements or broader scope.
- Before adding code, abstractions, tests, safeguards, or follow-up work, ask whether it is necessary now and whether a simpler change would suffice. Omit or simplify it when not justified.
- Avoid unjustified complexity; preserve necessary correctness, safety, compatibility, and operability. If materially unsure, ask the user.
- **The parent orchestrates; delegate every bounded non-trivial research, source implementation, test-authoring, accepted remediation, and review unit when a safe capability exists.** Parent execution is limited to the recorded exceptions below.
- Keep the tracker parent-owned and single-writer whenever lanes run or may resume concurrently.
- Treat child handoffs as evidence, never acceptance. The parent inspects every diff, verifies claims, integrates, and tests.
- Continue through dependency-ready work without asking unless a human decision is required.
- Close every required review checkpoint through independent review, parent disposition, remediation or validation, and focused re-review. Reviewer approval is evidence, never authority.
- Claim completion only after full-plan reconciliation, validation, and final review closure. Open work means `Partial` or `Blocked`, never `Complete`.

## Mandatory startup gate

Before source edits or delegated implementation launches:

1. Read the complete user-provided plan; continue by offset if truncated.
2. **Load [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md) with the file-reading tool.** Memory or a citation does not count.
3. Select exactly one runtime path: active native `subagent_*` tools plus their runtime skill; otherwise `use-subagents-dynamic`; otherwise generic `use-subagents` with the host's actual safe capability. Never co-activate competing runtime adapters.
4. Copy/adapt the tracker into the plan's `Implementation Progress`, or retain a separate tracker if the plan cannot be edited.
5. Populate plan coverage and record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
6. Dispatch each ready bounded non-trivial unit before any parent source edit. If no safe writer exists, apply the exceptions below; do not default to parent implementation.

On resume, repeat steps 1–6 and reconcile current state before editing. If the template cannot be loaded, stop; do not fabricate evidence.

When the dynamic Pi RPC runtime is selected, the parent chooses or creates each writer cwd, passes it as `--cwd`, stops the child before any Git operation on that cwd, inspects/integrates/validates through normal parent controls, and cleans runtime state separately from workspace cleanup. The runtime never creates, integrates, or removes worktrees/branches.

## Execute in verified batches

1. **Inventory:** map implementation, migration, cleanup, docs, rollout, and required validation to stable rows with plan references, dependencies, and acceptance evidence. Split opaque compound rows.
2. **Select:** enumerate dependency-ready rows. Define the batch's scope, risks, rollback/cleanup, checks, and join point.
3. **Prevent new complexity:** before the batch, run `decomplex` in Prevention mode only when it introduces or materially expands architecture, abstractions, dependencies, configuration, concurrency, caches/queues/retries, compatibility/fallback layers, broad test machinery, or operational safeguards. Otherwise apply the built-in gate without creating a disproportionate report.
4. **Assign:** delegate every bounded non-trivial ready unit before parent source edits. Record owner, ownership boundary, isolation, overlap, join, and review checkpoint; for a parent exception, record the exact allowed rationale.
5. **Implement:** stay within assigned ownership. Record deviations immediately.
6. **Verify:** parent-inspect diffs and claims; run targeted behavior tests plus applicable test, lint, typecheck, build, migration, and browser/manual checks.
7. **Update:** record concise evidence. Mark rows `Verified`, `Blocked`, or ready for another batch; then repeat.

A prevention report is advisory and does not create tracker work. The parent dispositions its recommendations before changing batch scope, preserving evidenced boundaries and safeguards. If `decomplex` is unavailable or its required report write is prohibited, use the existing parent gate and record the fallback and independence/confidence limit in the batch's existing evidence fields; never claim the pass ran.

`Verified` requires task-specific evidence. `Descoped` requires explicit user approval and rationale. A phase is complete only when all child rows are `Verified` or approved `Descoped`.

## Delegation and scheduling

Use only the runtime path selected at startup. Delegate with bounded ownership, explicit acceptance evidence, and no unsafe overlap. Cap fan-out at the lanes the parent can promptly inspect, integrate, and verify; parallelism is a scheduling choice, never an eligibility gate.

| Delegate | Parent-owned |
|---|---|
| Bounded non-trivial inventory/research, source implementation, test authoring, accepted remediation, and independent review | Framing, decomposition, tracker writes, synthesis, integration/conflict resolution, finding dispositions, focused acceptance reruns, cleanup decisions, and user communication |
| Independent units in isolated parallel lanes when useful | Genuinely atomic mechanics with no research or behavior change |
| Coupled, overlapping, or dependent behavior as one coherent blocking/awaited worker | Explicit user prohibition or an unavailable/unsafe capability |

A busy single-writer or one-worktree capacity is transient: wait for it, verify/integrate the result, then dispatch the dependent worker. Speed, warm context, coordination overhead, coupling, rapid iteration, verification cost, or lack of parallelism never justify parent source implementation. Required non-trivial work with no safe capability is blocked or escalated to the user.

Concurrent writers require isolated worktrees and non-overlapping file/domain ownership. Writers sharing a checkout run sequentially. Do not mutate overlapping code during an active writer or checkpoint review.

For each delegated run:

- grant least privilege and provide only task-relevant plan/tracker rows, constraints, starting files, acceptance criteria, and checks;
- require a concise terminal handoff with run identity, files read/changed, decisions, exact check results, skips, risks, blockers, remaining work, and durable evidence pointers—not reasoning or raw transcripts;
- resolve terminal state before its join point;
- parent-inspect the full diff, spot-check claims, perform Git integration yourself, rerun task-specific and applicable repository checks, stop children before mutating their cwd, then clean runtime state and only parent-owned workspaces/artifacts without losing owner work.

## Validation and safety

- Add or update valuable tests for acceptance behavior, regressions, integration/failure paths, edge cases, and security/data invariants. Avoid count-only, duplicated, over-mocked, or implementation-detail tests.
- For browser-visible changes, read `agent-browser` and manually verify in a real browser unless impossible or explicitly excluded; record skips and confidence limits.
- For uncertain current third-party behavior, read `web-research` and use version-specific sources.
- Do not install missing validation tools without authorization. Record unavailable gates and impact.
- Ask only for approvals, material ambiguity, credentials/access, destructive or production actions, or unresolved repeated failure.
- On interruption, record exact states, retained resources, and restart point. Never discard unrelated or owner work.

## Review checkpoints

Commission a read-only reviewer set applying `code-review` after every major coherent implementation boundary and for final full-plan review. Also honor plan-authored checkpoints. A boundary is major because it crosses or completes an integration, migration, public contract, security/data invariant, risky dependency, or delivery milestone—not because of row count.

Initial reviewers at a checkpoint must be fresh and independent: do not share their conclusions before handoff. One reviewer may cover a bounded checkpoint; use complementary reviewers when breadth, risk, or specialist depth justifies them. Deduplicate overlapping assignments and cap the set at what the parent can promptly verify. Do not add or replace reviewers merely to seek agreement. Use direct parent review only when independent review is unavailable or unsafe, user-prohibited, or genuinely disproportionate; record the reason and independence limit.

Give reviewers the plan/tracker, covered IDs, assigned scope and dimensions, relevant diff/contracts/tests, validation/manual evidence, skips, deviations, risks, and non-goals. Require read-only work and prohibit recursive delegation. For final review, require plan-backed full scope across the reviewer set. Preserve the `code-review` authority matrix and separate baseline, compliance, quality, and validation verdicts when that contract requires them.

Require each reviewer to return one explicit checkpoint state: `Clear`, `Changes required`, `Human decision required`, or `Blocked`, with stable finding IDs. `Clear` means no unresolved material concern in assigned scope after considering parent and user evidence, not acceptance of every recommendation. A reviewer with an open finding owns its focused follow-up when safely available; otherwise use a replacement with the complete finding lineage and record the continuity limit.

### Close each checkpoint iteratively

1. Collect all initial handoffs before sharing reviewer conclusions.
2. Parent-verify, deduplicate by root cause, and disposition every finding.
3. Delegate each accepted non-trivial remediation or validation unit; implement only accepted findings, rerun affected checks, and record the material delta.
4. Return fixes, evidence, and disputed dispositions to only the reviewers with open findings. Follow-ups cover those findings, directly affected boundaries, validation, and fix-caused or fix-exposed regressions—not a reopened broad search.
5. Repeat parent disposition, bounded remediation or validation, and focused re-review while any reviewer reports a material concern.
6. Close only when every commissioned reviewer is `Clear` and no material validation gap remains. A user decision is an authoritative evidence delta: return it to affected reviewers for closure rather than treating it as a substitute for reviewer clearance.

A follow-up may admit a new finding only when the remediation caused or exposed it or it is material to an affected boundary. Surface unrelated pre-existing issues separately; they do not silently expand plan scope. Do not rerun a reviewer without a material code, evidence, or human-decision delta.

### Disposition every finding

The parent must critically evaluate **every** reviewer finding and decomplex recommendation for authority, evidence, reachability, impact, existing safeguards, simpler alternatives, plan scope, proportional regression and maintenance cost, and whether a user decision is required. Record exactly one authoritative disposition:

| Disposition | Use when |
|---|---|
| **Fix now** | Valid, in scope, proportionate, and low risk; implement the smallest safe remedy and rerun affected checks. |
| **Validate** | Plausible but evidence is insufficient; run a bounded check before deciding. |
| **Reject** | Incorrect, unreachable, out of scope, unnecessary, or disproportionate; record evidence and return it to the reviewer. |
| **Human decision** | Material uncertainty, reviewer disagreement, or a required scope, architecture, security, compatibility, or risk choice cannot be resolved safely. |
| **Block** | Material and unresolved; overlapping work or completion cannot safely continue. |

Reviewer findings and decomplex advice never create tracker work automatically. Before implementing a reviewer remedy that would add meaningful complexity or broaden scope, use `decomplex` Finding triage when available and proportionate; otherwise apply the built-in gate and record the fallback. Preserve original finding IDs, separate a valid defect from an overbuilt proposed remedy, and prefer the smallest behavior-preserving correction. Map decomplex `Ask user` to `Human decision` only when the unresolved choice is material.

Send evidence-backed rejections back for reviewer closure. If the reviewer sustains a material concern, or the parent is materially unsure, ask the user rather than silently overruling it or shopping for another reviewer. After two unsuccessful remediation rounds for the same root cause, recurrence after a claimed fix, or a round with no meaningful progress, pause autonomous iteration and ask the user with evidence and options. This pauses the loop; it never permits false completion. Do not add speculative abstractions, compatibility layers, safeguards, or test machinery merely to satisfy review.

## Final reconciliation

1. Reread the complete original plan line by line; add and execute any missed row.
2. Confirm no row is `Pending`, `In progress`, or `Blocked`; verify approved descopes and all evidence.
3. Review the diff task by task and remove changes whose scope or complexity is not justified by the assigned outcome.
4. Run final targeted and repository-wide checks, required browser/manual validation, and safe cleanup.
5. Run the final checkpoint through the review-closure loop with a fresh plan-backed full reviewer set. When available and proportionate, include a `decomplex` Audit of complexity introduced by the current implementation diff—not unrelated legacy cleanup—and disposition every recommendation; otherwise record the fallback and independence limit.
6. If review-driven remediation materially changes complexity, rerun a scoped decomplex Audit before closure. If audit-driven remediation changes implementation, rerun affected validation and reviewer follow-ups. Continue until the final checkpoint closes or requires a human decision.
7. Present the human-decision queue. Any unresolved material issue remains `Blocked`; only evidence-backed unrelated pre-existing failures may be caveats.
8. Update the tracker and rerun checks covering it when tracked.

## Final response

Report plan/tracker paths; truthful status and row counts; remaining IDs; batches, delegated runs, and parent-owned rationales; exact automated/browser/manual evidence and skips; review IDs and every disposition; human decisions, deviations, caveats, cleanup, and retained resources.
