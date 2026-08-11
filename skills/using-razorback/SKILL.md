---
name: using-razorback
description: Use when starting any conversation, before any response or action including clarifying questions.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

## The Rule

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke that skill BEFORE any response or action — including clarifying questions.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

Announce each invocation: "Using [skill] to [purpose]". Create a task per checklist item the skill carries. If an invoked skill turns out to be wrong, drop it.

Before you EnterPlanMode, ask whether this work has been brainstormed. If not, invoke `razorback:brainstorming` first.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase / check git first" | Skills tell you HOW to explore. Check first. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I remember this skill" | Skills evolve. Read current version. |

## Instruction Priority

Razorback skills override default system prompt behavior, but **user instructions always take precedence**: user instructions (AGENTS.md, CLAUDE.md, direct requests) beat skills, which beat the system prompt. If the user says "don't use TDD" and a skill says "always use TDD," follow the user.

## How to Access Skills

<!-- harness:claude-code -->
**In Claude Code:** Use the `Skill` tool — content is loaded and presented to you; follow it directly. Never Read skill files.
<!-- /harness -->
<!-- harness:cursor -->
**In Cursor:** Use the `Skill` tool; skills auto-register via the razorback plugin.
<!-- /harness -->
<!-- harness:codex -->
**In Codex (CLI or desktop app):** Skills are discovered natively from `~/.agents/skills/`; when one applies, follow its SKILL.md directly.
<!-- /harness -->
<!-- harness:opencode -->
**In OpenCode:** Use the native `skill` tool; skills auto-register via the razorback plugin.
<!-- /harness -->

**In other environments:** Check your platform's docs for skill loading.

## Platform Adaptation

Skills use Claude Code tool names; substitute your platform's equivalent.

<!-- harness:codex -->
- **Codex:** see `references/codex-tools.md` (Task→spawn_agent, TodoWrite→update_plan, etc.)
<!-- /harness -->
<!-- harness:opencode -->
- **OpenCode:** mapping is injected by the razorback plugin bootstrap (Task→opencode's Task tool, TodoWrite→todowrite, etc.)
<!-- /harness -->

## Execution Model

Executing an implementation plan:

- **2+ tasks:** `razorback:subagent-driven-development` — fresh subagent per task; parallel batches when tasks are independent, serialized lanes when coupled.
- **1 task, separate session, or no delegation:** `razorback:executing-plans` — single agent, batch execution.
- **Ad-hoc parallel work:** `razorback:dispatching-parallel-agents` — independent agent dispatch.
- **Small, local, reversible fix:** `razorback:fixing-small-issues` — triage first, fix on the current checkout, verify the affected scope only. No worktree, no baseline suite run.

`subagent-driven-development` is the delegated path on every plugin-tier harness. If this session cannot delegate (e.g. it is already a subagent), fall back to `executing-plans`. The lead reviews inline (spec compliance + code quality) either way.

## Skill Priority

Process skills first (brainstorming, debugging) — they set HOW to approach the task. Domain skills second — they guide execution. "Let's build X" → brainstorming first. "Fix this bug" → debugging first.

## Skill Types

**Rigid** (TDD, debugging): follow exactly, never adapt away discipline. **Flexible** (patterns): adapt to context. The skill tells you which.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.

## Your Toolchain

Razorback skills assume **Miller MCP is available and MUST be used** for ALL codebase exploration — instead of Glob/Grep/Read chains.

Use Miller by capability, not by raw file reading:

| Capability — do this BEFORE the raw-file reflex | Miller tool |
|---|---|
| **Orient** — token-budgeted bundle for a task or area | `context(query)` |
| **Search** — code by text, symbol, file/path, or concept; `markers` for TODO/FIXME audits, `source` for source bodies, `content` for docs/prose; also `external`, `web`, `all-text` | `search(query, mode=auto\|text\|symbol\|file\|markers\|content\|source\|external\|web\|all-text)` |
| **List a file's symbols** before reading the whole file | `inspect(target='<file>')` |
| **Inspect a symbol** — `overview` for the first read (bounded refs/callers/callees + body preview), `full` only when editing it | `inspect(target='<symbol>', depth=summary\|overview\|full)` |
| **Find references** before changing a public API | `trace(target)` |
| **Assess impact / blast radius** of a change | `impact(target)` |
| **Code-shape facts** — routes, config keys, doc structure, pre-extracted across 36 languages | `patterns(...)` |
| **Large text** — import, then search logs, CI output, web imports without full-file reads | `content(...)` |
| **Rename / edit** a symbol safely | `edit(operation, target)` |
| **Manage the workspace index** | `workspace(...)` |

**Rules (apply to the lead AND to every implementer, reviewer, and fix worker you dispatch):**
1. Use Miller for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use Miller to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When Miller cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
7. Scope test runs: in the inner loop, run single tests or the focused group that covers the change. The full suite runs once, at the branch gate. Do not rerun a passing scope on an unchanged tree.
