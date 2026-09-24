---
name: create-wiki
description: >-
  Creates and updates reusable, source-backed technology knowledge bases under
  a project's wiki/ directory. Use this skill when asked to build, expand,
  refresh, or audit a wiki or knowledge base about frameworks, libraries,
  platforms, protocols, or engineering practices. Do not use for project
  documentation, specifications, architecture decisions, implementation plans,
  changelogs, or one-off research answers that need no reusable wiki.
license: MIT
metadata:
  short-description: Create reusable technology knowledge bases
---

# Create Wiki

## Critical rules

- Write reusable technology knowledge, never documentation for the containing project. Exclude project architecture, requirements, decisions, status, and project-specific examples.
- Store each technology or topic under `wiki/<topic-name>/` with descriptive topic-area files such as `best-practices.md` or `queues-and-jobs.md`.
- Do not create `README.md`, index, overview-only, or navigation files. Filenames and focused content must make discovery sufficient.
- Research before writing. Prefer official, version-matched documentation, source, changelogs, standards, and first-party examples; corroborate risky or ambiguous claims.
- Synthesize instead of copying. Retain source URLs while making each file useful without reopening every source.
- Ask the user when material scope, audience, version, or topic-priority ambiguity would change the wiki.

## Content standard

Each file should provide only the sections useful for its topic:

- concise mental model and key takeaways
- correct, runnable examples with assumptions and version constraints
- day-to-day workflows and recommended defaults
- common failure modes, edge cases, anti-patterns, and diagnostics
- trade-offs and when an alternative is preferable
- links to authoritative sources

Prefer several focused files over one exhaustive document. Avoid generic introductions, duplicated documentation, unsupported opinion, and content saved “just in case.”

## Workflow

1. **Frame.** Confirm the technology, versions, audience, depth, and requested output. Separate reusable knowledge from project-specific material; route the latter to project documentation, `create-plan`, or another owning workflow.
2. **Inventory.** Read the existing `wiki/<topic-name>/` files and relevant dependency/configuration evidence. Identify stale claims, gaps, overlap, and established style before choosing filenames.
3. **Research.** Investigate official documentation, implementation/source, changelogs, and credible real-world failure evidence. Resolve version conflicts; where sources disagree or version behavior can't be established, label the uncertainty and its practical consequence rather than guessing.
4. **Design.** Choose focused topic-area files around actual tasks, boundaries, and pain points. Update existing files instead of creating parallel coverage; preserve accurate material, replace superseded guidance explicitly so no files contradict each other, and leave unrelated topics alone.
5. **Write.** Produce concise, actionable Markdown with examples, pitfalls, version notes, and direct source links. Keep all prose and examples portable to another project using the same technology.
6. **Validate.** Re-read the whole topic set to remove duplication and verify code/API claims against the targeted version.
