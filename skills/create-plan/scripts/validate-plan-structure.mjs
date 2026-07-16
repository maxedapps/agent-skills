#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const MAX_DIAGNOSTICS = 50
const REQUIRED_TOP_SECTIONS = [
  'Problems',
  'Implementation summary',
  'Conducted research and relevant sources',
  'Scope and non-goals',
  'Decisions and constraints',
  'Final validation and review',
  'Definition of Done',
]
const REQUIRED_PHASE_SECTIONS = [
  'Problems addressed',
  'Implementation summary',
  'Tasks',
  'Risks, safeguards, and recovery',
  'Phase validation and review',
]
const REQUIRED_TASK_FIELDS = [
  'Description',
  'Relevant files — non-exhaustive starting points',
  'Dependencies',
  'Acceptance and verification',
]
const SENTINELS = [
  { pattern: /\[Plan title\]/gi, label: '[Plan title]' },
  { pattern: /\[Task title\]/gi, label: '[Task title]' },
  { pattern: /\bsrc\/example\.ts\b/g, label: 'src/example.ts' },
  { pattern: /\bREPLACE_ME\b/g, label: 'REPLACE_ME' },
]

function usage(stream = process.stdout) {
  stream.write(`Validate the required Markdown structure of an implementation plan.\n\nUsage:\n  node scripts/validate-plan-structure.mjs <plan.md>\n\nExit codes:\n  0  Valid structure\n  1  Structural or template-sentinel violations\n  2  Usage or read error\n`)
}

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--help') {
  usage()
  process.exit(0)
}
if (args.length !== 1 || args[0].startsWith('-')) {
  console.error(args.some((argument) => argument.startsWith('-')) ? `Unknown option: ${args.find((argument) => argument.startsWith('-'))}` : 'Expected exactly one Markdown plan path.')
  usage(process.stderr)
  process.exit(2)
}

const inputPath = resolve(args[0])
let markdown
try {
  markdown = await readFile(inputPath, 'utf8')
} catch (error) {
  console.error(`Cannot read plan ${inputPath}: ${error?.message || error}`)
  process.exit(2)
}

const result = validatePlan(markdown)
if (result.errors.length > 0) {
  const shown = result.errors.slice(0, MAX_DIAGNOSTICS)
  for (const error of shown) {
    console.error(`${inputPath}:${error.line}: [${error.category}] ${error.message}`)
  }
  if (result.errors.length > shown.length) {
    console.error(`${inputPath}: [diagnostics] ${result.errors.length - shown.length} additional violation(s) omitted; limit is ${MAX_DIAGNOSTICS}.`)
  }
  process.exit(1)
}

console.log(`Valid plan structure: ${inputPath} (${result.phaseCount} phase${result.phaseCount === 1 ? '' : 's'}, ${result.taskCount} task${result.taskCount === 1 ? '' : 's'}).`)

function validatePlan(markdown) {
  const lines = sanitizeMarkdown(markdown)
  const errors = []
  const addError = (line, category, message) => errors.push({ line, category, message })
  const headings = lines.flatMap((text, index) => {
    const match = text.match(/^ {0,3}(#{2,4})\s+(.+?)\s*#*\s*$/)
    return match ? [{ level: match[1].length, text: match[2].trim(), line: index + 1, index }] : []
  })
  const h2s = headings.filter((heading) => heading.level === 2)

  for (const section of REQUIRED_TOP_SECTIONS) {
    const matches = h2s.filter((heading) => sameLabel(heading.text, section))
    if (matches.length === 0) addError(1, 'top-level', `Missing required heading: ## ${section}`)
    for (const duplicate of matches.slice(1)) addError(duplicate.line, 'top-level', `Duplicate required heading: ## ${section}`)
  }

  const phaseHeadings = h2s.flatMap((heading) => {
    const match = heading.text.match(/^Phase\s+(\d+)\s+(?:—|-)\s+(.+)$/i)
    return match ? [{ ...heading, number: Number(match[1]), title: match[2].trim() }] : []
  })
  if (phaseHeadings.length === 0) addError(1, 'phase', 'At least one numbered, titled phase heading is required (for example, ## Phase 1 — Outcome).')

  const seenPhases = new Map()
  const seenTasks = new Map()
  let taskCount = 0

  for (const phase of phaseHeadings) {
    if (seenPhases.has(phase.number)) {
      addError(phase.line, 'phase', `Duplicate phase number ${phase.number}; first used on line ${seenPhases.get(phase.number)}.`)
    } else {
      seenPhases.set(phase.number, phase.line)
    }

    const nextH2 = h2s.find((heading) => heading.index > phase.index)
    const phaseEnd = nextH2?.index ?? lines.length
    const phaseHeadingsInside = headings.filter((heading) => heading.index > phase.index && heading.index < phaseEnd)
    const h3s = phaseHeadingsInside.filter((heading) => heading.level === 3)

    for (const section of REQUIRED_PHASE_SECTIONS) {
      const matches = h3s.filter((heading) => sameLabel(heading.text, section))
      if (matches.length === 0) addError(phase.line, 'phase', `Phase ${phase.number} is missing: ### ${section}`)
      for (const duplicate of matches.slice(1)) addError(duplicate.line, 'phase', `Phase ${phase.number} duplicates: ### ${section}`)
    }

    const tasksHeading = h3s.find((heading) => sameLabel(heading.text, 'Tasks'))
    if (!tasksHeading) continue
    const nextH3 = h3s.find((heading) => heading.index > tasksHeading.index)
    const tasksEnd = nextH3?.index ?? phaseEnd
    const h4s = phaseHeadingsInside.filter((heading) => heading.level === 4 && heading.index > tasksHeading.index && heading.index < tasksEnd)
    const tasks = []

    for (const heading of h4s) {
      const match = heading.text.match(/^(T(\d+)\.(\d+))\s+(?:—|-)\s+(.+)$/)
      if (!match) {
        addError(heading.line, 'task', `Invalid task heading; expected #### T${phase.number}.N — Titled action.`)
        continue
      }
      const task = { ...heading, id: match[1], phaseNumber: Number(match[2]), title: match[4].trim() }
      tasks.push(task)
      taskCount += 1
      if (task.phaseNumber !== phase.number) addError(task.line, 'task', `${task.id} must use its containing phase number T${phase.number}.N.`)
      if (seenTasks.has(task.id)) {
        addError(task.line, 'task', `Duplicate task ID ${task.id}; first used on line ${seenTasks.get(task.id)}.`)
      } else {
        seenTasks.set(task.id, task.line)
      }
    }

    if (tasks.length === 0) addError(tasksHeading.line, 'task', `Phase ${phase.number} must contain at least one stable-ID titled task.`)

    for (const [taskIndex, task] of tasks.entries()) {
      const taskEnd = tasks[taskIndex + 1]?.index ?? tasksEnd
      const taskLines = lines.slice(task.index + 1, taskEnd)
      const fields = taskLines.flatMap((text, index) => {
        const match = text.match(/^\s*\*\*(Description|Relevant files\s+(?:—|-)\s+non-exhaustive starting points|Dependencies|Acceptance and verification):?\*\*(?:\s*:\s*.*|\s*)$/i)
        return match ? [{ label: canonicalTaskField(match[1]), line: task.index + index + 2 }] : []
      })
      for (const field of REQUIRED_TASK_FIELDS) {
        const matches = fields.filter((candidate) => candidate.label === field)
        if (matches.length === 0) addError(task.line, 'task-field', `${task.id} is missing field: **${field}**`)
        for (const duplicate of matches.slice(1)) addError(duplicate.line, 'task-field', `${task.id} duplicates field: **${field}**`)
      }
    }
  }

  for (const [index, text] of lines.entries()) {
    for (const sentinel of SENTINELS) {
      sentinel.pattern.lastIndex = 0
      while (sentinel.pattern.exec(text)) addError(index + 1, 'placeholder', `Unresolved template sentinel: ${sentinel.label}`)
    }
  }

  errors.sort((left, right) => left.line - right.line || left.category.localeCompare(right.category) || left.message.localeCompare(right.message))
  return { errors: deduplicate(errors), phaseCount: phaseHeadings.length, taskCount }
}

function sameLabel(actual, expected) {
  return actual.trim().toLocaleLowerCase('en-US') === expected.toLocaleLowerCase('en-US')
}

function canonicalTaskField(label) {
  const normalized = label.toLocaleLowerCase('en-US').replace(/\s+-\s+/, ' — ')
  return REQUIRED_TASK_FIELDS.find((field) => field.toLocaleLowerCase('en-US') === normalized) || label
}

function deduplicate(errors) {
  const seen = new Set()
  return errors.filter((error) => {
    const key = `${error.line}\0${error.category}\0${error.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sanitizeMarkdown(markdown) {
  const rawLines = markdown.split(/\r?\n/)
  let fence = null
  let inComment = false

  return rawLines.map((rawLine) => {
    if (fence) {
      const closing = rawLine.match(/^ {0,3}(`+|~+)\s*$/)
      if (closing && closing[1][0] === fence.character && closing[1].length >= fence.length) fence = null
      return ''
    }

    const withoutComments = stripHtmlComments(rawLine, inComment)
    inComment = withoutComments.inComment
    const line = withoutComments.text
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (opening) {
      fence = { character: opening[1][0], length: opening[1].length }
      return ''
    }
    return stripInlineCode(line)
  })
}

function stripHtmlComments(line, initialState) {
  let inComment = initialState
  let cursor = 0
  let output = ''
  while (cursor < line.length) {
    if (inComment) {
      const close = line.indexOf('-->', cursor)
      if (close === -1) {
        output += ' '.repeat(line.length - cursor)
        cursor = line.length
      } else {
        output += ' '.repeat(close + 3 - cursor)
        cursor = close + 3
        inComment = false
      }
    } else {
      const open = line.indexOf('<!--', cursor)
      if (open === -1) {
        output += line.slice(cursor)
        cursor = line.length
      } else {
        output += line.slice(cursor, open) + ' '.repeat(4)
        cursor = open + 4
        inComment = true
      }
    }
  }
  return { text: output, inComment }
}

function stripInlineCode(line) {
  const context = line.replace(/(`+)(.*?)\1/g, ' ')
  const documentedExample = /\b(?:documented|illustrative)\s+(?:inline\s+)?examples?\b/i.test(context)
  let output = ''
  let cursor = 0
  while (cursor < line.length) {
    if (line[cursor] !== '`') {
      output += line[cursor]
      cursor += 1
      continue
    }
    let runEnd = cursor
    while (line[runEnd] === '`') runEnd += 1
    const marker = line.slice(cursor, runEnd)
    const close = line.indexOf(marker, runEnd)
    if (close === -1) {
      output += marker
      cursor = runEnd
      continue
    }
    const code = line.slice(runEnd, close)
    const containsSentinel = SENTINELS.some(({ pattern }) => {
      pattern.lastIndex = 0
      return pattern.test(code)
    })
    output += containsSentinel && !documentedExample ? code : ' '.repeat(close + marker.length - cursor)
    cursor = close + marker.length
  }
  return output
}
