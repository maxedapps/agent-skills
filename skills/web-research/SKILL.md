---
name: web-research
description: Researches current web information with source-backed search, fetching, critical evaluation, and follow-up until material questions are answered. Use when the user needs current information from the web, wants docs/articles/pages summarized, needs facts cross-checked, wants GitHub repos, PDFs, videos, or web pages fetched, or asks for evidence-backed online research. Use even if the user says “find docs”, “what changed recently”, “compare X and Y”, or “summarize this URL”. Do not use for browser-only interaction; use `agent-browser` for clicking, login, forms, or UI state.
metadata:
  short-description: Research the web with web_search, fetch_content, and get_search_content
---

# Web Research

## Instruction priority

Follow explicit user constraints and higher-priority system/developer instructions over this skill. When the user narrows scope, forbids external tools, asks for chat-only output, or gives a conflicting workflow, adapt accordingly and briefly note any meaningful deviation.

Default mindset: use current, source-backed web evidence instead of memory when the task depends on online information. Do in-depth research: search from multiple angles, read answer-critical sources, evaluate sufficiency, and do targeted follow-up when important questions remain. Avoid broad background fetching by default: search first, then fetch only the sources needed to answer well.

## Core rules

- Create or reuse `.progress/<research-slug>.md` early. Treat it as durable research memory for questions, search angles, sources fetched, findings, discarded/weak sources, conflicts, open questions, and synthesis decisions.
- Before final responses, handoffs, compaction summaries, or user-requested summaries, reread relevant `.progress` notes and use them as the source of truth.
- Prefer primary sources: official docs, changelogs, release notes, announcements, repositories, standards, and vendor docs.
- Read actual source content when behavior matters; do not stop at search snippets or high-level summaries.
- Continue researching when evidence is incomplete, ambiguous, outdated, conflicting, too weak, or only from secondary sources.
- Stop only when the answer is sufficiently supported, remaining gaps are explicitly non-material, or further useful evidence is unlikely.
- Cite source URLs clearly and state uncertainty instead of guessing.
- Do not store secrets, tokens, credentials, or private session data in progress notes.
- For code-specific third-party library/API/framework research, read the `code-research` skill; use this skill as the web/search/fetch layer.

## Tool and resource routing

| Need | Tool / resource |
|---|---|
| Discover sources, compare viewpoints, handle recency, or use filters | Use `web_search`; read `references/web-search.md` before complex discovery searches, multi-query research, filters, recency constraints, or workflow options. |
| Inspect a provided URL, docs page, GitHub repo, PDF, or multiple URLs | Use `fetch_content`; read `references/fetch-content.md` before GitHub repos, PDFs, multiple URLs, or truncated stored content retrieval. |
| Retrieve full stored search/fetch results after truncation | Use `get_search_content`; read `references/fetch-content.md` for retrieval patterns. |
| Analyze YouTube/local video or extract frames | Use `fetch_content` with the user's specific question as `prompt`; read `references/media.md` before video analysis or frame extraction. |
| Click, log in, fill forms, paginate, inspect UI state, or do visual browser QA | Use `agent-browser`, not web research alone. |
| Research third-party code dependencies | Read the `code-research` skill, then use this skill for source discovery/fetching. |

## Core workflow

1. **Create progress memory and classify the task**
   - Create `.progress/` if needed, then create or reuse `.progress/<research-slug>.md` using a short kebab-case slug from the question/source.
   - Record the question, intended output, evidence bar, constraints, search angles to try, and known sources.
   - Classify the task: discovery, direct-source reading, comparison, media/document research, or code-specific dependency research.

2. **Search when sources are not fixed**
   - Use `web_search({ queries: [...] })` for real research; prefer 2–4 varied query angles over one broad query.
   - Before complex searches, filters, recency constraints, or workflow options, read `references/web-search.md`.
   - Record queries/search angles and promising sources in the progress note.

3. **Fetch primary and answer-critical sources**
   - Use `fetch_content` on selected official docs, changelogs, announcements, blogs, repos, PDFs, and videos.
   - If the user supplied a public URL, fetch it directly instead of searching first.
   - Do not rely on snippets for answer-critical claims; fetch/read the source content.
   - Before GitHub repo fetching, PDFs, multiple URLs, or retrieving truncated content, read `references/fetch-content.md`.
   - Record fetched sources, key facts, dates/versions, and source quality in the progress note.

4. **Handle media carefully**
   - For YouTube or local video, always pass the user's specific question via `prompt`.
   - Before video analysis or frame extraction, read `references/media.md`.

5. **Analyze sufficiency before synthesizing**
   - Check whether the evidence is current, authoritative, directly answers the question, and agrees across sources.
   - Identify contradictions, missing details, weak-source-only claims, date/version mismatches, and new questions raised by the evidence.
   - Continue with targeted searches/fetches when material facts are missing; avoid redundant research once strong sources converge.
   - Record follow-up decisions, conflicts, and remaining uncertainty in the progress note.

6. **Synthesize carefully**
   - Prefer official docs/release notes/repositories when sources conflict.
   - Note disagreements, uncertainty, and non-material gaps.
   - Before finalizing, ensure answer-critical fetch/search work completed or explicitly state that remaining background content was not needed.

7. **Handle late background results quietly**
   - If a background fetch/search completes after an answer, do not send a standalone acknowledgement.
   - Re-engage only when new content materially changes the answer, reveals an important correction, or the user asks about it.

## Output pattern

When reporting back, prefer:

1. **Answer / conclusion**
2. **Key findings**
3. **Sources consulted**
4. **Open questions or uncertainty**
5. **Progress note path**

Answer directly. Skip filler. The value of this skill is current, well-sourced findings.
