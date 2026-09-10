<!--
Rendered into three destinations: PR description (status, what shipped, external review, blockers, next steps),
.memories/autonomous-run-YYYY-MM-DD-<slug>.md (full), and the one-line terminal pointer.
The .html digest sibling (razorback:using-razorback references/digest-kit.md) is opt-in only.
-->

# Autonomous Execution Report - {{plan_name}}

**Status:** {{status}} <!-- Complete | Blocked | Partial | Awaiting publication approval -->
**Plan:** {{plan_path}}
**Branch:** {{branch_name}}
**PR:** {{pr_url}} <!-- URL | "pending — filled in after PR creation" | "not created — open <creation-url>" | "not created (blocked)" -->
**Publication authority:** local commit={{local_commit_authority}}; push={{push_authority}}; PR={{pr_authority}} <!-- each value names its source; push/PR add authorized/missing -->
**Duration:** {{duration}}
**Phases:** {{phases_complete}}/{{phases_total}} complete
**Tasks:** {{tasks_complete}}/{{tasks_total}} complete
**External-model policy:** {{policy_status}} <!-- policy honored (<providers>) | no policy declared — <provider> received the diff | refused: <provider> not allowed; aggregate every external dispatch in the run -->

## What shipped
- {{shipped_item_example}} <!-- one line per phase or major task -->

## Judgment calls (non-blocking decisions made)
- `{{file_path}}:{{line}}` — Chose {{choice_x}} over {{choice_y}} because {{reason}}.

## External review ({{reviewer}}, adversarial)
<!-- reviewer: codex | claude | none. If none, replace this section with: "External review: none (not requested for this run)." -->
- **Passes:** general {{general_findings_count}} / security {{security_findings_count}}
- **Findings:** {{findings_total}}
- **Verified real, fixed:** {{findings_fixed_count}} (commits: {{fix_commit_shas}})
  - {{verified_finding_summary}} <!-- prefix with pass label: [general], [security], or [general+security] -->
- **Dismissed:** {{findings_dismissed_count}}
  - {{dismissed_finding_summary}} — {{dismissal_reason}}
- **Flagged for your review:** {{findings_flagged_count}}
  - {{flagged_finding_summary}} — {{why_uncertain}}
- **Cost:** {{cost_note}} <!-- claude: sum .total_cost_usd/.usage across passes; codex: note the absence of per-request counts, never fake a number -->

## Review campaign
<!-- Always render. No campaign: "not run" for state/evidence, "0/0" for round/invocations. -->
- **State:** {{review_campaign_state}} <!-- clean | capped | blocked | not run -->
- **Evidence:** {{review_campaign_evidence}} <!-- lead-only | fresh-session | external-reviewed | cross-model-reviewed | not run -->
- **Round:** {{review_campaign_round}}
- **External invocations:** {{review_campaign_external_invocations}}
- **Open critical/high:** {{review_campaign_open_critical_high}}
- **Open medium/low:** {{review_campaign_open_medium_low}}
- **Open at/above floor:** {{review_campaign_open_above_floor}}

## Tests
- {{test_summary}} <!-- e.g. "142 passing, 0 failing", or the failure summary when Blocked -->

## Blockers hit
- {{blockers_summary}} <!-- "None", or the blocker plus what the user must supply -->

## Files changed
- {{files_changed_summary}} <!-- `git diff --stat base..HEAD`, per-file lines -->

## Source control
<!-- From Step 2a (Check B). Never omit: "nothing outstanding" is itself the result. -->
- **Outstanding:** {{outstanding_work_summary}} <!-- "None — all commits ride on {{branch_name}}." or one line per stranded item with its reason -->
- **Worktrees left in place:** {{worktrees_retained}} <!-- one line per retained worktree with why, or "None"; user-owned worktrees are listed, never removed -->

## Next steps
- Review PR: {{pr_url}}
- {{next_step_item}}
