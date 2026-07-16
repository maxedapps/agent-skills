import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const validator = fileURLToPath(new URL('./validate-plan-structure.mjs', import.meta.url))

function run(args, options = {}) {
  return spawnSync(process.execPath, [validator, ...args], { encoding: 'utf8', ...options })
}

async function withFixture(markdown, callback) {
  const root = await mkdtemp(join(tmpdir(), 'validate-plan-structure-'))
  const path = join(root, 'plan.md')
  try {
    await writeFile(path, markdown, 'utf8')
    return await callback(path, root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

function task(phase = 1, taskNumber = 1, title = 'Implement durable behavior') {
  return `#### T${phase}.${taskNumber} — ${title}

**Description**

Implement the bounded change and update discovered integrations.

**Relevant files — non-exhaustive starting points**

- \`lib/feature.mjs\`
- Inspect coupled callers, tests, config, schemas, generated artifacts, docs, and consumers.

**Dependencies**

- None.

**Acceptance and verification**

- Run \`node --test test/feature.test.mjs\`; retain the passing result.
`
}

function phase(number = 1, { risk = '- Preserve rollback behavior and rerun the focused tests.', tasks = task(number) } = {}) {
  return `## Phase ${number} — Deliver outcome ${number}

### Problems addressed

- The current behavior does not satisfy outcome ${number}.

### Implementation summary

Apply the smallest coherent change for this boundary.

### Tasks

${tasks}
### Risks, safeguards, and recovery

${risk}

### Phase validation and review

- **Checks:** Run the focused test and expect a zero exit.
- **Review:** Apply the current \`code-review\` contract with this phase as baseline; resolve material findings and rerun affected checks.
`
}

function validPlan(phases = phase()) {
  return `# Durable implementation plan

> **Status:** Ready for implementation
> **Planning memory:** \`.progress/durable-plan.md\`

## Problems

- A reachable workflow lacks the required behavior.

## Implementation summary

Implement and validate the behavior in dependency order.

## Conducted research and relevant sources

| Source or artifact | Material finding | Implementation impact |
|---|---|---|
| \`lib/current.mjs\` | The existing boundary is centralized. | Modify the boundary and its coupled tests. |

Research used \`<plan-slug>\`, \`<review-slug>\`, and \`$ENVIRONMENT_ID\` as operational metavariables.

## Scope and non-goals

- In scope: the bounded behavior.
- Non-goal: unrelated redesign.

## Decisions and constraints

| Decision | Why | Status / consequence |
|---|---|---|
| Preserve the public contract | Avoid compatibility churn. | Confirmed |

${phases}
## Final validation and review

- Run the authoritative repository gate and apply the current \`code-review\` contract once at final completion.

## Definition of Done

- The behavior and coupled integrations pass their checks with retained evidence.
`
}

test('accepts a complete one-phase plan and reports counts', async () => {
  await withFixture(validPlan(), async (path) => {
    const result = run([path])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Valid plan structure:/)
    assert.match(result.stdout, /\(1 phase, 1 task\)/)
  })
})

test('accepts adaptive multi-phase plans with multiple stable tasks', async () => {
  const phases = phase(1, { tasks: `${task(1, 1)}\n${task(1, 2, 'Update coupled consumers')}` }) + '\n' + phase(2)
  await withFixture(validPlan(phases), async (path) => {
    const result = run([path])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /\(2 phases, 3 tasks\)/)
  })
})

test('accepts the explicit no-material-risk result', async () => {
  await withFixture(validPlan(phase(1, { risk: 'None material for this phase' })), async (path) => {
    const result = run([path])
    assert.equal(result.status, 0, result.stderr)
  })
})

test('reports every missing required top-level section precisely', async (context) => {
  for (const heading of [
    'Problems',
    'Implementation summary',
    'Conducted research and relevant sources',
    'Scope and non-goals',
    'Decisions and constraints',
    'Final validation and review',
    'Definition of Done',
  ]) {
    await context.test(heading, async () => {
      const malformed = validPlan().replace(new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n[^#]*`), '')
      await withFixture(malformed, async (path) => {
        const result = run([path])
        assert.equal(result.status, 1)
        assert.match(result.stderr, new RegExp(`Missing required heading: ## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      })
    })
  }
})

test('rejects a missing phase section, including risk and recovery', async (context) => {
  for (const heading of [
    'Problems addressed',
    'Implementation summary',
    'Tasks',
    'Risks, safeguards, and recovery',
    'Phase validation and review',
  ]) {
    await context.test(heading, async () => {
      const malformed = validPlan().replace(`### ${heading}`, `### Omitted ${heading}`)
      await withFixture(malformed, async (path) => {
        const result = run([path])
        assert.equal(result.status, 1)
        assert.match(result.stderr, new RegExp(`Phase 1 is missing: ### ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      })
    })
  }
})

test('rejects each missing task field with the task ID', async (context) => {
  for (const field of [
    'Description',
    'Relevant files — non-exhaustive starting points',
    'Dependencies',
    'Acceptance and verification',
  ]) {
    await context.test(field, async () => {
      const malformed = validPlan().replace(`**${field}**`, `**Omitted ${field}**`)
      await withFixture(malformed, async (path) => {
        const result = run([path])
        assert.equal(result.status, 1)
        assert.match(result.stderr, new RegExp(`T1\\.1 is missing field: \\*\\*${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`))
      })
    })
  }
})

test('rejects untitled or mismatched task IDs while allowing adaptive task numbers', async () => {
  const malformed = validPlan().replace('#### T1.1 — Implement durable behavior', '#### T2.7 — Implement durable behavior')
  await withFixture(malformed, async (path) => {
    const result = run([path])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /T2\.7 must use its containing phase number T1\.N/)
  })
})

test('rejects narrow unresolved template sentinels', async (context) => {
  for (const sentinel of ['[Plan title]', '[Task title]', 'src/example.ts', 'REPLACE_ME']) {
    await context.test(sentinel, async () => {
      await withFixture(`${validPlan()}\n${sentinel}\n`, async (path) => {
        const result = run([path])
        assert.equal(result.status, 1)
        assert.match(result.stderr, /\[placeholder\] Unresolved template sentinel:/)
        assert.match(result.stderr, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      })
    })
  }
})

test('rejects inline template sentinels in ordinary plan content', async () => {
  const copiedTemplatePath = validPlan().replace('`lib/feature.mjs`', '`src/example.ts`')
  await withFixture(copiedTemplatePath, async (path) => {
    const result = run([path])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /\[placeholder\] Unresolved template sentinel: src\/example\.ts/)
  })
})

test('ignores fenced code, documented inline examples, and HTML comments but permits operational metavariables', async () => {
  const fencedPrefix = `\`\`\`md
<!-- This comment opener is inert inside the fence.
## Problems
REPLACE_ME
\`\`\`

`
  const additions = `

\`REPLACE_ME\`, \`src/example.ts\`, and \`[Task title]\` are documented examples.

\`\`\`md
## Problems
[Plan title]
REPLACE_ME
\`\`\`

<!--
## Phase 99 — [Plan title]
#### T99.1 — [Task title]
src/example.ts
-->

Allowed runtime forms: <plan-slug>, <research-slug>, <review-slug>, $SERVICE_ID, and [operator-value].
`
  await withFixture(fencedPrefix + validPlan() + additions, async (path) => {
    const result = run([path])
    assert.equal(result.status, 0, result.stderr)
  })
})

test('does not count headings hidden in code or comments', async () => {
  const malformed = validPlan().replace('## Problems\n', '## Missing problems\n') + `
\`\`\`md
## Problems
\`\`\`
<!-- ## Problems -->
`
  await withFixture(malformed, async (path) => {
    const result = run([path])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Missing required heading: ## Problems/)
  })
})

test('bounds diagnostics and produces deterministic errors', async () => {
  const malformed = validPlan() + Array.from({ length: 70 }, () => 'REPLACE_ME').join('\n')
  await withFixture(malformed, async (path) => {
    const first = run([path])
    const second = run([path])
    assert.equal(first.status, 1)
    assert.equal(first.stderr, second.stderr)
    assert.equal((first.stderr.match(/\[placeholder\]/g) || []).length, 50)
    assert.match(first.stderr, /20 additional violation\(s\) omitted; limit is 50/)
  })
})

test('implements help and stable usage/read exit behavior', async () => {
  const help = run(['--help'])
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /Usage:/)
  assert.match(help.stdout, /Exit codes:/)

  const missingOperand = run([])
  assert.equal(missingOperand.status, 2)
  assert.match(missingOperand.stderr, /Expected exactly one Markdown plan path/)

  const unknownOption = run(['--wat'])
  assert.equal(unknownOption.status, 2)
  assert.match(unknownOption.stderr, /Unknown option: --wat/)

  const absent = run([join(tmpdir(), 'definitely-absent-plan.md')])
  assert.equal(absent.status, 2)
  assert.match(absent.stderr, /Cannot read plan/)
})
