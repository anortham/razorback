# Razorback — Project Instructions

Razorback is a skill set for Claude Code, Codex, and OpenCode that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Julie MCP for token-efficient codebase orientation. Plan execution runs through parallel subagent dispatch on all three harnesses; Agent Teams are a Claude-Code-only upgrade promoted by the session-start bootstrap.

## Project Structure

```
.claude-plugin/plugin.json   — Plugin manifest (name, version, description)
skills/*/SKILL.md             — Skill definitions (frontmatter + markdown body)
agents/*.md                   — Agent definitions (frontmatter + markdown body)
commands/*.md                 — Slash command definitions
hooks/hooks.json              — Hook configuration (SessionStart)
hooks/session-start           — Bash script injecting using-razorback on session start
hooks/run-hook.cmd            — Cross-platform polyglot wrapper (bash/cmd)
docs/plans/                   — Historical design and implementation plans
docs/specs/                   — Design specifications
```

**Harness split:**
- Claude Code only: `.claude-plugin/`, `agents/`, `commands/`, `hooks/`
- Codex only: `.codex/` (install instructions; Codex uses native skill discovery, no plugin-side code)
- OpenCode only: `.opencode/`, `AGENTS.md`, `package.json`
- Shared by all three: `skills/`, `CLAUDE.md`, `docs/`

## Key Conventions

### Skill Files
- Each skill lives in `skills/<skill-name>/SKILL.md`
- YAML frontmatter: `name` and `description` fields are required
- Body is the skill content — loaded and presented to the AI when invoked
- Skills reference other skills with `razorback:<skill-name>` syntax
- Supporting files (prompts, examples) live alongside SKILL.md in the same directory

### Agent Files
- Live in `agents/<agent-name>.md`
- YAML frontmatter: `name`, `description`, `model` fields
- Body is the system prompt for the agent

### Commands
- Live in `commands/<command-name>.md`
- YAML frontmatter: `description`, optionally `disable-model-invocation`
- Body tells Claude which skill to invoke

### Hooks
- `hooks.json` defines hook triggers (currently only SessionStart)
- Hook scripts are extensionless bash files for cross-platform compatibility
- `run-hook.cmd` is a polyglot that works as both a cmd.exe batch file and bash script

## Julie Integration Pattern

When modifying skills, follow this pattern for adding tool awareness:

**Julie** — Add at exploration/investigation points:
- `get_context(query)` for initial codebase orientation
- `deep_dive(symbol)` before modifying any symbol
- `fast_refs(symbol)` before changing public APIs
- `get_symbols(file_path)` before reading full files

Use directive language: "Use julie:deep_dive BEFORE modifying any symbol" not "consider using deep_dive".

## Naming Rules
- All skill cross-references use `razorback:` prefix, never `superpowers:`
- Plugin name in all user-facing text is "razorback" (lowercase)
- SessionStart hook announces "You have razorback."

## Dependencies
- Julie MCP server is a **hard requirement** — no fallback to generic tools
- Skills assume Julie is configured and available

## Execution Model

**Primary execution path (all three harnesses):**
- `subagent-driven-development` dispatches fresh implementer subagents per task, parallel when tasks are independent, inline review by lead. Skill bodies across razorback cross-reference this as the canonical execution skill. Primary on Codex and OpenCode.

**Claude Code upgrade:**
- `team-driven-development` — Agent Teams with persistent named teammates. Fixes go to the teammate who already has context instead of a cold-restart fresh subagent. Promoted as primary on Claude Code via the session-start bootstrap (`hooks/session-start`). Not available on Codex or OpenCode.

**Shared across all three harnesses:**
- **Sequential/single-task:** `executing-plans` (single agent, batch execution)
- **Ad-hoc parallel:** `dispatching-parallel-agents` (independent agent dispatch outside plans)
- Lead does inline review (spec compliance + code quality) — no separate reviewer subagents

**Per-harness bootstrap mechanics:**
- Claude Code: `hooks/session-start` reads `skills/using-razorback/SKILL.md` verbatim and injects it via the SessionStart hook.
- OpenCode: `.opencode/plugins/razorback.js` registers the skills directory and injects the bootstrap on the first user message, substituting the Execution Model section so `subagent-driven-development` is named as the primary.
- Codex: native skill discovery scans `~/.agents/skills/razorback/` at startup. Users see the raw SKILL.md content; the Execution Model section is platform-aware and routes Codex readers to `subagent-driven-development`. Tool-name mapping lives in `skills/using-razorback/references/codex-tools.md`.

## What Not to Change
- Process flows (brainstorm → plan → TDD → execute → review → finish)
- Anti-rationalization tables in skills
- Two-pass inline review (spec compliance + code quality, done by lead, not separate agents)
- Julie-first exploration (no Glob/Read/Grep chains)
- These conventions are intentionally chosen for token efficiency and quality
