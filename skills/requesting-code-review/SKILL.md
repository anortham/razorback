---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Two review modes, depending on context.

**Core principle:** Review early, review often.

## Mode 1: Inline Review (Plan Execution)

When using `razorback:subagent-driven-development` (or `razorback:team-driven-development` on Claude Code), the **lead does inline review** after each implementer reports DONE. No separate reviewer agent needed.

**The lead checks two things:**

**Spec compliance:** Did the implementer build what was requested? Nothing missing, nothing extra?
- Use `get_symbols(file_path)` to scan changed files quickly
- Compare actual code to task requirements line by line

**Code quality:** Is the code clean, tested, and maintainable?
- Use `deep_dive(symbol)` on key modified symbols
- Use `fast_refs(symbol)` to verify changes don't break dependents
- Check tests verify behavior, not just that code runs

**If issues found:** Route fix back to an implementer (resume on Claude Code with team-driven, fresh dispatch with fix context on opencode or subagent-driven). They fix and re-report. Review cap: 3 iterations.

## Mode 2: Standalone Review (Ad-Hoc / Pre-Merge)

For work done outside plan execution, dispatch the `razorback:code-reviewer` agent.

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-reviewer agent:**

| Harness | How to invoke |
|---------|---------------|
| Claude Code | `Agent(subagent_type="razorback:code-reviewer", prompt=<filled template>)` |
| Cursor | Same as Claude Code (plugin agents exposed through the Skill tool's agent discovery) |
| Copilot CLI | `task(agent_type="razorback:code-reviewer", …)` — plugin agents auto-discovered |
| Codex | `spawn_agent(agent_type="worker", message=<see two-file note below>)` |
| OpenCode | `Task` tool with `general` subagent (message built as in the two-file note below) |
| Gemini CLI | No subagents — lead applies the reviewer checklist inline |

**Two-file note (Codex / OpenCode inline-prompt harnesses):** The reviewer uses two files. `agents/code-reviewer.md` holds the reviewer's system-prompt body (its behavioral spec). `requesting-code-review/code-reviewer.md` is the task template with placeholders (`{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`). On Claude Code / Cursor / Copilot CLI the agent discovery wires these together automatically. On Codex and OpenCode, build the dispatch message by concatenating: (1) `agents/code-reviewer.md` body (strip the frontmatter), then (2) the filled-in `requesting-code-review/code-reviewer.md` template. Send that as the subagent's task message.

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## When to Request Review

**Mandatory:**
- After each task during plan execution (inline by lead)
- After completing major feature (standalone)
- Before merge to main (standalone)

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## Integration with Workflows

**Plan Execution (subagent-driven or team-driven):**
- Lead does inline review (Mode 1) after each implementer reports DONE
- See the execution skill for full review checklist

**Executing Plans:**
- Review after each batch (3 tasks)
- Standalone review (Mode 2)

**Ad-Hoc Development:**
- Standalone review before merge
- Standalone review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md
