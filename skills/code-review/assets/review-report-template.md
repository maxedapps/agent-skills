# Code review: <title>

> Adapt this template to the selected axes. Omit every irrelevant or empty section and every placeholder instruction. Plan-backed sections are conditional; generic reviews do not need them.

## Review axes and constraints

- **Target:** <repository, PR/diff, files, implementation step, or other target>
- **Baseline:** <generic | plan-backed, with authority paths if applicable>
- **Scope:** <full | bounded, naming phase/task/files/diff and required integration boundaries>
- **Invocation:** <standalone | embedded>
- **Output:** <chat-only | Markdown report + concise summary | handoff>
- **Dimensions:** <all applicable or the explicit subset>
- **Depth/tools/validation constraints:** <only material constraints>
- **Source writes/artifacts:** <forbidden/allowed and any explicit report exemption>
- **Evidence notes:** <optional `.progress/<review-slug>.md` path when one actually exists>

## Summary

<Concise overall result, highest material user/operator/security/data/compatibility/operations risks, and confidence. If no material issue was found, say so without inventing polish; if excess material concerns remain, state that the target is not review-ready.>

## Coverage

### Files and evidence inspected

- `<path, diff, commit, symbol, runtime state, authority source, or package artifact>` — <full/partial and purpose>

### Skipped or partial coverage

- `<path/area/check>` — <reason and confidence consequence>

### Integration boundaries

- `<caller, API, migration, generated output, config, UI/runtime, package consumer, or operational path inspected because it was required to judge scope>`

## Validation

### Run

- `<command/probe/manual check>` — <result and what it establishes>

### Skipped or unavailable

- `<check>` — <reason and effect on confidence/status/verdict>

## Plan-backed verdicts

<!-- Include all four only for a plan-backed review. Keep each verdict separate. -->

1. **Plan/baseline quality and omissions:** <judgment, decisive evidence, exceptions, confidence>
2. **Implementation compliance:** <judgment, status summary, approved deviations/descopes, confidence>
3. **Implementation quality beyond the baseline:** <judgment across applicable generic dimensions, confidence>
4. **Test and validation quality:** <judgment, protected and missing behavior, skipped/superficial checks, confidence>

## Plan compliance matrix

<!-- Include only for plan-backed scope. One row per applicable authority item or implied requirement. Allowed statuses: Complete, Partial, Missing, Incorrect, Overbuilt, Unverifiable, Approved deviation. -->

| Authority item / implied requirement | Expected evidence | Implementation evidence | Validation / test evidence | Status |
|---|---|---|---|---|
| `<source citation + requirement>` | `<required proof>` | `<path:line, symbol, diff, runtime, or missing>` | `<tests/checks/results/skips>` | `<one allowed status>` |

### Approval and conflict notes

- **Approved deviation:** <approval source, exact scope, rationale, consequence>
- **Authority conflict:** <competing sources/interpretations, clarification result or Unverifiable consequence>

## Findings

<!-- Findings are selective even when coverage is broad. Deduplicate by root cause. By default report every Critical and at most five additional High/Medium material root causes; omit Low/Optional unless explicitly requested. Order admitted findings by severity, then impact. -->

### <Critical | High | Medium; Low/Optional only when requested> — <finding title>

- **Dimension / authority item:** <category and plan item if applicable>
- **Location:** `<path:line, symbol, runtime surface, or evidence source>`
- **Impact:** <plausible/reachable path and meaningful user/operator/security/data/compatibility/operations consequence>
- **Evidence:** <sufficient evidence for the issue and confidence, including repro/check result>
- **Confidence:** `<CONFIRMED | PLAUSIBLE | NEEDS RUNTIME VALIDATION>`
- **Condition:** <deterministic, reachable, or observed incident when relevant>
- **Smallest safe fix / next validation:** <correction whose benefit exceeds complexity, regression risk, and maintenance cost, or decisive runtime validation; never speculative implementation>

## Confirmed-good areas

- `<meaningful behavior/contract>` — <evidence that supports confidence>

## Limitations and caveats

- `<scope, source access, runtime, credential, tool, skipped check, or baseline limitation and its consequence>`
- `<when excess material root causes remain: one blocking not-review-ready caveat with highest remaining severity, affected areas/dimensions, aggregate impact, evidence basis, and known count or lower bound>`

## Next steps

1. `<admitted must-fix or decisive validation in priority order>`
2. `<owner remediation/escalation decision if the target is not review-ready>`
