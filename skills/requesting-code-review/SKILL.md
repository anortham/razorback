---
name: requesting-code-review
description: Use when the lead needs inline-review criteria during plan execution, or when reviewing work done outside an approved plan - ad-hoc features, baseline checks before a refactor, or when stuck. Planned pre-merge external review is razorback:pre-merge-review, not this skill.
---

# Requesting Code Review

Two review modes, depending on context.

**Core principle:** Review early, review often.

## Mode 1: Inline Review (Plan Execution)

When using `razorback:subagent-driven-development`, the **lead does inline review** after each implementer reports DONE. No separate reviewer agent needed.

**The lead checks two things:**

**Spec compliance:** Did the implementer build what was requested? Nothing missing, nothing extra?
- **List a file's symbols** to scan changed files quickly with Miller `inspect`
- Compare actual code to task requirements line by line

**Code quality:** Is the code clean, tested, and maintainable?
- **Inspect** key modified symbols with Miller `inspect depth=full`
- **Find references** to verify changes don't break dependents with Miller `trace`
- Check tests verify behavior, not just that code runs
- Reject the report if the implementer cannot show Miller-first orientation and
  the Miller calls they used
- Reject the report if it relies on symbol names, function signatures, config
  shapes, route names, CLI flags, or public contracts without Miller-backed
  API-shape evidence
- Compare the diff against the approved architecture, not just the symptom
- If the same structural issue keeps recurring, route it through
  `razorback:architecture-quality` Candidate Mode instead of looping more patches

**If issues found:** Route the fix back to an implementer using the harness-native follow-up path. Resume the existing implementer on Claude Code or Codex when possible, or dispatch a fresh implementer with fix context where resume is unavailable. They fix and re-report. Review cap: 3 iterations.

## Mode 2: Standalone Review (Ad-Hoc / Baseline)

For work done outside plan execution, dispatch the `razorback:code-reviewer` agent.
Standalone review is for ad-hoc or baseline review: when stuck, before a
refactor, after a major feature outside an approved plan, or before merging
ad-hoc work.

For planned pre-merge external review in an approved execution flow, use
`razorback:pre-merge-review` instead. That skill owns the stricter
branch-gate, chosen-reviewer, finding-classification, fix, and report flow.

**1. Get git SHAs:**
```bash
# Prefer the branch merge base so review covers the whole feature branch.
BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)
HEAD_SHA=$(git rev-parse HEAD)
# If the target branch is neither main nor master, compute BASE_SHA against the correct base explicitly.
```

**2. Dispatch code-reviewer agent:**

| Harness | How to invoke |
|---------|---------------|
| Claude Code | `Agent(subagent_type="razorback:code-reviewer", prompt=<filled template>)` |
| Cursor | Same as Claude Code (plugin agents exposed through the Skill tool's agent discovery) |
| Copilot CLI | `task(agent_type="razorback:code-reviewer", …)` — plugin agents auto-discovered |
| Codex | `spawn_agent(task_name="code-review", message=<see two-file note below>)` |
| OpenCode | `Task` tool with `general` subagent (message built as in the two-file note below) |
| Gemini CLI | `invoke_agent(agent_name="generalist", prompt=<see two-file note below>)` — same concatenation pattern as Codex / OpenCode. Drop a custom `.gemini/agents/code-reviewer.md` into the target repo if you want a named reviewer agent instead. |

**Two-file note (Codex / OpenCode / Gemini CLI inline-prompt harnesses):** The reviewer uses two files. `agents/code-reviewer.md` holds the reviewer's system-prompt body (its behavioral spec). `requesting-code-review/code-reviewer.md` is the task template with placeholders (`{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`). On Claude Code / Cursor / Copilot CLI the agent discovery wires these together automatically. On Codex, OpenCode, and Gemini CLI, build the dispatch message by concatenating: (1) `agents/code-reviewer.md` body (strip the frontmatter), then (2) the filled-in `requesting-code-review/code-reviewer.md` template. Send that as the subagent's task message (Codex `spawn_agent` `message`, OpenCode `Task` prompt, or Gemini `invoke_agent` `prompt`).

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
Route the findings through `razorback:receiving-code-review` — verify each item against the code before implementing, push back with reasoning where the reviewer is wrong, and fix what survives verification.

## When to Request Review

**Mandatory:**
- After each task during plan execution: inline review by the lead (Mode 1). Plan-execution work never dispatches a reviewer subagent.
- Before merging ad-hoc work done outside an approved plan: standalone (Mode 2). Planned pre-merge external review uses `razorback:pre-merge-review` instead.

**Optional but valuable (standalone, ad-hoc work only):**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## Integration with Workflows

**Plan Execution (`subagent-driven-development` or `executing-plans`):**
- Lead does inline review (Mode 1) after each implementer reports DONE (subagent-driven) or applies the same criteria to its own work (executing-plans)
- No standalone reviewer dispatch and no per-batch review stops — the flow is: execute all tasks → optional `razorback:pre-merge-review` (if a reviewer was chosen at plan approval) → `razorback:finishing-a-development-branch`

**Ad-Hoc Development:**
- Standalone review before merge
- Standalone review when stuck
- When repeated findings keep surfacing the same structural issue, stop the
  patch loop, invoke `razorback:architecture-quality` Candidate Mode, and review against
  the approved architecture before asking for another change

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
