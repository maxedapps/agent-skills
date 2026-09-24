---
name: create-skill
description: >-
  Creates and improves short, focused Agent Skills. Use this skill when writing
  or revising a SKILL.md, its description, or its bundled files. Do not use for
  installing third-party skills or for one-off preferences.
license: MIT
---

# Create Skill

A skill nudges a capable agent in the right direction. It is not a procedure manual. Trust the agent's judgment and write down only what it would not do well on its own.

## Frontmatter

- `name`: lowercase kebab-case, matches the directory.
- `description`: all routing lives here, because the body only loads after activation. Format: `[What it does]. Use this skill when [triggers]. Do not use for [near misses].` Under 1024 characters.

## Body

- One job per skill. Aim for well under 500 words.
- Say what matters and why, in plain sentences or short bullets. Cut anything the agent already does by default.
- Prescribe exact steps only where mistakes are costly: destructive, security-sensitive, or fragile operations.
- Don't add process for its own sake: no checklists, stop conditions, label systems, report files, review loops, or instructions to use subagents.
- Don't handle niche edge cases. Challenge every rule: does it prevent a real, likely mistake? If not, delete it.
- Add `references/`, `assets/`, or `scripts/` only for genuinely large or reusable material, and say when to use each file.
- Refer to other skills by name, never by path into their files.

## Finish

- In this repository, run `node scripts/validate-skill-metadata.mjs <skill>` and `node scripts/validate-skill-links.mjs <skill>`.
- Try the skill once on a realistic task and fix what actually went wrong.
