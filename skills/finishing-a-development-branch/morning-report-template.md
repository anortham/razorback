<!--
Morning report template for autonomous-execution finish.
Rendered into THREE destinations:
  1. PR description — summary sections only (status, what shipped, external review, blockers, next steps)
  2. .memories/autonomous-run-YYYY-MM-DD-<slug>.md — full detail including judgment calls + dismissed findings
  3. Terminal output — one-line pointer: "Done. PR: <URL>. Report: <path>."
Placeholders use {{double-brace}} syntax.
-->

# Autonomous Execution Report - {{plan_name}}

**Status:** {{status}} <!-- Complete | Blocked | Partial -->
**Plan:** {{plan_path}} <!-- e.g. docs/plans/2026-04-18-autonomous-execution.md -->
**Branch:** {{branch_name}}
**PR:** {{pr_url}} <!-- URL or "not created (blocked)" -->
**Duration:** {{duration}} <!-- e.g. 2h 14m -->
**Phases:** {{phases_complete}}/{{phases_total}} complete
**Tasks:** {{tasks_complete}}/{{tasks_total}} complete

## What shipped
- {{shipped_item_example}} <!-- one line per phase or major task, e.g. "Phase 1: blocker taxonomy reference added to executing-plans / subagent-driven-development" -->
<!-- repeat for each shipped item -->

## Judgment calls (non-blocking decisions made)
- `{{file_path}}:{{line}}` — Chose {{choice_x}} over {{choice_y}} because {{reason}}.
<!-- repeat for every non-obvious decision; examples:
- `skills/executing-plans/SKILL.md:42` — Chose bullet list over table because the section only has 3 items.
- `skills/finishing-a-development-branch/SKILL.md:17` — Named the mode "autonomous" instead of "unattended" because the design doc uses "autonomous" throughout.
-->

## External review ({{reviewer}}, adversarial)
<!-- reviewer is one of: codex | gemini | claude | none. If "none", replace this whole section with: "External review: none (not requested for this run)." -->

- **Findings:** {{findings_total}}
- **Verified real, fixed:** {{findings_fixed_count}} (commits: {{fix_commit_shas}})
  - {{verified_finding_summary}} <!-- e.g. "missing null check in parseReviewOutput — fixed in abc1234" -->
  <!-- repeat for each verified + fixed finding -->
- **Dismissed:** {{findings_dismissed_count}}
  - {{dismissed_finding_summary}} — {{dismissal_reason}} <!-- e.g. "suggested renaming `id` to `identifier` — dismissed, matches project convention" -->
  <!-- repeat for each dismissed finding -->
- **Flagged for your review:** {{findings_flagged_count}}
  - {{flagged_finding_summary}} — {{why_uncertain}} <!-- e.g. "reviewer flagged token-scope widening — requires architectural call, leaving for human review" -->
  <!-- repeat for each flagged finding -->

## Tests
- {{test_summary}} <!-- e.g. "142 passing, 0 failing" — or the failure summary if Status is Blocked -->

## Blockers hit
- {{blockers_summary}} <!-- "None" if clean. Otherwise: description of the blocker + what's needed from the user (credentials, destructive-action authorization, plan clarification, safety-critical disambiguation, unresolvable test failure). -->

## Files changed
- {{files_changed_summary}} <!-- e.g. output of `git diff --stat base..HEAD`, trimmed to the per-file line totals -->

## Next steps
- Review PR: {{pr_url}}
- {{next_step_item}} <!-- specific items flagged for human attention, e.g. "Decide on token-scope widening flagged by reviewer in auth.ts:88" -->
<!-- repeat for each next-step item -->
