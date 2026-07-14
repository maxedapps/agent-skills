# Maxed Apps Agent Skills

Reusable agent skills published by [Maxed Apps](https://github.com/maxedapps).

[![skills.sh](https://skills.sh/b/maxedapps/agent-skills)](https://skills.sh/maxedapps/agent-skills)

## Available skills

- `create-plan` — create researched, implementation-ready plans.
- `implement-plan` — execute existing Markdown implementation plans with active tracking and verification.
- `improve-skills` — improve Agent Skills from evidence gathered during real interactions.
- `code-review` — perform adversarial, evidence-bound code reviews and produce an HTML report.
- `review-plan-implementation` — verify an implementation against its source plan and acceptance criteria.
- `use-subagents` — delegate bounded work to visible Herdr-managed agent panes.

## Install

List all available skills:

```sh
npx skills add maxedapps/agent-skills --list
```

Install one skill:

```sh
npx skills add maxedapps/agent-skills@create-plan
```

Or use the explicit option:

```sh
npx skills add maxedapps/agent-skills --skill create-plan
```

Install multiple selected skills:

```sh
npx skills add maxedapps/agent-skills \
  --skill create-plan \
  --skill implement-plan \
  --skill code-review
```

Review each skill and its compatibility requirements before use. Some skills integrate with other skills or external tooling such as Herdr.

## Structure

Each skill is self-contained under `skills/<name>/` with a `SKILL.md` file and optional `references/`, `assets/`, and `scripts/` resources.

## Validate

```sh
for d in skills/*; do
  [ -d "$d" ] && npx -y skills-ref validate "$d"
done
```

Verify CLI discovery without telemetry:

```sh
DISABLE_TELEMETRY=1 npx -y skills@latest add . --list
```

## License

MIT
