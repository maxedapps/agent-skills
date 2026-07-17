# Code review: <title>

> Remove all instructions, placeholders, and empty/irrelevant sections. Include plan-backed sections only for plan-backed work.

## Review constraints

| Axis | Selection |
|---|---|
| Target | <repository, diff/PR, files, or implementation step> |
| Baseline | <generic or plan-backed authority paths> |
| Scope | <full or bounded, including required boundaries> |
| Invocation | <standalone or embedded> |
| Output | <Markdown report plus summary> |
| Dimensions | <selected dimensions> |
| Validation/tools | <material constraints> |
| Writes/artifacts | <permissions and report exemption> |

## Summary

<Overall result, highest material risks, and confidence. Say when no material issue was found. If overflow remains, state `not review-ready`.>

## Coverage

### Inspected

- `<path/diff/commit/symbol/runtime/authority/artifact>` — <full or partial; purpose>

### Skipped or partial

- `<area/check>` — <reason and confidence consequence>

### Required boundaries

- `<caller/API/migration/generated output/config/UI/package/operational path>`

## Validation

- **Run:** `<command/probe/manual check>` — <result and what it proves>
- **Skipped/unavailable:** `<check>` — <reason and confidence/status consequence>

## Plan-backed verdicts

1. **Plan/baseline quality and omissions:** <judgment, evidence, exceptions, confidence>
2. **Implementation compliance:** <judgment, status distribution, deviations/descopes, confidence>
3. **Implementation quality beyond the baseline:** <judgment, evidence, exceptions, confidence>
4. **Test and validation quality:** <judgment, protected/missing behavior, limitations, confidence>

## Plan compliance matrix

| Authority item / implied requirement | Expected evidence | Implementation evidence | Validation / test evidence | Status |
|---|---|---|---|---|
| `<source + requirement>` | `<required proof>` | `<path:line/symbol/diff/runtime or missing>` | `<results/skips>` | `<exact status from plan-backed-review.md>` |

### Approvals and conflicts

- **Approved deviation:** <source, scope, rationale, consequence>
- **Authority conflict:** <sources/interpretations and Unverifiable consequence>

## Findings

### <severity> — <title>

- **Dimension / authority:** <category and matrix item>
- **Location:** `<path:line, symbol, runtime surface, or source>`
- **Impact:** <reachable path and material consequence>
- **Evidence:** <code/runtime/test/repro evidence>
- **Confidence:** <confidence score>
- **Condition:** <deterministic, reachable, or observed incident>
- **Validation state:** <none or NEEDS RUNTIME VALIDATION>
- **Smallest safe fix / validation:** <proportionate correction or decisive check>

## Confirmed-good areas

- `<material behavior/contract>` — <supporting evidence>

## Limitations and caveats

- `<scope, access, runtime, credential, tool, validation, or baseline limit and consequence>`
- `<blocking not-review-ready caveat when finding overflow remains>`

## Next steps

1. `<must-fix or decisive validation, in priority order>`
2. `<owner remediation/escalation decision when not review-ready>`
