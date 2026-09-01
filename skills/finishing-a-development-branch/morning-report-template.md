<!--
Morning report template for autonomous-execution finish.
Rendered into THREE destinations:
  1. PR description — summary sections only (status, what shipped, external review, blockers, next steps)
  2. .memories/autonomous-run-YYYY-MM-DD-<slug>.md — full detail including judgment calls + dismissed findings.
     Its visual digest sibling <slug>.html (composed per the razorback:using-razorback skill's
     references/digest-kit.md) is opt-in — written only when the user requested a digest.
  3. Terminal output — one-line pointer: "Done. PR: <URL>. Report: <path>.md." (plus " Digest: <path>.html"
     when a digest was requested)
Placeholders use {{double-brace}} syntax.
-->

# Autonomous Execution Report - {{plan_name}}

**Status:** {{status}} <!-- Complete | Blocked | Partial -->
**Plan:** {{plan_path}} <!-- e.g. docs/plans/2026-04-18-autonomous-execution.md -->
**Branch:** {{branch_name}}
**PR:** {{pr_url}} <!-- URL (written back after PR creation), "pending — filled in after PR creation", "not created — open <creation-url>" (forge-ladder rung 3: branch pushed, PR needs one click), or "not created (blocked)" -->
**Duration:** {{duration}} <!-- e.g. 2h 14m -->
**Phases:** {{phases_complete}}/{{phases_total}} complete
**Tasks:** {{tasks_complete}}/{{tasks_total}} complete
**External-model policy:** {{policy_status}} <!-- policy honored (<providers>) | no policy declared — <provider> received the diff | refused: <provider> not allowed | aggregate every external dispatch in the run, not only the pre-merge reviewer -->

## What shipped
- {{shipped_item_example}} <!-- one line per phase or major task, e.g. "Phase 1: blocker taxonomy reference added to executing-plans / subagent-driven-development" -->
<!-- repeat for each shipped item -->

## Judgment calls (non-blocking decisions made)
- `{{file_path}}:{{line}}` — Chose {{choice_x}} over {{choice_y}} because {{reason}}.
<!-- repeat for every non-obvious decision; examples:
- `src/report/render.ts:42` — Chose bullet list over table because the section only has 3 items.
- `skills/finishing-a-development-branch/SKILL.md:17` — Named the mode "autonomous" instead of "unattended" because the design doc uses "autonomous" throughout.
-->

## External review ({{reviewer}}, adversarial)
<!-- reviewer is one of: codex | claude | none. If "none", replace this whole section with: "External review: none (not requested for this run)." -->
- **Passes:** general {{general_findings_count}} / security {{security_findings_count}}

- **Findings:** {{findings_total}}
- **Verified real, fixed:** {{findings_fixed_count}} (commits: {{fix_commit_shas}})
  - {{verified_finding_summary}} <!-- prefix each finding title with its pass label, e.g. "[general] missing null check in parseReviewOutput — fixed in abc1234" or "[security] path traversal in loadReport — fixed in def5678"; a finding raised by both passes is labeled "[general+security]" -->
  <!-- repeat for each verified + fixed finding -->
- **Dismissed:** {{findings_dismissed_count}}
  - {{dismissed_finding_summary}} — {{dismissal_reason}} <!-- pass label on the title, e.g. "[general] suggested renaming `id` to `identifier` — dismissed, matches project convention" -->
  <!-- repeat for each dismissed finding -->
- **Flagged for your review:** {{findings_flagged_count}}
  - {{flagged_finding_summary}} — {{why_uncertain}} <!-- pass label on the title, e.g. "[security] reviewer flagged token-scope widening — requires architectural call, leaving for human review" -->
  <!-- repeat for each flagged finding -->
- **Cost:** {{cost_note}} <!-- one note per invocation: claude renders cost from each result envelope (.total_cost_usd, .usage) — sum the general + security passes; no spend cap is set, so report the actual cost; codex still reports no per-request counts — note the absence rather than faking a number -->

## Review campaign
<!-- Always render this section. For a run with no review campaign, use "not run" for state/evidence and "0/0" for round/invocations. -->
- **State:** {{review_campaign_state}} <!-- clean | capped | blocked | not run -->
- **Evidence:** {{review_campaign_evidence}} <!-- lead-only | fresh-session | external-reviewed | cross-model-reviewed | not run -->
- **Round:** {{review_campaign_round}}
- **External invocations:** {{review_campaign_external_invocations}}
- **Open critical/high:** {{review_campaign_open_critical_high}}
- **Open medium/low:** {{review_campaign_open_medium_low}}
- **Open at/above floor:** {{review_campaign_open_above_floor}}

## Tests
- {{test_summary}} <!-- e.g. "142 passing, 0 failing" — or the failure summary if Status is Blocked -->

## Blockers hit
- {{blockers_summary}} <!-- "None" if clean. Otherwise: description of the blocker + what's needed from the user (credentials, destructive-action authorization, plan clarification, safety-critical disambiguation, unresolvable test failure). -->

## Files changed
- {{files_changed_summary}} <!-- e.g. output of `git diff --stat base..HEAD`, trimmed to the per-file line totals -->

## Source control
<!-- Rendered from Step 2a (Check B, references/source-control-hygiene.md). Never omit this section:
     "nothing outstanding" is itself the reconciliation result and must be stated. -->
- **Outstanding:** {{outstanding_work_summary}} <!-- "None — all commits ride on {{branch_name}}." Otherwise one line per stranded item: "<path> on <branch> — N commits not in this PR (left because <reason>)" or "<path> — M uncommitted files (left because <reason>)" -->
- **Worktrees left in place:** {{worktrees_retained}} <!-- one line per retained worktree with why, e.g. "~/.config/razorback/worktrees/<project>/<branch> — kept, PR open" or "None". User-owned worktrees are listed here and never removed. -->

## Next steps
- Review PR: {{pr_url}}
- {{next_step_item}} <!-- specific items flagged for human attention, e.g. "Decide on token-scope widening flagged by reviewer in auth.ts:88" -->
<!-- repeat for each next-step item -->
