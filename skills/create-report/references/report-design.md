# Report Design

Use this guide to decide what earns space. It is not a requirement to fill every category. Reuse answer-first, audience, evidence-label, redaction, and deletion principles; do not take the explainer renderer.

Contents: [Spine](#executive-spine) · [Archetypes](#choose-one-archetype) · [Modules](#optional-modules) · [Evidence](#evidence-and-provenance) · [Actions](#findings-recommendations-and-actions) · [Interaction](#interaction) · [Hierarchy](#visual-hierarchy) · [Tiles](#evidence-tiles) · [Data](#data-display) · [Accessibility](#accessibility) · [Safety](#source-safety) · [Anti-patterns](#anti-patterns) · [Deletion](#deletion-and-actionability-pass)

## Executive spine

Keep the first screen to about five minutes. Open with the answer, outcome, or recommended move in one or two sentences. Add background only when it changes that answer.

Always make these five jobs visible, even if a later module expands them:

| Job | Reader should leave knowing |
| --- | --- |
| Answer / outcome | What is true, chosen, or current |
| Scope | What was examined and what was not |
| Key evidence | The few facts that carry the answer |
| Implications | What changes if the answer is accepted |
| Next action | What happens now, or `Unassigned` / `TBD` |

Match vocabulary to the audience. Define the few domain terms a newcomer needs; for operators, prefer exact names, boundaries, and failure behavior. State scope when an adjacent question could be confused with this one.

## Choose one archetype

Pick the smallest fit. Do not blend two shapes on the main page.

| Archetype | Use when | Center of gravity |
| --- | --- | --- |
| Decision / comparison | The reader must choose or compare options | Criteria, option evidence, recommendation, and the main trade-off |
| Assessment / research | The reader needs a grounded answer to a question | Question, ranked findings, confidence, and material gaps |
| Status / outcome | The reader needs current state or what happened | Outcome, remaining work or blockers, and the next move |

For a comparison, show only criteria that change the choice. For research, explain existing evidence; do not silently become a new defect review. For status, separate observed state from hoped-for state.

## Optional modules

Keep only modules that change the decision or understanding. Suggested order; drop unused ones and honor a user-required order when compatible:

1. Hero / scope — title, lede, audience, and bounded scope.
2. Evidence tiles — `0–6` headline numbers, each backed.
3. Executive summary — the five spine jobs in short form.
4. Findings / insights — ranked, most important first.
5. Comparison or status — the archetype body: criteria table, option cards, or state/blocker list.
6. Implications / risks — consequences and residual uncertainty.
7. Actions — recommended or required next steps.
8. Methodology / limitations — how evidence was gathered and what it cannot support.
9. Source ledger — relocatable citations.
10. On-page details — native `<details>` for inventories the main page should not carry.
11. Dialogs — optional labelled drill-downs; never the only copy of central evidence.

## Evidence and provenance

- Cite sources so a reader can relocate them: path plus heading, symbol, or useful line range; artifact plus section; stable URL for external claims.
- Use **Observed** for facts you inspected, **Source-reported** for claims a cited source asserts, **Inference** for a conclusion drawn from those facts, and **Unknown** for a material gap. Label where categories mix, not every sentence.
- Keep confidence proportional to evidence. A sample is not a census. A plan records intent, not completed behavior. A quote is not endorsement.
- Never invent metrics, confidence, ownership, dates, status, rationale, or citations. If a number was not in the sources, delete it.

## Findings, recommendations, and actions

A finding is not a slogan. Each retained finding states:

- **Evidence** — what was observed or source-reported
- **Consequence** — why it matters to this audience
- **Next action** — who should do what, or `Unassigned` / `TBD`

A recommendation states:

- **Basis** — the evidence that supports it
- **Expected effect** — what should change
- **Trade-off** — gain versus cost
- **Assumptions** — conditions that must remain true
- **Prerequisites** — what must exist first, or `Unknown`

Prefer `Unassigned`, `TBD`, or `Unknown` over guessed owners, dates, or certainty. Rank items; merge overlaps; drop residual notes that do not change action.

## Interaction

- Every retained headline number and key conclusion has an ordinary on-page fragment target.
- Dialogs are optional enhancement. Central evidence stays on the page and in print.
- Native `<details>` / `<summary>` is the default disclosure. Collapsed summaries must be understandable alone.
- Core content and section navigation work with JavaScript disabled. Do not make the table of contents, spine, or evidence path script-only.
- Label dialog controls and return focus on close. Deep links may open a dialog or details element; the same content remains reachable without that enhancement.

## Visual hierarchy

- Decide the one thing the eye must land on first, usually the answer. Demote everything else.
- Use whitespace as the primary grouping tool. Prefer a calm lede, a short tile row, then cards or a table — not stacked chrome.
- Status uses semantic text labels. Color may reinforce a label; it never replaces one.
- Body text stays in ink tokens. Accent is for interactive elements and sparse emphasis.
- Do not repeat the same fact in prose, a table, a chart, and a diagram. Give each retained modality a distinct job.

## Evidence tiles

- Use `0–6` tiles. Zero is correct when no headline number is both true and useful.
- Each tile is one backed value plus a short label. The value links to its evidence.
- Do not add decorative tiles, guessed totals, or a tile whose only job is to fill a grid.
- Two strong numbers beat six weak ones.

## Data display

- Show the comparison that supports the claim, not the whole dataset.
- Prefer a direct value or a small table. Use an optional single-hue chart only when pattern-over-time or share-of-total is faster than the table.
- Title a chart with its finding. Label values directly. No chart libraries, dual axes, or rainbow palettes.
- Strip gridlines, legends, and precision the claim ignores.
- User "no chart" or equivalent wins.

## Accessibility

- Use semantic landmarks, real headings in order, lists, tables with headers, and visible focus.
- Honor `prefers-color-scheme` and `prefers-reduced-motion`. Do not convey meaning by motion or color alone.
- Text and controls keep readable contrast. Long paths and numbers wrap; code and tables scroll instead of overflowing.
- Keyboard users can reach every control, toggle disclosures, and dismiss dialogs.
- Print shows the spine, findings, actions, and the evidence those claims need.

## Source safety

- Escape `<`, `>`, `&`, and attribute delimiters in inserted content. Hostile markup must render as text.
- Allow `https:` and other safe citation links. Reject `javascript:`, `data:` HTML, and other unsafe schemes rather than rewriting them into live controls.
- Embed only approved local or user-supplied assets. No remote subresources, fetches, frames, or forms.
- Redact secrets, credentials, tokens, PII, and irrelevant sensitive values in prose, tables, excerpts, and URLs.
- Prefer a short paraphrase when safe redaction would make an excerpt misleading.

## Anti-patterns

- Background-first history before the answer.
- Filling every module or forcing all three archetypes.
- Invented owners, dates, confidence, or citations.
- Adopting `code-review`, `create-plan`, `decomplex`, `implement-plan`, or `create-changes-report` authority.
- Decorative charts, theme packs, or live dashboard behavior.
- JavaScript-only navigation or evidence that disappears in print.
- Repeating the same number in tile, prose, table, and chart.
- Overwriting an existing path, leaving sidecars, or fetching the network from the artifact.

## Deletion and actionability pass

1. Confirm the first screen answers the question and names the next action or an honest unknown.
2. Delete any module that does not change the decision or mental model.
3. Delete repeated facts across modalities; keep the clearest owner for each fact.
4. Check every retained number and key conclusion against its cited source; remove or label anything unsupported.
5. Check every finding for evidence, consequence, and next action; every recommendation for basis, effect, trade-off, assumptions, and prerequisites.
6. Recheck evidence labels, redactions, unsafe URLs, and gaps left as `Unassigned` / `TBD` / `Unknown`.
7. Confirm the artifact still works without JavaScript and still does not speak for another workflow.
