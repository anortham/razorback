---
name: executing-plans
description: Use when executing a written implementation plan single-agent — separate-session, single-task, or no-delegation runs.
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**When to use this vs. subagent-driven-development:** Use this skill for single-task plans, tightly sequential work, separate-session execution, or any run where delegation is unavailable. For plans with 2+ independent tasks in the same session, prefer `razorback:subagent-driven-development` for parallel execution with inline review.

**Inputs from `writing-plans`:** plan path, `reviewer_choice` (`none` / `codex` / `claude`, default `none`), and verification strategy. These propagate via the execution handoff and gate Step 3 below.

**Architecture Quality:** The plan's `architecture-quality` output is authoritative. Preserve the approved architecture, do not redesign locally, and report a plan mismatch if code reality contradicts it.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically: use Miller to check that the plan's file paths and symbol references are still valid against current code
3. If you find a real blocker per `../using-razorback/references/blocker-taxonomy.md` (in the razorback plugin) (especially #3, plan-contradicting data, or #4, safety-critical ambiguity with no plan answer), stop and report
4. For any other design-quality questions, decide the plan-consistent answer and note it in your eventual report (file:line + reason)
5. Create tasks (TaskCreate) and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. **Orient before coding:** Use Miller to understand the area before making changes
   - **Orient** — token-budgeted codebase orientation with `context`
   - **Inspect** the symbol to modify — callers, callees, types — before touching it with `inspect(target, depth=full)` (symbols you are editing earn `full`)
   - **Find references** — check all references before changing any symbol with `trace`
   - **List a file's symbols** before reading full content with `inspect`
   - **Prove API shapes** — use Miller evidence for symbol names, function signatures, config shapes, route names, CLI flags, and public contracts before relying on them
   - **Do NOT fall back to Glob → Read → Grep chains.** Miller returns targeted context in 1-2 calls.
3. Follow each step exactly (plan has bite-sized steps)
4. Run verifications as specified
5. Mark as completed (TaskUpdate), then tick that task's acceptance-criteria checkboxes in the plan file (`[ ]` → `[x]`) so the plan document itself records progress alongside the TaskList. This is a fast bookkeeping write — do not pause, request review, or wait for confirmation; continue straight to the next task.
6. Candidate Mode during autonomous execution: record non-required refactor candidates in the report or ADR offer, not in the current work. Only fold in refactors required for correctness, testability, or avoiding a brittle patch without a new user prompt.

### Step 3: Pre-merge external review (if chosen)

If the `reviewer_choice` propagated from `writing-plans` is one of `codex` or `claude`:

**First**, ensure the verification ledger has a passing `branch-gate` entry for the current HEAD. If it does not, run the branch-gate scope now and record the result. The branch-gate run includes the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); `none declared` skips them and is rendered in the morning report. `pre-merge-review` requires this as a precondition.

**Then** invoke `razorback:pre-merge-review`, passing:

- plan path
- reviewer choice
- verification strategy
- verification ledger

If the reviewer choice is `none` (or absent), skip Step 3 entirely.

After `razorback:pre-merge-review` returns its morning-report summary block, proceed to Step 4.

### Step 4: Complete Development

After all tasks complete and verified (and pre-merge review, if any, has run):
- **Reconcile source-control state first:** run Check B of `../using-razorback/references/source-control-hygiene.md`. Status every worktree this run created and every branch the plan produced. Land stranded commits on this branch (re-run the branch gate afterward; the diff changed) or carry them forward as named items for the morning report. Do not proceed to the finish skill with the state unaccounted for.
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use razorback:finishing-a-development-branch
- Follow that skill in Autonomous Mode to verify the branch gate, push, create the PR, write the report, and stop before merge

## Blockers

The authoritative taxonomy is `../using-razorback/references/blocker-taxonomy.md` (in the razorback plugin). Consult it before stopping.

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

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- New codebase evidence flags plan-contradicting state. Re-read the plan and use Miller (`context` + `inspect`) to check current state. If the plan is still valid, continue. If not, stop per blocker taxonomy #3 (plan-contradicting data).
- Fundamental approach needs rethinking

**Don't force through real blockers.** Stop and report per the taxonomy.

## Checkpoints

Write a `goldfish:checkpoint` at phase boundaries (or, for a flat task list, every few completed tasks) to persist progress and decisions across auto-compaction and session restarts. Capture what is done, the key decisions, and the next task to run.

A checkpoint is a fast, non-blocking memory write. It is **not** a stop, a review gate, or a reason to ask the user anything — write it and immediately continue. A phase boundary is a checkpoint trigger, not a stop: finishing a phase never means pausing for confirmation. Checkpoint at phase (or few-task) granularity, not per task; per-task checkpoints are noise.

## Recovery

This sequence runs **only on a resumed run** — a post-compaction note, a mismatch between expected and actual conversation state, or the user says "resume." It never runs during normal forward execution; on a fresh or in-flight run, skip it and keep going.

On a resumed run, orient before continuing:

1. `goldfish:recall` — retrieve the active brief and recent checkpoints.
2. Read the plan file, noting which acceptance-criteria checkboxes are already `[x]`.
3. Check the TaskList for completed / in-progress / pending tasks.
4. `git log --oneline <base>..HEAD` — verify what is actually committed.
5. Identify the next incomplete task and resume execution.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop only for real blockers; if you can reason through a plan-consistent path, take it and note the choice (see blocker taxonomy)
- Never start implementation on main/master branch without explicit user consent
- Never declare the plan complete while a worktree this run created still holds uncommitted or unmerged work you have not named

## Integration

**Required workflow skills:**
- **razorback:using-git-worktrees** - Set up isolated workspace before starting; its Step 0b inventories outstanding worktrees and branches first. Skip only with explicit user consent (small, single-session work where a feature branch is sufficient).
- **`../using-razorback/references/source-control-hygiene.md`** - Check A before creating a worktree, Check B before Step 4 hands off to the finish skill.
- **razorback:writing-plans** - Creates the plan this skill executes; propagates `reviewer_choice` and verification strategy as inputs.
- **razorback:pre-merge-review** - Invoked at Step 3 when `reviewer_choice` is `codex` / `claude`. Skipped if the choice is `none`.
- **razorback:finishing-a-development-branch** - Complete development after all tasks (and pre-merge review, if any)
