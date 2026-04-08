# Razorback — Project Instructions

Razorback is a Claude Code plugin (skill set) that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Julie MCP for token-efficient codebase orientation and Agent Teams for parallel plan execution.

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
- **Primary:** Agent Teams via `team-driven-development` for plans with 2+ independent tasks
- **Fallback:** Single-agent via `executing-plans` for sequential/single-task work
- **Ad-hoc:** `dispatching-parallel-agents` for independent parallel tasks outside plans
- Lead does inline review (spec compliance + code quality) instead of dispatching reviewer subagents
- `subagent-driven-development` is deprecated; kept for reference only

## What Not to Change
- Process flows (brainstorm → plan → TDD → execute → review → finish)
- Anti-rationalization tables in skills
- Two-pass inline review (spec compliance + code quality, done by lead, not separate agents)
- Julie-first exploration (no Glob/Read/Grep chains)
- These conventions are intentionally chosen for token efficiency and quality
