# Plan-backed implementation review

Use when judging implementation against a plan, tracker, design, acceptance criteria, approved decision, or equivalent authority. Adds traceability; does not replace generic review. Apply finding admission/caps/worktree rules from `SKILL.md`.

## Scope

| Case | Rule |
|---|---|
| Unqualified plan review | Full plan + implementation |
| Named phase/task/files/diff | Bound scope; still include required callers, contracts, shared state, migrations, generated output, integration boundaries |
| Standalone vs embedded | Direct request = standalone; embedded when owning workflow keeps timing/resolution |
| Ambiguous authority | Ask one focused question — don’t guess |

State omitted sections. Never claim full-plan compliance from bounded scope.

## Authority precedence

Read every authority source in full (continue truncated reads). Never infer from headings/filenames/checkboxes alone.

1. Current explicit user constraints and documented approvals override defaults.
2. Follow user-stated precedence among plans/designs/acceptance/decisions.
3. Else co-authoritative named sources; report conflicts.
4. Decision/deviation/descope changes baseline only with approval source, scope, rationale, consequence.
5. Trackers/progress notes = claims/evidence unless explicitly designated authority.

Unresolved material conflict → ask if needed; else `baseline quality/conflict` finding, affected rows `Unverifiable`, lower confidence.

Useful requirement omitted by baseline ≠ noncompliance. Report only if admission gate passes on resulting risk.

## Extract baseline

Cite:

- goals / outcomes / non-goals
- acceptance criteria / DoD
- functional, security, privacy, data, compat, perf, a11y, ops requirements
- evidenced implied requirements for safe behavior/integration
- affected systems, callers, artifacts, migrations, docs, config, rollout, recovery
- risks, prohibited shortcuts, validation, exit conditions
- approvals and open questions

Assess:

- completeness
- consistency
- feasibility
- testability
- risk handling
- missing acceptance
- unsafe assumptions
- overengineering
- false-green checkpoints

Rules:

- Implied requirements need a cited behavior/integration constraint — not preference.
- Living roadmap docs: separate future wants from historical claims via history when needed.

## Evidence matrix

One row per applicable authority item or implied requirement:

```text
authority item → expected evidence → implementation evidence → validation/test evidence → status
```

Each row includes:

- source + requirement
- expected proof
- actual evidence (`path:line` / symbol / diff / runtime)
- validation + skips
- approval provenance if deviation
- one status + confidence limit

Rules:

- Inspect evidence directly.
- Tracker checkbox / filename / test name ≠ proof.
- `Complete` needs evidence, not a manufactured finding.

## Row statuses (exact)

| Status | Meaning |
|---|---|
| **Complete** | Implemented; necessary evidence + validation support it |
| **Partial** | Only part satisfied; state missing part |
| **Missing** | Required implementation or evidence absent |
| **Incorrect** | Exists but contradicts authority/behavior/integration |
| **Overbuilt** | Unnecessary scope/complexity beyond authority with real cost/risk |
| **Unverifiable** | Evidence cannot support a conclusion (incl. authority conflict) |
| **Approved deviation** | Intentional difference/descope with cited approval, scope, rationale, consequence |

No undocumented convenience as Approved deviation. Don’t collapse Partial/Missing/Unverifiable into success.

## Four required verdicts

Separate evidence-based verdicts (judgment + decisive evidence + exceptions + confidence) — not one aggregate pass:

1. **Plan/baseline quality and omissions**
2. **Implementation compliance** (matrix distribution, incomplete/incorrect, approved deviations)
3. **Implementation quality beyond the baseline** (generic risks baseline missed)
4. **Test and validation quality** (protected behaviors, skips, misleading tests, runtime/manual confidence)

Strong compliance ≠ excuse unsafe code. Weak baseline ≠ automatic noncompliance.

## Findings and follow-up

Matrix statuses are compliance evidence, not auto-findings. Link admitted findings to rows when relevant. Tests count as matrix evidence only when they protect claimed acceptance/boundary.

Focused closure: preserve finding IDs → resolved / withdrawn after disposition evidence / still material / blocked. New findings only if fix-caused/exposed or material to affected boundary. Return `Clear` | `Changes required` | `Human decision required` | `Blocked`. Reviewer state = evidence for owner, not authority over parent/user.

## Workflow

1. Resolve authority, scope, invocation, output.
2. Read authorities; extract requirements, implications, approvals, conflicts, baseline defects.
3. Inspect implementation + required boundaries; apply generic dimensions.
4. Complete matrix with evidence-backed statuses.
5. Assess tests/validation; retain limits.
6. Apply core finding contract → selective findings + full matrix + four verdicts.
7. Coverage + caveats. Never claim full compliance from bounded scope.
