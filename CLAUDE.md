# Razorback — Project Instructions

Razorback is a Claude Code plugin (skill set) forked from [Superpowers](https://github.com/obra/superpowers) v4.3.1. It adds explicit Julie (code intelligence) MCP server awareness to every skill and subagent prompt.

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

## What Not to Change
- Process flows (brainstorm → plan → TDD → execute → review → finish)
- Anti-rationalization tables in skills
- Subagent-per-task model
- Two-stage code review (spec compliance + code quality)
- These are inherited from Superpowers and are intentionally preserved
