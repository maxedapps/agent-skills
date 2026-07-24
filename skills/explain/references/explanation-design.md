# Explanation Design

Use this guide to decide what earns space. It is not a requirement to fill every category.

## Answer first and calibrate

- Open with the answer, outcome, or mental model in one or two sentences. Add background only when it changes that answer.
- Match vocabulary to the audience. Define the few domain terms a newcomer needs; for maintainers, prefer exact symbols, boundaries, and failure behavior.
- Optimize for the user's question, not for complete coverage of the subject. State the scope when adjacent behavior could be confused with it.

## Choose one archetype

| Archetype | Evidence base | Center of gravity |
| --- | --- | --- |
| Code, system, or data | Current files, symbols, callers, tests, configuration, schemas | What it does, why the pieces connect, and one representative request/data trace |
| Prior plan, review, or agent statement | Available conversation and the named plan, review, or artifact | Goal, reasoning, decisions, safeguards, trade-offs, and material gaps |

For the second archetype, explain the existing reasoning; do not silently perform a new review or invent intent omitted from the record.

## Mark evidence precisely

- Cite code as `path — symbol()`; add stable line ranges only when they help the reader relocate the evidence.
- Cite prior artifacts by path and heading, finding, or decision. Quote only the decisive phrase when wording matters.
- Use **Observed** for behavior directly supported by inspected context, **Inference** for a conclusion drawn from it, and **Unknown** for a material gap. Apply labels where categories mix, not to every sentence.
- Keep confidence proportional to evidence. Tests show covered examples, not universal correctness; a plan records intent, not completed behavior.

## Trace one representative flow

Choose the path that best explains the whole:

1. Name the request, event, or input and its entry point.
2. Follow the important transform or lookup.
3. Identify the decisive branch, boundary, or relationship.
4. Show the side effect or output and one material failure path.

Keep the trace end to end and usually within 4–7 steps. Mention alternate branches only when they change the mental model.

## Select the visual

Use a visual only when relationships, order, state, or data flow become faster to understand than prose alone:

- Relationship or ownership: small flowchart or entity relationship view.
- Ordered interaction: sequence view.
- Lifecycle: state view.
- Compact comparison: table, not a graph.

When useful, encode the visual in a fenced `mermaid` block. Aim for one direction, short labels, one highlighted boundary, and roughly 6–8 nodes or fewer; split or delete a graph that needs prose inside its nodes. Omit the diagram when a four-step trace or small table is clearer.

A diagram owns topology or order. Prose should explain consequences and caveats rather than narrating every edge again.

## Keep excerpts focused

- Select the branch, boundary, schema fragment, or invariant that proves the explanation; do not paste setup boilerplate or whole files.
- Use 1–2 excerpts, normally at most 15 lines each. Preserve enough syntax to remain truthful and mark omissions that could affect meaning.
- Introduce each excerpt with its `path — symbol` and say what the reader should notice.
- Redact secrets, tokens, PII, and unrelated sensitive values. Prefer a paraphrase when safe redaction would make code misleading.

## Surface decisions and gaps

- Name safeguards beside the risk they control: validation, authorization, rollback, idempotency, compatibility, or test coverage.
- State the chosen trade-off as “gain versus cost,” not as generic praise or criticism.
- Separate recorded decisions from suggested rationale. If rationale is absent, label it **Unknown**.
- Include only gaps that materially limit the answer. Do not turn an explanation into a fresh defect review or implementation plan.

## Avoid these patterns

- Background-first history before the answer.
- File-by-file tours without a representative trace.
- Whole-file excerpts or exhaustive branch catalogs.
- Decorative diagrams, oversized graphs, or prose/code/diagram repetition.
- Uncited claims about current behavior or unlabeled speculation.
- Invented intent, safeguards, completeness, or external facts.
- Fix proposals when the user asked only for an explanation.

## Deletion pass

1. Check that the first paragraph answers the question.
2. Delete any section that does not change the mental model.
3. Delete repeated facts across modalities; retain the clearest owner for each fact.
4. Shorten paragraphs to at most three sentences and excerpt only decisive lines.
5. Recheck citations, evidence labels, redactions, trade-offs, and material unknowns.
6. Keep the 3–6 section, one-diagram, and excerpt limits unless exceeding them prevents a misleading or incomplete explanation.
