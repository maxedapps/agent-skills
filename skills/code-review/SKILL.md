---
name: code-review
description: >-
  Reviews repository diffs, PRs, codebases, and completed implementations for
  material, evidence-backed defects and plan compliance. Use this skill when
  asked to review, audit, critique, find code issues, or evaluate implemented
  plan work. Do not use for draft-plan review or implementation unless fixes are
  explicitly requested.
license: MIT
metadata:
  short-description: Adaptable generic and plan-backed implementation review
---

# Code Review

## Instruction precedence

Perform a thorough, in-depth code review EITHER according to the user task (or as inferred from the context) OR based on the below dimensions and requirements.

If scope is unclear, ask! Do NOT widen or expand scope. Stick to the task and provided information.

## Required conditional resources

- If dimensions were not specified, **before a broad/all-dimensions review or an in-depth review of any requested dimension, read [`references/review-dimensions.md`](references/review-dimensions.md)** for the complete correctness, simplicity, typing, library, security, performance, test, compatibility/data/ops, package, accessibility, UX, and runtime heuristics.
- **Before reviewing implementation against a plan, tracker, design, acceptance criteria, or other authority source, read [`references/plan-backed-review.md`](references/plan-backed-review.md)** for authority precedence, traceability, statuses, and verdicts.
- **Before writing a standalone report, load [`assets/review-report-template.md`](assets/review-report-template.md)** and adapt its conditional sections.
- For an explicit complexity-focused review or an in-depth simplicity/over-engineering dimension, use `decomplex` when it is available, proportionate, and its distinct report write is permitted. Ordinary reviews do not require it and retain the simplicity fallback in `references/review-dimensions.md`.

## Output Format

- Follow provided instructions regarding the output format
- If unclear or unspecified, you MUST create a review report `.md` file (stored in local `.reviews` folder)

## Output constraints

Explicit chat-only, handoff-only, or no-write constraints are provided output instructions. They suppress report creation unless the user explicitly exempts a report. Otherwise, use `.reviews/<review-slug>.md` when no report path was supplied. Because `decomplex` requires its own report, use the built-in fallback under these constraints unless that distinct report is explicitly permitted; never claim the focused pass ran when it did not.

## Finding contract

Review in depth; report selectively. A detected weakness is a candidate, not a finding.

- For each candidate, assess the concrete failure, realistic reachability in this project, practical impact, existing safeguards, and fix cost. Admit it only when action is justified now.
- Omit technically real but niche, low-impact, hypothetical, adequately mitigated, or disproportionate candidates. Do not move them to caveats or next steps.
- Report a **context-dependent concern** separately only when it would be material under a named realistic condition whose applicability cannot be established. State that no action is needed if the condition is absent.
- “No material findings” is a valid result. Never invent a finding to demonstrate review depth.

| Score | Meaning |
|---|---|
| `S4 Critical` | Catastrophic security, data, or availability impact. |
| `S3 High` | Major core-path user/operator impact. |
| `S2 Medium` | Meaningful impact on a realistic path. |
| `S1 Low` | Minor, nonblocking impact. |
| `S0 Optional` | Polish or preference. |
| `C3 Confirmed` | Direct code, runtime, test, or repro evidence. |
| `C2 Supported` | Evidence-backed path, not reproduced. |
| `C1 Tentative` | Plausible; not a finding until validated. |

Score only admitted findings. Record both scores, location/authority, evidence, path, impact, and smallest safe fix/validation. `NEEDS RUNTIME VALIDATION` is an action flag, not permission to report speculation.

Deduplicate root causes. By default, report every `S4`, at most five additional material `S3`/`S2`, and no `S1`/`S0`. The limit is a ceiling, not a target. Replace material overflow with one blocking `not review-ready` caveat: highest severity, areas, aggregate impact, evidence, and known count/lower bound. The owner controls the backlog.

`code-review` remains authoritative for admitted defects, severity/confidence scores, finding limits, plan compliance matrices, and the four plan-backed verdicts. A distinct `decomplex` report is advisory potential-complexity evidence only. Inspect and disposition every recommendation before admitting any material consequence as a code-review finding or next step; do not copy recommendations automatically or merge the two finding contracts.

Default standalone work to one initial review and one accepted-fix follow-up. An owning workflow may request additional focused closure rounds while material concerns remain. Preserve finding IDs and inspect only accepted fixes, disputed dispositions and evidence, directly affected boundaries, validation, and fix-caused or fix-exposed regressions; do not reopen broad search. Require a material code, evidence, or human-decision delta between rounds. Return one explicit closure state: `Clear`, `Changes required`, `Human decision required`, or `Blocked`. Surface unrelated incidental severe issues separately rather than silently expanding scope.

## Review and worktree rules

- Read targets, callers, tests, config, docs, and nearby patterns in full. Record partial/skipped generated, vendor, lock, or oversized content and its confidence limit.
- Preserve owner state. Never checkout, restore, stash, clean, or overwrite it. Treat package/check commands that can rewrite tracked or install state as mutating. Snapshot first; reverse only review-created changes.
- Do not edit source unless asked. A report permits only that artifact.
- Judge protected behavior, not test counts: contracts, regressions, invariants, integrations, key paths, and material boundaries.
- Confirm serious suspicions with checks or assertion-based repros. Record skips; delete temporary artifacts.
- Plan-backed reviews require every applicable matrix row, exact statuses, and four separate verdicts from [`references/plan-backed-review.md`](references/plan-backed-review.md).

## Bounded review lanes

For broad targets or several deep dimensions, **you must consider bounded read-only subagents** when lane splitting adds independent coverage or specialist depth.

| Example lane | Pair when useful |
|---|---|
| Correctness + typing | Integration boundaries |
| Security | Data safety |
| Tests + runtime/UI | Accessibility + UX |
| Packages + compatibility | Config + CI + operations |
| Authority + matrix evidence | Implementation quality |

Keep work in the parent when scope is narrow, evidence is coupled, coordination costs more than it adds, or delegation is unavailable. Give children exact boundaries, dimensions, read-only permission, evidence format, and stop condition. Require locations, checks, limitations, and candidates; prohibit edits and recursive delegation.

The parent must inspect every handoff. Require the same candidate gate and permit “no material findings.” Preserve unique material evidence, limitations, and disagreements. Verify admitted claims, then consolidate and limit findings. Only the parent assigns final findings, scores, statuses, and verdicts.

## Workflow

1. Evaluate the task and context to decide on the review scope and strictness. Ask for clarification if needed. 
2. Load conditional resources. Fix boundaries, dimensions, authority, validation, writes, and output.
3. Inspect status, diffs, targets, callers, tests, config, docs, migrations, environment, CI, and nearby patterns.
4. Cover selected dimensions thoroughly and collect candidate defects. For plan-backed work, extract authority and complete the matrix.
5. Consider lanes; inspect handoffs and fill gaps.
6. Run confidence-improving checks; preserve state and record skips.
7. Apply the candidate gate. Omit nonmaterial candidates; separate context-dependent concerns; deduplicate, score, and limit admitted findings.
8. For a qualifying complexity-focused pass, inspect the distinct decomplex report and record concise owner dispositions. If the skill is unavailable, the pass is disproportionate, or its report cannot be written, apply the built-in gate and record the skip plus its confidence consequence (including none); do not imply that decomplex ran.
9. Produce output. Before a standalone report, reread [`assets/review-report-template.md`](assets/review-report-template.md).
10. Reread artifacts. Summarize findings, verdicts, validation, limits, and existing paths only.

## If fixes are explicitly requested

Read affected files and callers first. Preserve unrequested behavior. Prefer deletion, collapse, or standardization before abstraction. Update relevant tests, docs, and config; validate and summarize the changed behavior and files.
