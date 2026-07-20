# [Plan title]

> **Status:** Ready for implementation | Blocked on [decision]

## Outcome and boundaries

- **Problem and target:** [Evidence-backed current problem and observable desired outcome.]
- **In scope:** [Required behavior and integration surfaces.]
- **Out of scope:** [Material exclusions only; omit when none.]
- **Approach:** [Chosen design and dependency order.]

## Key files, evidence, and decisions

| File or source | Why it matters | Decision or plan impact |
|---|---|---|
| `[key planning file and symbol/search target]` | [Observed behavior, contract, or constraint.] | [Task, safeguard, check, or non-goal.] |
| `[key implementation starting file and symbol/search target]` | [Role in the change.] | [Required change or behavior to preserve.] |
| [Authoritative external source] | [Version-matched finding.] | [Decision or constraint.] |

- **Open gate:** [Unresolved approval or assumption that can change implementation; omit when none.]

<!-- For a small plan, rename the next heading to `## Tasks`. Use numbered phases only for real dependencies, migrations, rollout, delivery boundaries, or independently verifiable outcomes. -->

## Phase 1 — [Verifiable outcome]

#### T1.1 — [Task title]

- **Change:** [Required behavior, target component, integration/control flow, and exact contract or shape when needed.]
- **Starts at:** `[path]` — `[symbol or narrow search target]`; `[test path or narrow search target]`.
- **Depends on:** [Task ID or gate; omit when none.]
- **Verify:**
  - Run `[exact check]`; expect [observable signal] and retain [evidence].
  - Verify [material failure, regression, or manual behavior] with [evidence].
- **Risk/recovery:** [Material task-specific safeguard, rollback, cleanup, or operator action; omit when none.]

<!-- Repeat stable-ID tasks as needed. Starting paths are not allowlists: implementation must inspect coupled callers, tests, fixtures, config, schemas, generated outputs, docs, and consumers. Do not repeat task checks below. -->

- **Phase exit:** [Only cross-task integration, migration, rollout, or phase-wide check not already covered by tasks; omit for a flat plan or when task checks are sufficient.]
- **Exceptional review checkpoint:** [Only when this boundary needs review beyond the implement-plan defaults; omit otherwise.]

## Final acceptance

- **Checks:** [Authoritative repository-wide and applicable integration/manual checks, expected signals, and justified skips.]
- **End state:** [Observable end-to-end outcome, including material migration, rollout, cleanup, documentation, or operator requirements.]
- **Deferrals or blockers:** [Explicitly approved deferrals or remaining gate; omit when none.]
