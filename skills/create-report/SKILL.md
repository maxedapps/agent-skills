---
name: create-report
description: >-
  Creates concise, evidence-backed, actionable standalone HTML reports for
  decisions, assessments, research, and status outcomes. Use this skill when
  asked to create, build, or package a polished standalone HTML report,
  decision brief, cited research report, risk-assessment report,
  project-status report, or executive HTML report and no domain-specific
  workflow owns the task. Do not use as an automatic completion gate; for
  completed repository-change handoffs use `create-changes-report`; for
  defect reviews use `code-review`; when `explain` is explicitly invoked use
  `explain`; for slide decks use `create-slides`; `create-plan`, `decomplex`,
  and `implement-plan` keep their domains; live KPI dashboards or apps are
  implementation, not this skill.
license: MIT
compatibility: >-
  Requires local file-write access and browser automation for mandatory render
  QA.
metadata:
  short-description: Create standalone HTML decision and status reports
---

# Create Report

Follow the user's brief first. Capture purpose, audience, question or decision, sources, output path, tone or branding, required sections, depth, and constraints before choosing structure. User-selected HTML structure and style override defaults when they stay truthful, safe, accessible, and compatible. Ask only when a missing choice materially changes the artifact.

This skill is not a completion gate. Produce a report only for an explicit standalone HTML artifact when no adjacent workflow owns the task.

## Critical rules

- Default to one offline `reports/<descriptive-slug>.html`. Do not overwrite an existing path without explicit approval.
- Keep the executive layer to about five minutes: answer or outcome, scope, key evidence, implications, and next action.
- Label material ambiguity `Observed`, `Source-reported`, `Inference`, or `Unknown`. Cite relocatable sources. Never invent metrics, confidence, ownership, dates, status, rationale, or citations.
- Findings state evidence, consequence, and next action. Recommendations state basis, expected effect, trade-off, assumptions, and prerequisites. Use `Unassigned`, `TBD`, or `Unknown` rather than filling gaps.
- Every retained headline number and key conclusion reaches evidence through an ordinary on-page fragment link or a labelled dialog. Dialogs are optional; central evidence stays on-page and print-available. Core content and section navigation work without JavaScript.
- Escape inserted content. Reject unsafe URL schemes. Allow safe citation links. Embed only approved assets. Redact secrets, credentials, tokens, and PII.
- Do not adopt another workflow's authority. A report is not a `code-review`, plan, complexity audit, change handoff, or live app.
- Before choosing structure, read [`references/report-design.md`](references/report-design.md). It is mandatory.
- Final audit is required: every material number and claim resolves to support, unsupported claims are removed or labelled, and the report does not adopt another workflow's authority.

## Workflow

1. Establish the brief and authority from the user request. Record the captured fields above. If another named workflow owns the task, stop and use that skill.
2. Gather and verify sources. Read supplied files, data, and named artifacts. Research only missing current external claims with `web-research`. Omit or label anything you cannot relocate.
3. Before choosing an archetype, read [`references/report-design.md`](references/report-design.md). Select one archetype and only the modules that change the decision or understanding.
4. Copy [`assets/report-template.html`](assets/report-template.html) into the approved output path and replace exemplar content. Do not restyle from scratch. Honor truthful, safe, accessible, compatible user overrides.
5. Audit evidence, actions, redaction, and drill-downs. Confirm every headline number and key conclusion has an on-page target; owners, dates, and status that were not supplied stay `Unassigned`, `TBD`, or `Unknown`.
6. Run the final audit in Critical rules. Then browser-validate the `file://` artifact in light, dark, ~320px, print, reduced-motion, and script-stripped modes. Check fragment navigation, any dialog keyboard and focus behavior, print-visible evidence, no overflow, no external requests, and no console or page errors.
7. Clean up temporary copies, screenshots, PDFs, and browser state. Do not leave sidecars beside the report.
8. Return the artifact path plus limitations, skips, and unresolved unknowns. Never claim an unrun check passed.

## Resources

- [`references/report-design.md`](references/report-design.md) — executive spine, archetypes, optional modules, evidence labels, actions, interaction, visuals, accessibility, source safety, and the deletion pass. Read before choosing structure (workflow step 3).
- [`assets/report-template.html`](assets/report-template.html) — standalone generic HTML foundation and one working example of each retained component. Copy it when producing a report (workflow step 4); replace exemplar content rather than restyling from scratch.

## Validation

Run from the skill catalog root after skill maintenance:

- `node scripts/validate-skill-metadata.mjs skills/create-report`; expect valid name, routing, compatibility, and no starter sentinels.
- `node scripts/validate-skill-links.mjs skills/create-report`; expect every local resource link to resolve.
- `npx -y skills-ref validate skills/create-report`; expect the skill schema to validate.
