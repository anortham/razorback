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
</EXTREMELY-IMPORTANT>

Announce each invocation: "Using [skill] to [purpose]". Create a task per checklist item the skill carries. Drop a skill that turns out to be wrong. Before EnterPlanMode, invoke `razorback:brainstorming` if the work has not been brainstormed.

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

System and developer instructions keep their host-defined priority. Within them, direct user directions and project instructions (AGENTS.md, CLAUDE.md) override razorback skill defaults. A skill cannot elevate itself above the host hierarchy: if the user says "don't use TDD" and the host permits it, follow the user.

## How to Access Skills

<!-- harness:claude-code -->
**In Claude Code:** Use the `Skill` tool; follow the loaded content directly. Never Read skill files.
<!-- /harness -->
<!-- harness:cursor -->
**In Cursor:** Use the `Skill` tool; skills auto-register via the razorback plugin.
<!-- /harness -->
<!-- harness:codex -->
**In Codex (CLI or desktop app):** Skills are discovered natively from `~/.agents/skills/`; follow the SKILL.md directly.
<!-- /harness -->
<!-- harness:opencode -->
**In OpenCode:** Use the native `skill` tool; skills auto-register via the razorback plugin.
<!-- /harness -->

Skills use Claude Code tool names; substitute your platform's equivalent.

<!-- harness:codex -->
- **Codex:** see `references/codex-tools.md`; the live callable tool schemas are the source of truth.
<!-- /harness -->
<!-- harness:opencode -->
- **OpenCode:** the plugin bootstrap injects the mapping (Task→opencode's Task tool, TodoWrite→todowrite).
<!-- /harness -->

## Execution Model

- **Delegation is available and permitted:** `razorback:subagent-driven-development` — fresh subagent per task, including a single task; parallel when independent, serialized when dependent. If this session cannot delegate, fall back to `razorback:executing-plans`.
- **Delegation is unavailable, or the user/session explicitly selects single-agent execution:** `razorback:executing-plans`.
- **Ad-hoc parallel work:** `razorback:dispatching-parallel-agents`.
- **Small, local, reversible fix:** `razorback:fixing-small-issues` — triage, fix on the current checkout, verify the affected scope only. No worktree, no baseline suite.

The lead reviews inline (spec compliance + code quality) on every path. Process skills (brainstorming, debugging) set HOW and run first; domain skills second. Rigid skills (TDD, debugging) are followed exactly. User instructions say WHAT, not HOW: "Fix Y" does not mean skip workflows.

## Your Toolchain

When Miller supplies an injected routing block or server instructions, follow them. The fallback below applies only when that guidance is absent.

**Miller MCP is available and MUST be used** for ALL codebase exploration — instead of Glob/Grep/Read chains. Discover the workspace with `workspace operation=list`, or register one with `workspace operation=open path=/absolute/project`; pass the returned `workspace_id` on workspace-bound calls. Read the callable tool schema before choosing parameters.

| Capability — do this BEFORE the raw-file reflex | Miller tool |
|---|---|
| **Orient** — token-budgeted bundle for a task or area | `context(query)` |
| **Search** — text, symbol, file/path, or concept; `markers` for TODO/FIXME, `source` for bodies, `content` for docs/prose | `search(query, mode=auto\|text\|symbol\|file\|markers\|content\|source\|external\|web\|all-text)` |
| **List a file's symbols** before reading the whole file | `inspect(target='<file>')` |
| **Inspect a symbol** — `overview` first; `full` only when editing it | `inspect(target='<symbol>', depth=summary\|overview\|full)` |
| **Find references** before changing a public API | `trace(target)` |
| **Assess impact / blast radius** | `impact(target)` |
| **Code-shape facts** — routes, config keys, doc structure | `patterns(...)` |
| **Large text** — import, then search logs or CI output | `content(...)` |
| **Rename / edit** a symbol safely | `edit(operation, target)` |
| **Manage the workspace index** | `workspace(...)` |
| **Check continuous testing** — read-only status | `tests(operation=status)` |

**Rules (lead and every native implementer, reviewer, and fix worker):**
1. Use Miller for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use Miller to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When Miller cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
7. Scope test runs: inner loop runs single tests or the focused group covering the change; the full suite runs once at the branch gate. Do not rerun a passing scope on an unchanged tree.

Restricted external CLI reviewers invoked by `razorback:pre-merge-review` are the deliberate exception: they run without MCP under a read-only allowlist. The lead supplies a sanitized Miller-backed evidence bundle and verifies every finding with Miller; the reviewer reports missing evidence instead of claiming it ran Miller.

Continuous testing is opt-in; status never enables it. When enabled, use the current `tests` schema to run the stale set. When disabled, use the discovered project runner.
