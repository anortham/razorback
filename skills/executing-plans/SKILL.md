---
name: executing-plans
description: Use when the current agent executes a written implementation plan itself - one coherent task, dependent tasks, no delegation available, or single-agent execution selected.
---

# Executing Plans

One agent runs the approved plan end to end with no inter-task pauses. After approval the run stops only for the blocker taxonomy and the final PR; every other judgment call is decided plan-consistently and noted in the report.

This is the default way to run a plan: the current agent does the work. Use `razorback:subagent-driven-development` instead when the plan has independent tasks, or tasks whose separate context has a clear benefit, and delegation is available and permitted.

**Inputs from `writing-plans`:** plan path, `reviewer_choice` (`none` / `codex` / `claude`), authority ledger (`local_commit_authority`, `push_authority`, `pr_authority`), verification strategy.

**Architecture Quality:** the plan's `architecture-quality` output is authoritative. Preserve the approved architecture; do not redesign locally; report a plan mismatch if code reality contradicts it.

Announce: "I'm using the executing-plans skill to implement this plan."

## Step 1: Load and Review Plan

1. Read the plan. Use code-kb to confirm its file paths and symbol references still match current code.
2. A real blocker per `razorback:using-razorback` `references/blocker-taxonomy.md` (especially #3 or #4) → stop and report. Any other design question → decide plan-consistently, note it (file:line + reason).
3. `TaskCreate` per task.

## Step 2: Execute Tasks

Per task:
1. Mark in_progress.
2. Orient with code-kb before coding: `codebase_outline` on the area; `get_symbol_context` on symbols you edit (`get_symbol_body` for isolated code); `find_references` before changing any symbol; `file_skeleton` before reading a file; prove API shapes (symbol names, signatures, config shapes, routes, CLI flags, public contracts) with code-kb evidence. No Glob → Read → Grep chains.
3. Follow the plan's steps exactly; run the specified verifications.
4. `TaskUpdate` completed, then tick the task's acceptance-criteria checkboxes in the plan file (`[ ]` → `[x]`). Bookkeeping only — do not pause or ask; continue to the next task.
5. Candidate Mode: record non-required refactor candidates in the report or ADR offer, not in the diff. Fold in only refactors required for correctness, testability, or avoiding a brittle patch.

Return to Step 1 review only when new codebase evidence contradicts the plan: re-check with code-kb (`codebase_outline` + `get_symbol_body` / `lookup_symbol`); if the plan fails, that is blocker #3.

## Step 3: Pre-merge external review (if chosen)

If `reviewer_choice` is `codex` or `claude`: ensure the verification ledger has a passing `branch-gate` entry for the current HEAD (run it now if not). Branch-gate includes the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); `none declared` skips them and is rendered in the morning report. Then invoke `razorback:pre-merge-review` with the plan path, reviewer choice, verification strategy, and verification ledger.

Pre-merge-review owns the immutable `REVIEW CAMPAIGN` setup, its external invocation counters, and the terminal `REVIEW CAMPAIGN STATUS`. Preserve those blocks verbatim in checkpoints and the execution report. `none` skips this step.

## Step 4: Complete Development

1. **Reconcile source-control state:** run Check B of `razorback:using-razorback` `references/source-control-hygiene.md`. Status every worktree this run created and every branch the plan produced. Land stranded commits here (re-run the branch gate) or carry them as named morning-report items. Never finish with state unaccounted for.
2. Announce "I'm using the finishing-a-development-branch skill to complete this work." and run `razorback:finishing-a-development-branch` in Autonomous Mode: branch gate, push, PR, report, stop before merge.

## Blockers

The authoritative taxonomy is the `razorback:using-razorback` skill's `references/blocker-taxonomy.md`. Consult it before stopping.

**Bias rules:**
- When in doubt, press on and flag. A line in the morning report is cheaper than a false wake-up.
- Never silently swallow a judgment call. Every non-obvious decision ends up in the report with file:line + reason.
- A blocker is real only when you cannot reason your way to a plan-consistent path forward.

**Real blockers (stop and report):**
1. Credentials / auth / env broken, with no recovery path in the plan
2. Destructive action not authorized by the plan
3. Plan-contradicting data (codebase reality invalidates a load-bearing assumption)
4. Safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer
5. Unresolvable test failures (repeated fix attempts do not converge)

Anything else: pick the plan-consistent option, note the choice in your report, continue. If a reasonable path exists, take it. Full definitions in the taxonomy.

## Checkpoints

Write a `goldfish:checkpoint` before each commit and explicitly stage the checkpoint artifact with the files that commit owns. Also checkpoint at phase boundaries (or every few tasks on a flat list) to persist progress and decisions across auto-compaction and session restarts. Before external review, capture the immutable REVIEW CAMPAIGN setup and current counters; after review, capture the terminal `REVIEW CAMPAIGN STATUS` block.

A checkpoint is a fast, non-blocking memory write. It is **not** a stop, a review gate, or a reason to ask the user anything — write it and immediately continue. A phase boundary is a checkpoint trigger, not a stop: finishing a phase never means pausing for confirmation. One checkpoint per actual commit; never a checkpoint-only follow-up commit, which would recurse.

## Recovery

This sequence runs **only on a resumed run** — a post-compaction note, a mismatch between expected and actual conversation state, or the user says "resume." On a fresh or in-flight run, skip it and keep going.

On a resumed run, orient before continuing:

1. `goldfish:recall` — retrieve the active brief and recent checkpoints.
2. Restore any immutable REVIEW CAMPAIGN setup and current counters from the checkpoint. Counters only increase; participants and budgets never change after resume.
3. If recalled `REVIEW CAMPAIGN STATUS` contains `campaign_closed: yes`, treat it as terminal and do not dispatch another reviewer, even when the state is `capped` or `blocked`.
4. Read the plan file, noting which acceptance-criteria checkboxes are already `[x]`.
5. Check the TaskList for completed / in-progress / pending tasks.
6. `git log --oneline <base>..HEAD` — verify what is actually committed.
7. Identify the next incomplete task and resume execution.

## Remember

- Review the plan critically first; then follow its steps exactly and run every verification.
- Stop only for real blockers; otherwise take the plan-consistent path and note the choice.
- Never start on main/master without explicit user consent.
- Never declare the plan complete while a worktree this run created holds unnamed uncommitted or unmerged work.

## Integration

- `razorback:using-git-worktrees` — isolate first (Step 0b inventories outstanding worktrees); `source-control-hygiene.md` Check A before creating one, Check B before Step 4.
- `razorback:writing-plans` produces the plan and propagates `reviewer_choice`; `razorback:pre-merge-review` at Step 3; `razorback:managing-review-campaigns` owns campaign state; `razorback:finishing-a-development-branch` finishes.
