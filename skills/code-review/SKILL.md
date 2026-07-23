---
name: code-review
description: >-
  Reviews repository diffs, PRs, codebases, and completed implementations for
  material, evidence-backed defects and plan compliance. Use this skill when
  asked to review, audit, critique, find code issues, or evaluate implemented
  plan work. Do not use for draft-plan review or implementation unless fixes are
  explicitly requested.
license: MIT
compatibility: >-
  Requires read access to reviewed targets. Standalone report writes need
  project write access under .reviews/. Delegation requires a safely available
  subagent capability.
metadata:
  short-description: Adaptable generic and plan-backed implementation review
---

# Code Review

## Hard rules

- Scope from user/task only. Unclear → **ask**. Don’t widen.
- Inspect thoroughly; report selectively. Candidate ≠ finding.
- **“No material findings” is valid.**
- No source edits unless asked. Don’t clobber owner git/worktree state.
- Main agent assigns final findings/scores/verdicts. Child handoffs = evidence.
- **Delegate by default** into bounded read-only lanes when safe. “Small/easy” ≠ skip.
- Leverage subagents — built-in, extensions/plugins, or skills. Follow `use-subagents` policy; use the host’s selected launcher (on Pi without native `subagent_*`, `use-pi-subagents`).

### Admit a finding only if

- concrete failure
- realistic reachability
- practical impact
- safeguards considered
- action justified now

Omit nits, hypotheticals, and low-impact noise. Don’t hide them in caveats.

## Loads

| When | Read |
|---|---|
| Broad or deep dimension review | [`references/review-dimensions.md`](references/review-dimensions.md) first |
| Vs plan/tracker/design/acceptance | [`references/plan-backed-review.md`](references/plan-backed-review.md) first |
| Standalone report | [`assets/review-report-template.md`](assets/review-report-template.md) before write |

## Flow

1. Fix scope/authority/output — ask if needed.
2. Load conditional resources.
3. Inspect targets, callers, tests, config, diffs. Note skips + confidence limits.
4. **Delegate** review lanes by default (correctness, security, tests, plan-matrix, …).
5. Run checks/repros that raise confidence; preserve owner state.
6. Admit → score → cap findings.
7. Optional `decomplex` only if complexity-focused and report writable; else built-in simplicity. Don’t merge contracts.
8. Write `.reviews/<slug>.md` (unless chat-only/no-write) or return handoff.
9. Cleanup any workflow runtime/process state.

## Scores and caps

| | |
|---|---|
| Severity | `S4` critical · `S3` high · `S2` medium · `S1` low · `S0` optional |
| Confidence | `C3` confirmed · `C2` supported · `C1` tentative (not a finding yet) |

Per finding: scores · location · evidence · impact · smallest safe fix/validation.

**Caps:** all `S4`; ≤5 other material `S3`/`S2`; no `S1`/`S0` by default. Overflow → one `not review-ready` caveat. Deduplicate root causes.

## Plan-backed

When authority exists: full matrix + four verdicts (baseline · compliance · quality beyond baseline · tests/validation) per plan-backed ref.

## Embedded follow-up

States: `Clear` · `Changes required` · `Human decision required` · `Blocked`

- Preserve finding IDs.
- Only accepted fixes, disputed dispositions, affected boundaries, fix-caused/exposed issues.
- Need a material delta between rounds.

## Fixes (only if explicitly requested)

Read callers → smallest fix → update tests → validate → summarize.
