# Decomplex review: <descriptive title>

> For generated reports, remove this instruction, all angle-bracket guidance, and every empty or inapplicable section. Do not add a numerical score or finding quota. Order potential findings by expected simplification value.

## Overall status

<Use a concise outcome. When none pass the admission gate, write exactly: **No potential complexity findings.**>

## Review contract

| Axis | Selection |
|---|---|
| Mode | <Prevention, Audit, or Finding triage> |
| Target | <artifacts or proposal reviewed> |
| Authority / required behavior | <owner, plan, contract, acceptance criteria, or user direction> |
| Scope | <included boundaries and non-goals> |
| Report | <.reviews/descriptive-slug-decomplex.md> |

## Coverage

### Inspected

- `<artifact, caller/consumer, test, config, history, or operational context>` — <extent and purpose>

### Skipped or partial

- `<area or evidence>` — <reason and confidence consequence>

## Potential findings

<If none pass the gate, retain this section and write exactly: **No potential complexity findings.** Do not manufacture an item. Otherwise assign each item a stable `DEX-###` ID and do not renumber it during the review.>

### DEX-### — <concise title>

- **Evidence:** <Confirmed | Supported>
- **Recommendation:** <Act | Validate | Ask user>
- **Surface and location / authority:** <artifact, lines/symbol/decision/finding, and governing source>
- **Current-need evidence:** <what currently requires this complexity, or evidence that justification is absent/insufficient>
- **Added burden:** <concrete conceptual, maintenance, or operational burden>
- **Reachable practical impact:** <realistic path and cost>
- **Smallest simpler alternative:** <delete, direct use, local logic/helper, existing shared abstraction, or justified new abstraction>
- **Exception / boundary check:** <domain language, type narrowing, policy, trust boundary, external contract, established duplication, lifecycle/cleanup, irreversible effect, measured constraint, compatibility, or operational need checked>
- **Required behavior and simplification risk:** <behavior to preserve and regression/migration risk>
- **Bounded next step or user question:** <owner action, decisive validation, or material question>
- **Acceptance signal:** <observable evidence that the action/validation/decision is complete and behavior remains preserved>

Recommendation meanings:

- **Act** — the owner should apply the evidenced, behavior-preserving simplification.
- **Validate** — the owner should run the named bounded check before deciding.
- **Ask user** — the owner should resolve the named material authority, behavior, architecture, security, compatibility, or risk decision.

## User-decision queue

| DEX ID | Material decision | Evidence and options | Recommendation |
|---|---|---|---|
| `DEX-###` | <question only the user/authority owner can resolve> | <bounded options and consequences> | Ask user |

## Finding-triage matrix

<Include only in Finding triage mode. Preserve every supplied finding ID verbatim, including findings that need no action.>

| Supplied finding ID | Evidence, reachability, and current need | Complexity and behavior trade-off | Disposition | Owner rationale / next step |
|---|---|---|---|---|
| `<original ID, unchanged>` | <evidence and realistic path> | <added burden, exception, and behavior risk> | <Act | Validate | Ask user | No action> | <why to accept, check, escalate, reject, or retain the original recommendation> |

## Confirmed proportionate areas

- `<area retained>` — <current need, boundary/exception, and evidence that its burden is proportionate>

## Limitations

- `<missing access, authority, runtime, history, operational evidence, or validation>` — <effect on confidence or owner decision>
