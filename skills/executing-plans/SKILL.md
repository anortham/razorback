---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints, or as single-agent fallback when subagent-driven-development is not appropriate
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**When to use this vs. subagent-driven-development:** Use this skill for single-task plans, tightly sequential work, separate-session execution, or any run where delegation is unavailable. For plans with 2+ independent tasks in the same session, prefer `razorback:subagent-driven-development` for parallel execution with inline review.

**Inputs from `writing-plans`:** plan path, `reviewer_choice` (`none` / `codex` / `gemini` / `claude`, default `none`), verification strategy, and model routing. These propagate via the execution handoff and gate Step 3 below.

**Architecture Quality:** The plan's `architecture-quality` output is authoritative. Preserve the approved architecture, do not redesign locally, and report a plan mismatch if code reality contradicts it.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically: use your code-intelligence MCP (julie or miller) to check that the plan's file paths and symbol references are still valid against current code
3. If you find a real blocker per `skills/using-razorback/references/blocker-taxonomy.md` (especially #3, plan-contradicting data, or #4, safety-critical ambiguity with no plan answer), stop and report
4. For any other design-quality questions, decide the plan-consistent answer and note it in your eventual report (file:line + reason)
5. Create tasks (TaskCreate) and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. **Orient before coding:** Use your code-intelligence MCP (julie or miller — whichever is installed) to understand the area before making changes
   - **Orient** — token-budgeted codebase orientation (julie `get_context` / miller `context`)
   - **Inspect** the symbol to modify — callers, callees, types — before touching it (julie `deep_dive` / miller `inspect depth=full`)
   - **Find references** — check all references before changing any symbol (julie `fast_refs` / miller `trace`)
   - **List a file's symbols** before reading full content (julie `get_symbols` / miller `inspect`)
   - **Do NOT fall back to Glob → Read → Grep chains.** The code-intelligence MCP returns targeted context in 1-2 calls.
3. Follow each step exactly (plan has bite-sized steps)
4. Run verifications as specified
5. Mark as completed
6. Candidate Mode during autonomous execution: record non-required refactor candidates in the report or ADR offer, not in the current work. Only fold in refactors required for correctness, testability, or avoiding a brittle patch without a new user prompt.

### Step 3: Pre-merge external review (if chosen)

If the `reviewer_choice` propagated from `writing-plans` is one of `codex`, `gemini`, or `claude`:

**First**, ensure the verification ledger has a passing `branch-gate` entry for the current HEAD. If it does not, run the branch-gate scope now and record the result. `pre-merge-review` requires this as a precondition.

**Then** invoke `razorback:pre-merge-review`, passing:

- plan path
- reviewer choice
- verification strategy
- verification ledger
- model routing

If the reviewer choice is `none` (or absent), skip Step 3 entirely.

After `razorback:pre-merge-review` returns its morning-report summary block, proceed to Step 4.

### Step 4: Complete Development

After all tasks complete and verified (and pre-merge review, if any, has run):
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use razorback:finishing-a-development-branch
- Follow that skill in Autonomous Mode to verify the branch gate, push, create the PR, write the report, and stop before merge

## Blockers

The authoritative taxonomy is `skills/using-razorback/references/blocker-taxonomy.md`. Consult it before stopping.

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
- New codebase evidence flags plan-contradicting state. Re-read the plan and use your code-intelligence MCP (orient + inspect) to check current state. If the plan is still valid, continue. If not, stop per blocker taxonomy #3 (plan-contradicting data).
- Fundamental approach needs rethinking

**Don't force through real blockers.** Stop and report per the taxonomy.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop only for real blockers; if you can reason through a plan-consistent path, take it and note the choice (see blocker taxonomy)
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **razorback:using-git-worktrees** - Set up isolated workspace before starting. Skip only with explicit user consent (small, single-session work where a feature branch is sufficient).
- **razorback:writing-plans** - Creates the plan this skill executes; propagates `reviewer_choice`, verification strategy, and model routing as inputs.
- **razorback:pre-merge-review** - Invoked at Step 3 when `reviewer_choice` is `codex` / `gemini` / `claude`. Skipped if the choice is `none`.
- **razorback:finishing-a-development-branch** - Complete development after all tasks (and pre-merge review, if any)
