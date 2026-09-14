---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

One agent per independent problem domain, dispatched concurrently. Each agent starts with no session history; you construct exactly the context it needs.

For plan execution use `razorback:subagent-driven-development` instead — it adds inline review, file ownership, and fix routing. This skill is for ad-hoc parallel work: independent test failures, parallel research, separate subsystems.

**Use when:** 2+ failures with different root causes, independent subsystems, no shared state, each problem understandable alone.

**Do not use when:** failures may be related (one agent investigates them together first), you need whole-system state, you do not yet know what is broken, or agents would touch the same files or resources (run those sequentially).

## Pattern

1. **Group by domain.** One test file or subsystem per agent; fixing one must not affect another.
2. **Write one self-contained prompt per agent** — paste the error messages and test names. Each prompt includes:
   - Scope: one file or subsystem
   - Goal: make these tests pass
   - Constraints: do not change other code
   - Gate invariant: what each assigned failing test, replay, metric, or acceptance gate proves
   - Expected output: summary of root cause and changes
   - code-kb directives: orient with `codebase_outline(path='<area>')`; `get_symbol_body('<fn>')` or `get_context_slice` before modifying a symbol; `find_references(symbol_name='<symbol>', direction='callers')` before changing anything callers see; `file_skeleton('<file>')` before reading a file; prove API shapes (symbol names, signatures, config shapes, routes, CLI flags, public contracts) with code-kb evidence; no Glob → Read → Grep chains.
3. **Dispatch all calls in one turn** using the **Dispatch mechanism** table in `razorback:subagent-driven-development` (its **Parallel Dispatch** notes cover per-harness wait and state calls). Cursor dispatches with the `Agent` tool like Claude Code. Harness default model unless the user or environment overrides. Keep a lane in the lead session when it has hidden invariants, shared lifecycle, weak tests, gate interpretation, or repeated failures.
4. **Review and integrate:** read each summary, check for conflicting edits, run the project's integration or branch verification scope so the fixes are verified together, spot-check the code — summaries can hide systematic errors.

Example prompt:

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

Identify the root cause (timing vs real bug). Replace arbitrary timeouts with event-based waiting; fix abort bugs if found. Do NOT just increase timeouts.

Return: summary of what you found and what you fixed.
```

## Common Mistakes

| Wrong | Right |
|---|---|
| "Fix all the tests" | "Fix agent-tool-abort.test.ts" |
| "Fix the race condition" | Paste the error messages and test names |
| No constraints | "Fix tests only" / "Do NOT change production code" |
| "Fix it" | "Return summary of root cause and changes" |
