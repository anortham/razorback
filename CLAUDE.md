# Razorback — Project Instructions

Razorback is a skill set for Claude Code, Cursor, Codex, OpenCode, Copilot CLI, and Gemini CLI that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Miller MCP for token-efficient codebase orientation. Plan execution routes through `subagent-driven-development` on harnesses that support delegation, and through `executing-plans` otherwise.

## Project Structure

```
.claude-plugin/plugin.json        — Claude Code / Copilot CLI plugin manifest
.claude-plugin/marketplace.json   — Marketplace listing (Claude Code + Copilot CLI read this)
.cursor-plugin/plugin.json        — Cursor plugin manifest
gemini-extension.json             — Gemini CLI extension manifest
GEMINI.md                          — Gemini context file (pulls using-razorback + gemini-tools)
skills/*/SKILL.md                  — Skill definitions (frontmatter + markdown body)
agents/*.md                        — Agent definitions (Claude Code / Cursor / Copilot CLI)
commands/*.md                      — Slash command definitions (Claude Code)
hooks/hooks.json                   — Claude Code hook configuration (SessionStart)
hooks/hooks-cursor.json            — Cursor hook configuration (sessionStart, camelCase)
hooks/session-start                — Polyglot bash script injecting using-razorback
hooks/run-hook.cmd                 — Cross-platform polyglot wrapper (bash/cmd)
.opencode/plugins/razorback.js     — OpenCode plugin (config hook + messages.transform)
.codex/INSTALL.md                  — Codex install instructions
scripts/bump-version.sh            — Version sync across manifests
.version-bump.json                 — Config for bump-version.sh (file list + audit excludes)
docs/plans/                         — Historical design and implementation plans
docs/specs/                         — Design specifications
```

## Harness split

| Harness | Harness-specific files | Bootstrap mechanism |
|---------|------------------------|---------------------|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `agents/`, `commands/`, `hooks/hooks.json`, `hooks/session-start`, `hooks/run-hook.cmd` | `SessionStart` hook injects `using-razorback` as `hookSpecificOutput.additionalContext` |
| Cursor | `.cursor-plugin/plugin.json`, `hooks/hooks-cursor.json` (reuses `hooks/session-start`) | `sessionStart` hook injects `using-razorback` as `additional_context` (snake_case) |
| Codex (CLI + desktop app) | `.codex/INSTALL.md`, `skills/using-razorback/references/codex-tools.md` | Native skill discovery from `~/.agents/skills/razorback/` |
| OpenCode | `.opencode/plugins/razorback.js`, `AGENTS.md` symlink, `package.json`, `index.js` | Plugin's `config` hook registers skills path; `experimental.chat.messages.transform` injects bootstrap into first user message |
| Copilot CLI | `skills/using-razorback/references/copilot-tools.md` (reuses `.claude-plugin/` manifests, `hooks/session-start`) | `SessionStart` hook injects bootstrap as top-level `additionalContext` (SDK standard) |
| Gemini CLI | `gemini-extension.json`, `GEMINI.md`, `skills/using-razorback/references/gemini-tools.md` | `GEMINI.md` uses `@./` includes to pull `using-razorback/SKILL.md` + `gemini-tools.md` at session start |

**Shared across all harnesses:** `skills/`, `CLAUDE.md` (symlinked as `AGENTS.md`), `docs/`, `scripts/bump-version.sh`, `.version-bump.json`.

## Key Conventions

### Skill Files
- Each skill lives in `skills/<skill-name>/SKILL.md`
- YAML frontmatter: `name` and `description` fields are required
- Body is the skill content — loaded and presented to the AI when invoked
- Skills reference other skills with `razorback:<skill-name>` syntax
- Supporting files (prompts, examples) live alongside SKILL.md in the same directory
- Tool-name mappings for non-Claude-Code harnesses live in `skills/using-razorback/references/{codex,copilot,gemini}-tools.md`

### Agent Files
- Live in `agents/<agent-name>.md`
- YAML frontmatter: `name`, `description`, `model` fields
- Body is the system prompt for the agent
- Discoverable as named plugin agents on Claude Code, Cursor, Copilot CLI. On Codex / OpenCode / Gemini CLI, agents are dispatched via inline-prompt concatenation (see `skills/requesting-code-review/SKILL.md` Mode 2 for the pattern); on Gemini the dispatch tool is `invoke_agent(agent_name="generalist", prompt=…)`.

### Commands
- Live in `commands/<command-name>.md`
- YAML frontmatter: `description`, optionally `disable-model-invocation`
- Body tells Claude which skill to invoke
- Claude Code only; deprecated in favor of direct skill invocation

### Hooks
- `hooks.json` defines Claude Code hook triggers; `hooks-cursor.json` defines Cursor's (camelCase schema).
- Hook scripts are extensionless bash files for cross-platform compatibility.
- `run-hook.cmd` is a polyglot that works as both a cmd.exe batch file and bash script. On Windows without Git Bash, it emits a stderr warning and exits 0 (plugin still loads, bootstrap disabled).
- `hooks/session-start` detects the harness from `CURSOR_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` / `COPILOT_CLI` env vars and emits the JSON shape that harness expects.

## Miller MCP Integration Pattern

Razorback works with Miller as its orientation and symbol-awareness layer. Skills reference Miller by **capability** first, and then by the concrete Miller tool name. Legacy predecessor tool names should appear only as migration/compatibility notes, not as the default workflow.

When modifying skills, add tool awareness at exploration/investigation points by capability:

| Capability | Miller tool |
|---|---|
| Search code (text, symbol, file/path, or concept) | `search(query, mode?)` |
| Orient on the codebase | `context(query)` |
| Inspect a symbol before modifying it | `inspect(target, depth=full)` |
| Find references before changing a public API | `trace(target)` |
| List a file's symbols before reading it | `inspect(target)` |
| Assess impact / blast radius | `impact(target)` |
| Manage the workspace index | `workspace(...)` |

Miller's `search` is lexical-first with a `mode=auto|text|symbol|file|content` selector. Use `mode=content` for docs/prose content and `inspect(target, depth=full)` for symbol bodies, callers, and callees.

Miller-first applies to the lead and to every dispatched implementer, reviewer, and fix worker, regardless of harness.

Use directive, capability-first language in lead-facing skills: "inspect a symbol BEFORE modifying it" and name Miller where the command matters. In **subagent-facing prompt files** (implementer/fix/reviewer prompts), name Miller inline — e.g. "inspect the symbol with Miller `inspect(target='<symbol>', depth=full)`" — because dispatched subagents do not receive the using-razorback toolchain table.

## Naming Rules
- All skill cross-references use `razorback:` prefix, never `superpowers:`
- Plugin name in all user-facing text is "razorback" (lowercase)
- SessionStart hook announces "You have razorback."

## Dependencies
- Miller MCP is a **hard requirement** — no fallback to generic tools for codebase exploration
- Goldfish MCP server is a **hard requirement** — used for persistent memory (checkpoints, briefs, recall) and compaction-durable execution during long autonomous runs
- Skills assume both Miller and Goldfish are configured and available

## Execution Model

**Primary execution path:** All six harnesses (Claude Code, Cursor, Codex, OpenCode, Copilot CLI, Gemini CLI) support `subagent-driven-development`. The lead dispatches fresh implementer subagents per task, parallel when tasks are independent, inline review by lead. Gemini CLI uses `invoke_agent(agent_name="generalist", …)` (parallel by default).

**Shared across all harnesses:**
- **Sequential/single-task:** `executing-plans` (single agent, batch execution)
- **Ad-hoc parallel:** `dispatching-parallel-agents` (independent agent dispatch outside plans)
- **Small, local, reversible fixes:** `fixing-small-issues` (quick-fix tier: objective triage criteria, fix on current checkout, affected-scope verification; no worktree, no baseline suite run; escalates to the standard flow when the fix outgrows the criteria)
- Lead does inline review (spec compliance + code quality) — no separate reviewer subagents

**Per-harness bootstrap mechanics:**
- **Claude Code:** `hooks/session-start` reads `skills/using-razorback/SKILL.md` verbatim and injects it via the SessionStart hook.
- **Cursor:** same `hooks/session-start` script; platform detection keys on `CURSOR_PLUGIN_ROOT` and emits `additional_context` (snake_case).
- **Codex (CLI + desktop app):** native skill discovery scans `~/.agents/skills/razorback/` at startup. Users see the raw SKILL.md content; delegated runs use `subagent-driven-development` when the session can spawn workers, and fall back to `executing-plans` otherwise. Tool-name mapping lives in `skills/using-razorback/references/codex-tools.md`.
- **OpenCode:** `.opencode/plugins/razorback.js` registers the skills directory and injects the bootstrap on the first user message (via `experimental.chat.messages.transform`). The plugin injects the shared bootstrap verbatim and adds OpenCode tool mapping.
- **Copilot CLI:** same `hooks/session-start` script; platform detection keys on `COPILOT_CLI` and emits top-level `additionalContext` (SDK standard). Plugin agents (like `razorback:code-reviewer`) are auto-discovered from the installed marketplace.
- **Gemini CLI:** `gemini-extension.json` declares `GEMINI.md` as the context file. `GEMINI.md` uses `@./` includes to pull in `skills/using-razorback/SKILL.md` + `skills/using-razorback/references/gemini-tools.md` at session start. Subagent dispatch uses Gemini's `invoke_agent` tool with the built-in `generalist` agent (parallel by default; `wait_for_previous: true` to serialize). Subagents cannot recursively dispatch other subagents — fine for razorback because review is inline by the lead.

### Autonomy

Once a plan is approved, razorback's execution skills run to completion without inter-task or inter-phase user confirmation. Stops are governed by the blocker taxonomy at `skills/using-razorback/references/blocker-taxonomy.md` (5 real-blocker categories; everything else is decide-and-note). A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. Optional pre-merge external review via `razorback:pre-merge-review` runs between "tests green" and `razorback:finishing-a-development-branch`; the reviewer is chosen per-plan at approval time (codex, gemini, claude, or none). The final stop is always PR creation; merge is a separate human or agent action after PR review. See `docs/plans/2026-04-18-autonomous-execution-design.md` for the full rationale.

## Version management

Five manifests carry a version field (`package.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `gemini-extension.json`). Keep them in sync with `./scripts/bump-version.sh`:

- `--check` reports current versions and detects drift
- `--audit` runs `--check` plus grep-scans the repo for undeclared version references
- `<new-version>` bumps all five in one pass

The `.version-bump.json` config drives the script. `.memories/` and `docs/plans/` are excluded from the audit because they freeze the version string at time of writing.

## What Not to Change
- Process flows (brainstorm → plan → TDD → execute → review → finish)
- Anti-rationalization tables in skills
- Two-pass inline review (spec compliance + code quality, done by lead, not separate agents)
- Miller-first exploration (no Glob/Read/Grep chains)
- Single-repo marketplace layout (both Claude Code and Copilot CLI read `.claude-plugin/marketplace.json` from this repo)
- Autonomous-by-default execution (blocker-gated, not task-gated) with optional pre-merge external review
- These conventions are intentionally chosen for token efficiency and quality
