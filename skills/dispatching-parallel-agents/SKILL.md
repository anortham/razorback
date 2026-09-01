---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

## Overview

Each dispatched agent works from isolated context: it never inherits your session's history — you construct exactly what it needs. That keeps the agent focused and preserves your own context for coordination. When failures are unrelated (different test files, different subsystems, different bugs), sequential investigation wastes time.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

**For plan execution with 2+ independent tasks, prefer `razorback:subagent-driven-development` instead.** Plan-execution skills wire in inline review, file ownership, and fix routing. Use this skill for ad-hoc parallel work outside of plan execution (debugging multiple independent failures, parallel research, etc.).

## When to Use

**Use when:**
- 2+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others) — investigate them together in a single agent first
- Need to understand full system state
- Exploratory debugging — you don't know what's broken yet
- Agents would interfere with each other (editing the same files, using the same resources) — dispatch them sequentially instead

## The Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

Each domain is independent - fixing tool approval doesn't affect abort tests.

### 2. Create Focused Agent Tasks

Each agent prompt is focused (one clear problem domain) and self-contained (all context needed — paste the error messages and test names). Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Gate invariant:** what each assigned failing test, replay, metric, or acceptance gate proves
- **Expected output:** Summary of what you found and fixed
- **Tool guidance (include in every agent prompt — use Miller):**
  - **Orient** on the subsystem independently with Miller `context(query='<area>')`
  - **Inspect** the buggy symbol — callers, callees, types — before modifying with Miller `inspect(target='<fn>', depth=full)`
  - **Find references** — check all references before changing anything with Miller `trace(target='<symbol>')`
  - **List a file's symbols** before reading full content with Miller `inspect(target='<file>')`
  - **Prove API shapes** — use Miller evidence for symbol names, function signatures, config shapes, route names, CLI flags, and public contracts before relying on them
  - Do NOT use Glob → Read → Grep chains. Miller returns targeted context in 1-2 calls.

Example prompt:

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
```

### 3. Dispatch in Parallel

Model choice is left to the lead agent and the harness default unless the user or environment explicitly requests an override. If a lane has hidden invariants, shared lifecycle behavior, weak tests, gate interpretation, or repeated failures, keep it in the lead session or give the worker tighter instructions.

Make all dispatch calls in a single turn so they run concurrently. The dispatch tool differs per harness — use the **Dispatch mechanism** list in `razorback:subagent-driven-development`, plus its **Parallel Dispatch** notes for the per-harness completion and state calls. Ad-hoc dispatch uses the same mechanism as plan execution; only the task source differs.

One addition for ad-hoc dispatch: **Cursor** dispatches with the `Agent` tool exactly as Claude Code does. SDD's list covers Cursor only as a delegation target via `razorback:cursor-agent`.

Example (Claude Code):

```
Agent("Fix agent-tool-abort.test.ts failures")
Agent("Fix batch-completion-behavior.test.ts failures")
Agent("Fix tool-approval-race-conditions.test.ts failures")
# One turn, three calls — all run concurrently
```

### 4. Review and Integrate

When agents return:
- **Review each summary** — understand what each agent changed
- **Check for conflicts** — did agents edit the same code? Do the fixes contradict each other?
- **Run the project-defined integration or branch verification scope** — verify the fixes work together, not just individually
- **Spot check** — agents can make systematic errors; don't trust the summaries alone
- **Integrate all changes**

## Common Mistakes

**❌ Too broad:** "Fix all the tests" - agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**❌ No context:** "Fix the race condition" - agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" - you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

## It's working if

- Every dispatch call went out in one turn, and no two agents touched the same files.
- Each agent prompt named its scope, constraints, gate invariant, and expected output.
- The integration scope ran after return — the fixes were verified together, not just individually.
- Related failures were investigated by one agent, not split across several.
