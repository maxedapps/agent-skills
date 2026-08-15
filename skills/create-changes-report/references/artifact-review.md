# Changes-report artifact review

Reviewer-only contract for the exact creator-QA-complete candidate bytes. Do not re-review the implementation, edit files, write into the HTML, or recursively delegate.

Reuse `code-review` materiality and `use-subagents` policy by name. Outcome stays outside the reviewed HTML. No extra matrices or review artifacts.

## Boundary

- In scope: honesty, completeness, usefulness, and precision of this candidate against frozen evidence.
- Out of scope: a second implementation review; restyling; Git or tracker edits; new work except to say the report hides or misstates it.

If you implemented, did final implementation review, or authored the report → `Blocked`.

## Required evidence

All of: frozen scope/diff · plan/tracker · check outputs · candidate HTML (exact delivery bytes) · this rubric.

Missing any → `Blocked`. Review only these stable bytes. Any later edit is a different candidate.

## Axes

**Honesty.** Counts, statuses, skips, commands, and results match frozen evidence. No invented metrics, falsely-green skips, omitted failures, or unsupported claims.

**Completeness.** Every frozen changed file appears with status, delta, and role. Admitted critical points list complete involved paths and roles. Snippet budget and one-source-of-truth hold. Verification records exact commands, results, and skips.

**Usefulness.** A reviewer can assess what changed and what is risky in ~5 minutes. Collapsed critical-point summaries work alone. Expanded **Failure if wrong**, **Protected by**, **Files involved**, and **Key code** are present and relevant. Residual risk sits in the review guide.

**Precision.** Paths are complete repository-root-relative POSIX (never basename-only, `./…`, `~`, or machine-absolute). `data-path`, `data-code-key`, `data-pop`, and `data-goto` targets resolve. Snippets are canonical, contiguous, verbatim, and correctly attributed.

## Interaction checks

As applicable to this candidate:

- One critical point expands at desktop and narrow width
- A specific ◆ jump and `#hot-<slug>` hash open the right card
- Keyboard `<details>` toggle works without JavaScript
- Dialog / `?pop=` open and return focus when dialogs exist
- Print shows expanded details
- No console errors on the inspected file

Skip only what the candidate does not implement; record the skip.

## Findings

Admit only material issues per `code-review`. Each finding: axis · location · evidence (candidate vs frozen source) · consequence · smallest fix (report-only vs underlying implementation). No nits or extra review files.

## States

| State | When |
|---|---|
| `Clear` | No material findings |
| `Changes required` | Material report or hidden-implementation issue |
| `Human decision required` | Owner must choose |
| `Blocked` | Missing evidence, unreadable bytes, or independence broken |

Return state and findings in chat only. Never modify the candidate.
