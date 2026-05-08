---
name: using-razorback
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Instruction Priority

Razorback skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (RAZORBACK.md, CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) - highest priority
2. **Razorback skills** - override default system behavior where they conflict
3. **Default system prompt** - lowest priority

If RAZORBACK.md, CLAUDE.md, GEMINI.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.

## Project Policy Discovery

Before planning, dispatching subagents, or choosing verification/model tiers, check for repo-root `RAZORBACK.md`.

`RAZORBACK.md` is the source of truth for razorback-specific project policy: model routing, worker eligibility, verification tiers, escalation triggers, and harness mappings. Harness docs (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) may point to it, but should not duplicate those policies.

If `RAZORBACK.md` is absent:
1. Use any explicit policy in the active harness docs.
2. If no policy exists and the run needs model routing, ask once.
3. If the harness cannot choose models per agent, record `inherit` and continue.

## How to Access Skills

**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you—follow it directly. Never use the Read tool on skill files.

**In Cursor:** Use the `Skill` tool. Skills auto-register via the razorback plugin, the same way they do in Claude Code.

**In Codex (CLI or desktop app):** Skills are discovered natively from `~/.agents/skills/`. When a skill applies, follow its SKILL.md content directly. No separate loading tool.

**In OpenCode:** Use the native `skill` tool. Skills auto-register via the razorback plugin.

**In Copilot CLI:** Use the `skill` tool. Skills are auto-discovered from installed plugins. The `skill` tool works the same as Claude Code's `Skill` tool.

**In Gemini CLI:** Skills activate via the `activate_skill` tool. Gemini loads skill metadata at session start and activates the full content on demand.

**In other environments:** Check your platform's documentation for how skills are loaded.

## Platform Adaptation

Skills use Claude Code tool names. On non-Claude-Code platforms, substitute the equivalent:

- **Codex:** see `references/codex-tools.md` (Task→spawn_agent, TodoWrite→update_plan, etc.)
- **Copilot CLI:** see `references/copilot-tools.md` (Read→view, Edit→edit, Task→task, etc.)
- **Gemini CLI:** see `references/gemini-tools.md` — loaded automatically via `GEMINI.md` (Read→read_file, Edit→replace, Task→`invoke_agent` with `generalist`, etc.)
- **OpenCode:** tool mapping is injected automatically by the razorback plugin bootstrap (Task→opencode's Task tool, TodoWrite→todowrite, etc.)

# Using Skills

## The Rule

**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.

```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "About to EnterPlanMode?" [shape=doublecircle];
    "Already brainstormed?" [shape=diamond];
    "Invoke brainstorming skill" [shape=box];
    "Might any skill apply?" [shape=diamond];
    "Invoke Skill tool" [shape=box];
    "Announce: 'Using [skill] to [purpose]'" [shape=box];
    "Has checklist?" [shape=diamond];
    "Create task per checklist item" [shape=box];
    "Follow skill exactly" [shape=box];
    "Respond (including clarifications)" [shape=doublecircle];

    "About to EnterPlanMode?" -> "Already brainstormed?";
    "Already brainstormed?" -> "Invoke brainstorming skill" [label="no"];
    "Already brainstormed?" -> "Might any skill apply?" [label="yes"];
    "Invoke brainstorming skill" -> "Might any skill apply?";

    "User message received" -> "Might any skill apply?";
    "Might any skill apply?" -> "Invoke Skill tool" [label="yes, even 1%"];
    "Might any skill apply?" -> "Respond (including clarifications)" [label="definitely not"];
    "Invoke Skill tool" -> "Announce: 'Using [skill] to [purpose]'";
    "Announce: 'Using [skill] to [purpose]'" -> "Has checklist?";
    "Has checklist?" -> "Create task per checklist item" [label="yes"];
    "Has checklist?" -> "Follow skill exactly" [label="no"];
    "Create task per checklist item" -> "Follow skill exactly";
}
```

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Execution Model

When executing implementation plans:

- **2+ independent tasks (delegation available):** Use `razorback:subagent-driven-development` (fresh subagent per task, inline review by lead)
- **1 task, tightly sequential work, or no delegation:** Use `razorback:executing-plans` (single agent, batch execution)
- **Ad-hoc parallel work (delegation available):** Use `razorback:dispatching-parallel-agents` (independent agent dispatch)

`subagent-driven-development` is the delegated execution path across Claude Code, Cursor, Codex, OpenCode, Copilot CLI, and Gemini CLI. If the current session cannot delegate (e.g., already running as a subagent — Gemini blocks recursion), fall back to `executing-plans`. The lead does inline review (spec compliance + code quality) either way.

## Skill Priority

When multiple skills could apply, use this order:

1. **Process skills first** (brainstorming, debugging) - these determine HOW to approach the task
2. **Domain skills second** - these guide execution

"Let's build X" → brainstorming first, then domain-specific skills.
"Fix this bug" → debugging first, then domain-specific skills.

## Skill Types

**Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.

**Flexible** (patterns): Adapt principles to context.

The skill itself tells you which.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.

## Your Toolchain

Razorback skills assume these MCP servers are available and MUST be used:

**Julie** (code intelligence — use instead of Glob/Grep/Read chains):
- `get_context(query)` — Token-budgeted codebase orientation (pivots + neighbors + file map)
- `deep_dive(symbol)` — Understand a symbol before modifying it (callers, callees, types, children)
- `fast_search(query)` — Find code by text or definition
- `fast_refs(symbol)` — Find all references to a symbol (REQUIRED before modifying any symbol)
- `get_symbols(file_path)` — See file structure without reading full content
- `rename_symbol(old, new)` — Safe workspace-wide renames

**Rules:**
1. Use Julie tools for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. Use `get_symbols` before Read to see file structure first.
3. Use `deep_dive` before modifying any symbol.
4. Use `fast_refs` before changing any symbol to check impact.
5. These Julie rules apply to the lead and to every implementer, reviewer, and fix worker you dispatch.
