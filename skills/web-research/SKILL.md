---
name: web-research
description: Researches current web and external technical information through source-backed discovery, retrieval, and repository, document, or media inspection. Use this skill when the user needs current facts, docs, articles, URLs, repositories, PDFs, videos, comparisons, or version-specific library/API/framework evidence. Do not use this skill alone for interactive browser tasks such as login, forms, or UI-state inspection; use an available browser automation capability.
license: MIT
compatibility: >-
  Requires at least one current search, content-retrieval, repository, document,
  or media capability appropriate to the task. Interactive login, form, or UI
  state workflows additionally require an available browser automation
  capability.
metadata:
  short-description: Research current web, code, repository, document, and media evidence
---

# Web Research

## Instruction priority

Follow explicit user constraints and higher-priority instructions. If the user narrows scope, forbids external tools, requests chat-only output, or changes this workflow, adapt and briefly note meaningful deviations.

Use the best currently available search, content-retrieval, repository, document, media, and browser capabilities. Tool names and schemas differ between runtimes: inspect the available tools instead of assuming a particular function name.

## Core rules

- For substantive multi-source, conflicting, resumable, implementation-critical, or high-risk research, create or reuse `.progress/<research-slug>.md` early for questions, context, search angles, sources, findings, conflicts, rejected evidence, open questions, and synthesis decisions.
- Small direct lookups or source reads do not require a progress artifact. Preserve answer-critical sources and findings in the response.
- When progress notes exist, reread them before final responses, handoffs, compaction summaries, or user-requested summaries.
- Prefer primary sources: official docs, source repositories, release notes, changelogs, standards, vendor announcements, and first-party data.
- Read answer-critical source content. Search snippets and generated summaries are discovery aids, not sufficient evidence for behavior-sensitive claims.
- Continue with targeted follow-up when evidence is incomplete, ambiguous, outdated, conflicting, version-mismatched, or available only from weak secondary sources.
- For code/dependency research, identify the exact installed or targeted version from project files before judging behavior. Record runtime, adapter, framework, and integration boundaries that could affect the answer.
- For signatures, hashing, serialization, canonicalization, authentication, or wire protocols, require an independent official implementation, test vector, or interoperability check; a self-consistent round trip is not enough.
- Stop when material questions are supported, remaining gaps are explicitly non-material, or further useful evidence is unlikely.
- Cite source URLs clearly and state uncertainty instead of guessing.
- Never store secrets, credentials, private session data, or sensitive source content in research notes.

## Resource routing

| Need | Guidance |
|---|---|
| Discover or compare sources | Use an available web search capability; read `references/web-search.md` before complex, filtered, multi-angle, or recency-sensitive discovery. |
| Inspect URLs, docs, repositories, or PDFs | Use an available content/repository/document retrieval capability; read `references/fetch-content.md` before multi-source, repository, PDF, or truncated-content work. |
| Analyze video/audio or visual moments | Use an available media-capable retrieval/analysis tool and pass the user's exact question; read `references/media.md` first. |
| Interact with login, forms, pagination, dynamic UI, or authenticated state | Use an available browser automation capability rather than static search/retrieval alone. |
| Inspect local documents | Use an available local document parser/search/screenshot capability, choosing text extraction or visual inspection according to the question. |

## Workflow

1. **Classify the task and create proportional research memory**
   - Classify it as a small direct lookup/source read or as substantive multi-source, conflicting, resumable, implementation-critical, or high-risk research.
   - For substantive research, create or reuse `.progress/<research-slug>.md` and record the question, intended output, constraints, evidence bar, known context, and search angles.
   - For a small lookup, work directly and retain answer-critical sources and findings for the response.

2. **Establish exact technical context when applicable**
   - Identify dependency/library/framework names and versions from manifests, lockfiles, imports, config, or installed metadata.
   - Record relevant runtime, platform, adapter, environment, and compatibility constraints.
   - List implementation-critical questions: normal behavior, edge cases, error semantics, migration constraints, and integration boundaries.

3. **Discover sources deliberately**
   - If the user supplied a public source, inspect it directly before searching broadly.
   - Otherwise search from two to four meaningfully different angles: official documentation, source/release history, implementation examples, and independent corroboration.
   - Prefer focused search and selected retrieval over indiscriminate background fetching.

4. **Retrieve and inspect primary evidence**
   - Read the actual official docs, source files, release notes, standards, repository examples, PDFs, or media needed for the answer.
   - For repositories, inspect implementation and tests when behavior matters; README-level claims alone may be insufficient.
   - Retrieve full stored content or use another retrieval path when results are truncated.
   - For substantive research, record useful, weak, stale, conflicting, and rejected sources in progress memory.

5. **Evaluate sufficiency and follow up**
   - Check authority, date/version match, directness, agreement, edge cases, failure behavior, and implementation implications.
   - Resolve conflicts by preferring version-matched official docs and source, then release notes/changelogs, first-party examples, and finally secondary analysis.
   - Continue only with targeted follow-up; avoid redundant research once strong sources converge.

6. **Synthesize carefully**
   - State the supported answer, version constraints, implementation implications, and meaningful uncertainty.
   - Separate observed facts from inference and explain material conflicts.
   - Do not expose tool mechanics unless they matter to the user.

## Late results

If delayed research output arrives after an answer, re-engage only when it materially changes the conclusion, reveals an important correction, or the user asks about it.
