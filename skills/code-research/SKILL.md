---
name: code-research
description: Researches current, version-specific evidence for coding decisions before implementation, with deep critical follow-up until material API/library/framework questions are answered. Use when coding work depends on third-party APIs, SDKs, libraries, frameworks, integration behavior, migration details, or any task where relying on model memory could cause outdated or incorrect guidance. Do not use for purely local code tasks that require no external dependency knowledge.
metadata:
  short-description: Research APIs and libraries before implementing code
---

# Code Research

## Instruction priority

Follow explicit user constraints and higher-priority system/developer instructions over this skill. When the user narrows scope, forbids external tools, asks for chat-only output, or gives a conflicting workflow, adapt accordingly and briefly note any meaningful deviation.

## Core rules

- Do not rely on memory alone for third-party APIs, libraries, SDKs, or frameworks.
- Create or reuse `.progress/<research-slug>.md` early. Treat it as durable research memory for questions, dependency/version context, sources, findings, conflicts, decisions, open questions, and implementation implications.
- Before final responses, handoffs, compaction summaries, or user-requested summaries, reread relevant `.progress` notes and use them as the source of truth.
- Identify the dependency and version first from project files such as `package.json`, lockfiles, config files, imports, or installed package metadata.
- Gather current, version-specific evidence before implementing or refactoring code.
- Prefer official docs, source code, release notes, changelogs, and repository examples over secondary summaries.
- For signature, hashing, serialization, canonicalization, auth, or wire-protocol work, require at least one independent source/test vector/official implementation check; self-consistent round-trip tests are not enough to prove external interoperability.
- Do in-depth research: after each source, evaluate whether it fully answers the material questions; continue researching when API behavior, version constraints, migration details, examples, edge cases, source evidence, or integration implications are still missing.
- Stop only when the information needed to answer or implement is available, remaining gaps are explicitly non-material, or further useful evidence is unlikely.
- Do not store secrets, tokens, credentials, or private session data in progress notes.

## Resource routing

- Read the `web-research` skill before using web search, fetching docs, reading GitHub repos, PDFs, videos, or retrieving full stored web content.
- Read the `mcporter-mcp` skill before using Context7, DeepWiki, or any MCP server/tool; all MCP usage must go through mcporter.

## Research workflow

1. **Create progress memory and research questions**
   - Create `.progress/` if needed, then create or reuse `.progress/<research-slug>.md` using a short kebab-case slug from the dependency/task.
   - Record the coding decision to support, exact questions to answer, evidence needed, known constraints, and what would make the research sufficient.

2. **Identify the exact dependency context**
   - Determine package/library/framework name and version.
   - Note runtime, framework, adapter, environment, and integration boundaries that could affect behavior.
   - Record relevant project files and version evidence in the progress note.

3. **Read primary evidence**
   - Use official documentation for the relevant version.
   - Inspect GitHub source, README, markdown docs, examples, release notes, or changelogs when behavior matters.
   - Use the `web-research` skill before web searches, docs fetching, repo fetching, or content extraction.
   - Record useful sources and key findings in the progress note; also record weak, outdated, or rejected sources when they could otherwise mislead future work.

4. **Use MCP-backed docs only through mcporter when helpful**
   - Use Context7 for up-to-date library docs when official docs are hard to search or version-specific examples are needed.
   - Use DeepWiki for repository-level Q&A or structure exploration.
   - Before any Context7 or DeepWiki call, read the `mcporter-mcp` skill and inspect the server/tool schema.

5. **Clone/read repositories when needed**
   - Clone GitHub repositories into `~/.repos/` when source inspection is needed and web fetching is insufficient.
   - Check for an existing repo first; run `git pull` to update before cloning again.

6. **Evaluate sufficiency and follow up**
   - Ask: Does the evidence match the installed version? Does it answer normal behavior, edge cases, errors, migration constraints, and integration boundaries? Do docs, examples, and source agree?
   - Continue with targeted follow-up research when material questions remain, sources conflict, examples are version-mismatched, or project code appears to rely on undocumented behavior.
   - Resolve conflicts by preferring version-matched official docs and source code, then release notes/changelogs, then repository examples, then secondary sources.
   - Record open questions and why any remaining gaps are non-material or unresolved.

7. **Synthesize before coding**
   - State the evidence-backed behavior, version constraints, and implementation implications.
   - Call out uncertainty, stale/conflicting sources, rejected assumptions, and remaining risks.
   - Only then answer or implement.

## Source priority

1. Official docs or vendor website for the specific version.
2. Source code, release notes, changelogs, and repository examples.
3. Context7 / DeepWiki through mcporter when they add searchable docs or repo understanding.
4. Secondary articles only as discovery leads or supporting context, not as the sole basis for implementation-critical claims.
