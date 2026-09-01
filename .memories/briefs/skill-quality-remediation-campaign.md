---
id: skill-quality-remediation-campaign
title: Skill-quality remediation campaign
status: completed
created: 2026-09-01T13:02:05.623Z
updated: 2026-09-01T14:17:53.414Z
tags:
  - skill-review
  - remediation
---

## Goal

Fix the findings from the 2026-09-01 full skill review (all 28 skills reviewed against razorback:writing-skills).

## Source of truth

`docs/plans/2026-09-01-skill-review-findings.md` — carries every finding, the tier structure, and the execution order. Lives on the `skill-review-remediation` branch (worktree), not on main.

## Direction

- Tier 1: 8 verified defects (stale step ref, two orphaned reviewer prompts, unqualified commit instruction, broken PowerShell block, stale Miller language count, threshold mismatch, bad script path). Fix first.
- Tier 2: cross-reference hygiene — path-based refs → `razorback:<name>`, bare names → prefixed, missing REQUIRED markers.
- Tier 3: structural — intra-skill dedupe (worst: grok-cli, subagent-driven-development, claude/codex-cli, brainstorming), missing "It's working if" / when-NOT-to-use / common-mistakes sections, missing rationalization tables in 6+ discipline skills.
- 4 open design decisions listed in the doc need user input before their slices (using-razorback Miller table, redaction canonicalization, writing-plans template extraction, pressure-testing bar).

## Constraints

- `using-razorback/SKILL.md` is byte-synced with instruction-tier host copies — edit via `scripts/check-rule-copies.mjs` flow, `npm test` guards it.
- Architecture-quality checklist duplication across skills is intentional and test-guarded — do not dedupe.
- Review was static only; no pressure-testing was run. User approved fixing without full RED/GREEN on Tier 1-2 (2026-09-01); Tier 3 behavioral edits get at least spot GREEN checks.
- Merge/PR is the stop point; never merge without the user.

