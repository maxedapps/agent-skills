---
name: improve-skills
description: Improves existing Agent Skills from real interactions by making small, reusable, evidence-backed updates. Use after a skill-driven task or reusable user correction reveals missing guidance, ambiguous instructions, weak description routing, unclear resource pointers, stale tool usage, or content that should move into references/assets/scripts. Do not use for one-off preferences or speculative edits; ask when unsure.
license: MIT
metadata:
  short-description: Improve skills from real interactions
---

# Improve Skills

## Instruction priority

Follow explicit user constraints and higher-priority system/developer instructions over this skill. When the user narrows scope, forbids external tools, asks for chat-only output, or gives a conflicting workflow, adapt accordingly and briefly note any meaningful deviation.

Use this skill to improve existing agent skills from real interactions. Prefer small, durable updates over broad rewrites.

## Core gate

Only edit a skill when the interaction revealed reusable guidance.

Good reasons to edit:

- the description lacks the needed summary, `Use when...` routing, or near-miss boundaries
- important activation guidance exists only in the body instead of the description
- critical instructions appear too late in `SKILL.md`
- the agent may miss key guidance because the skill is too long, vague, or poorly ordered
- references, assets, or scripts lack exact paths, early routing, point-of-use reminders, or clear `when to use` conditions
- outsourced content is required for a workflow but easy to skip
- workflow steps, commands, paths, validation, or safety requirements are ambiguous
- a user correction applies beyond this one task
- tool or script instructions are stale, incomplete, unsafe, or not agent-friendly
- bulky conditional content should move into `references/`, `assets/`, or `scripts/`

Do not edit for:

- one-off preferences
- speculative improvements not grounded in the interaction
- generic advice the agent already knows
- changes unrelated to the skill-driven task
- uncertainty about whether the lesson is reusable; ask the user instead

## Improvement priority

1. Fix the `description` if routing or `when to use` behavior is wrong.
2. Move important trigger guidance into the `description`; the body is too late for activation.
3. Move critical instructions, constraints, and resource pointers earlier in `SKILL.md`.
4. Remove ambiguity from workflows, commands, paths, prerequisites, validation, and safety notes.
5. Move bulky or conditional details into `references/`, `assets/`, or `scripts/` only after adding clear resource routing.
6. Add or update explicit resource pointers for files/resources: exact relative path + what it contains + when to read/use/run it, both early and at point of use when relevant.
7. For cross-skill references, use the skill name, e.g. “read the `create-plan` skill”; do not use relative filesystem paths to another skill’s `SKILL.md`.
8. Delete redundant generic advice, stale examples, and unnecessary options.

Assume some agents may not read the entire skill body after activation. Keep the highest-value rules and resource-routing guidance near the top.

## Workflow

1. Identify relevant skills:
   - Global: `~/.agents/skills/*/SKILL.md`
   - User/global pi skills if present: `~/.pi/agent/skills/*/SKILL.md`
   - Project-local: `.agents/skills/*/SKILL.md`, `.pi/skills/*/SKILL.md`
2. Read the relevant skill files before deciding whether to edit.
3. Decide whether the interaction revealed reusable guidance using the Core gate.
4. If yes, update the most relevant existing skill. Prefer project-local skills for project-specific knowledge and global skills for broadly reusable guidance.
5. If no, do not edit anything. Briefly note that no skill update was warranted when useful.
6. If unsure whether the lesson is reusable or belongs in a skill, ask the user before editing.

## Editing guidance

- Keep updates small, specific, and evidence-based.
- Do not overfit a skill to a single one-off request.
- Update the `description` first when trigger behavior, scope, summary, or non-use boundaries should change.
- Update the body when workflow, constraints, examples, gotchas, tool schemas, scripts, validation steps, or resource pointers should change.
- Preserve existing style and structure unless the structure itself causes ambiguity or hides critical guidance.
- Prefer progressive disclosure over growing `SKILL.md` indefinitely.
- Avoid duplicating generic agent rules that belong in `AGENTS.md`, except when a reusable skill repository intentionally needs portable instruction-priority or safety guidance.

## Quality checks before editing

Consider whether the interaction revealed reusable improvements in these areas:

- Description quality: includes a capability summary, `Use when...` routing, and important `Do not use...` boundaries.
- Activation correctness: no important trigger guidance exists only in the body.
- Partial-read resilience: critical rules and resource pointers appear early.
- Ambiguity: unclear defaults, conditions, commands, paths, prerequisites, expected outputs, or validation criteria.
- Progressive disclosure: content that should move to `references/` or `assets/`, referenced files that need clearer `when to load` routing, or mandatory resources that need point-of-use reminders.
- Resource routing: vague `see references` language, missing exact paths, missing mandatory/conditional load conditions, or outsourced always-needed content.
- Script usability: missing `--help`, interactive prompts, unclear errors, stdout/stderr mixing, missing dry-run, unbounded output, unsafe defaults, or stale command examples.
- Tool/schema drift: examples that use parameters no longer supported by the current tool/runtime.
- Security and portability: committed secrets, local-only absolute paths, hidden auth/session files, unsafe third-party code, or assumptions about unavailable tools.
- Shared standards: if a lesson applies to skill authoring broadly, update `create-skill` or a shared skill-authoring reference rather than patching only one skill.

## Final check

Before finishing, ensure:

- the description contains both a summary and `Use when...` routing
- any important near-miss boundaries are in the description
- no important trigger guidance exists only in the body
- critical instructions are early in `SKILL.md`
- every referenced file has an exact relative path and load/use/run condition
- cross-skill references use skill names, not relative filesystem paths to another skill’s `SKILL.md`
- mandatory resources use `Before doing X, read ...` style instructions
- important resource-loading instructions appear both early and at point of use when relevant
- no vague `see references` style routing remains
- instructions are concise and unambiguous
- bulky conditional content is moved out of `SKILL.md` when appropriate
- commands and scripts are non-interactive, safe, and clear about inputs/outputs

## Validation

After editing a skill, validate when possible:

```sh
npx -y skills-ref validate /path/to/skill
```

If validation is unavailable, manually check:

- `name` matches the directory name
- `description` is concise, trigger-friendly, and under 1024 characters
- instructions are reusable, not just a transcript of the interaction
- file paths and commands are accurate
- no secrets or unsafe assumptions were introduced
