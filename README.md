# Maxed Apps Agent Skills

Short, focused skills that nudge capable agents in the right direction instead of prescribing every step.

## Available skills

- `awesome-tests`: write, fix, and review high-value, behavior-focused tests.
- `code-review`: review changes for real defects and unnecessary complexity, and report findings in chat.
- `create-plan`: plan a change as an ADR (`adrs/NNNN-<slug>.md`) plus the plan that belongs to it (`adrs/NNNN-<slug>.plan.md`).
- `create-skill`: write short, focused skills.
- `create-slides`: build, verify, and export templated HTML slide decks (PDF and MP4 at 1080p/2K/4K).
- `create-wiki`: create and update reusable, source-backed technology knowledge bases.
- `generate-image`: generate and edit images through fal.ai (Bun CLI; defaults to Grok Imagine Image 2.0).
- `implement-plan`: hand a plan to an agent in its own herdr worktree, or implement it task by task with high-value tests, self-verification (agent-browser for UI), a final review, and a pull request.
- `use-worktrees`: create (via herdr when available), sync, finish as a pull request, and clean up Git worktrees.

## Install

```sh
npx skills add maxedapps/agent-skills --list
npx skills add maxedapps/agent-skills --skill code-review
npx skills add maxedapps/agent-skills --skill '*'
```

`implement-plan` uses `agent-browser` for UI verification. Install it separately:

```sh
npx skills add vercel-labs/agent-browser@agent-browser
```

## Principles

- Trust the agent's judgment and write down only what it wouldn't do well on its own.
- Challenge complexity. Plans, reviews, and implementations should only address real, likely problems, not niche edge cases or hypothetical scale.
- Decisions live in ADRs, and plans belong to the decision they implement.
- Skills refer to each other by name. None of them depends on another at runtime.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` and optional `references/`, `assets/`, and `scripts/`.

## Validate

```sh
node scripts/validate-skill-metadata.mjs skills
node scripts/validate-skill-links.mjs README.md skills
```

## License

MIT
