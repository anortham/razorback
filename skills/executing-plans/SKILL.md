---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints, or as single-agent fallback when subagent-driven-development is not appropriate
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**When to use this vs. subagent-driven-development:** Use this skill for single-task plans, tightly sequential work, or separate-session execution. For plans with 2+ independent tasks in the same session, prefer `razorback:subagent-driven-development` (or `razorback:team-driven-development` on Claude Code) for parallel execution with inline review.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically: use Julie tools to check that the plan's file paths and symbol references are still valid against current code
3. If you find a real blocker per `skills/using-razorback/references/blocker-taxonomy.md` (especially #3, plan-contradicting data, or #4, safety-critical ambiguity with no plan answer), stop and report
4. For any other design-quality questions, decide the plan-consistent answer and note it in your eventual report (file:line + reason)
5. Create tasks (TaskCreate) and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. **Orient before coding:** Use Julie tools to understand the area before making changes
   - `get_context(query='<task area>')` — token-budgeted codebase orientation
   - `deep_dive(symbol='<symbol to modify>')` — understand callers, callees, types before touching it
   - `fast_refs(symbol='<symbol>')` — check all references before changing any symbol
   - `get_symbols(file_path='<file>')` — see file structure before reading full content
   - **Do NOT fall back to Glob → Read → Grep chains.** Julie tools return targeted context in 1-2 calls.
3. Follow each step exactly (plan has bite-sized steps)
4. Run verifications as specified
5. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use razorback:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## Blockers

The authoritative taxonomy is `skills/using-razorback/references/blocker-taxonomy.md`. Consult it before stopping.

**Bias rules:**
- When in doubt, press on and flag. A line in the morning report is cheaper than a false wake-up.
- Never silently swallow a judgment call. Every non-obvious decision ends up in the report with file:line + reason.

**Real blockers (stop and report):**
1. Credentials / auth / env broken, with no recovery path in the plan
2. Destructive action not authorized by the plan
3. Plan-contradicting data (codebase reality invalidates a load-bearing assumption)
4. Safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer
5. Unresolvable test failures (repeated fix attempts do not converge)

Anything else: pick the plan-consistent option, note the choice in your report, continue. Full definitions in the taxonomy.

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- A teammate flags plan-contradicting state. Re-read the plan and use Julie (`get_context`, `deep_dive`) to check current state. If the plan is still valid, continue. If not, stop per blocker taxonomy #3 (plan-contradicting data).
- Fundamental approach needs rethinking

**Don't force through real blockers.** Stop and report per the taxonomy.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop only for real blockers; decide + note otherwise (see blocker taxonomy)
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **razorback:using-git-worktrees** - Set up isolated workspace before starting. Skip only with explicit user consent (small, single-session work where a feature branch is sufficient).
- **razorback:writing-plans** - Creates the plan this skill executes
- **razorback:finishing-a-development-branch** - Complete development after all tasks
