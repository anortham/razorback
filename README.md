# Razorback

**Team-first, Julie-powered development workflow for Claude Code.**

Razorback is a Claude Code plugin that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Julie MCP for token-efficient codebase orientation and Agent Teams for parallel plan execution.

## Why?

AI-assisted development burns tokens on repetitive codebase exploration. Every agent, teammate, and subagent re-discovers the same code through Glob/Grep/Read chains. Razorback solves this two ways:

- **Julie MCP** routes all exploration through purpose-built code intelligence tools (get_context, deep_dive, fast_refs, get_symbols) that return targeted context in 1-2 calls instead of 5-8
- **Agent Teams** replace the sequential subagent model with persistent teammates that work in parallel. When a reviewer finds issues, you message the teammate who already has context. No cold restart.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Julie MCP Server](https://github.com/anortham/julie) -- must be configured and indexing your workspace

## Installation

Razorback is a pure-content plugin (skills, commands, hooks) -- no build step or runtime dependencies required.

### Option 1: Install from GitHub (Recommended)

```bash
# Add the Razorback repository as a plugin marketplace
/plugin marketplace add anortham/razorback

# Install the plugin (user scope, available across all projects)
/plugin install razorback@razorback
```

You can also scope the installation to a specific project:

```bash
# Project scope (shared with team via version control)
/plugin install razorback@razorback --scope project
```

### Option 2: Install from a Local Clone

If you prefer to clone the repo yourself (useful for development or contributing):

```bash
# Clone the repository
git clone https://github.com/anortham/razorback.git

# Install as a Claude Code plugin
claude plugin install /path/to/razorback
```

**For development (loads plugin from local directory each time):**

```bash
claude --plugin-dir /path/to/razorback
```

### After Installation

Once the plugin is loaded, Razorback works automatically:

1. **Session starts** -- the `SessionStart` hook fires, injecting the `using-razorback` skill
2. **You request work** -- Claude checks for applicable skills before every response
3. **Skills guide the workflow** -- brainstorming, planning, TDD, execution, review, and verification all route through Julie and Agent Teams

No configuration needed beyond plugin installation (assuming Julie is already set up).

## Workflow

The core process: brainstorm, plan, TDD, execute, review, finish.

**Execution model:**
- **2+ independent tasks:** `team-driven-development` creates an Agent Team with parallel teammates, lead does inline review (spec compliance + code quality), messages teammates for fixes
- **1 task or sequential:** `executing-plans` runs single-agent batch execution
- **Ad-hoc parallel work:** `dispatching-parallel-agents` for independent tasks outside plans

## Skills

| Skill | Purpose |
|-------|---------|
| using-razorback | Entry point: skill routing, execution model, Julie toolchain |
| brainstorming | Requirements exploration, design, approach selection |
| writing-plans | Implementation plans (full or light) with Julie-verified file paths |
| **team-driven-development** | **Primary execution: Agent Teams, parallel teammates, inline review** |
| executing-plans | Single-agent execution (fallback for sequential/single-task work) |
| test-driven-development | Red-green-refactor with Julie-powered test discovery |
| systematic-debugging | Root cause investigation with Julie-powered tracing |
| requesting-code-review | Inline review (team-driven) or standalone review (ad-hoc) |
| receiving-code-review | Process for acting on review feedback |
| verification-before-completion | Evidence-before-claims verification |
| finishing-a-development-branch | Merge/PR/cleanup decision workflow |
| dispatching-parallel-agents | Ad-hoc parallel agent dispatch |
| using-git-worktrees | Isolated workspace setup |
| writing-skills | Meta-skill for creating/editing skills |
| ~~subagent-driven-development~~ | Deprecated: replaced by team-driven-development |

## Teammate Prompt Templates

| Template | Purpose |
|----------|---------|
| team-driven-development/implementer-prompt.md | Teammate spawn: task assignment, file ownership, Julie directives, status protocol |
| subagent-driven-development/spec-reviewer-prompt.md | Review guide: spec compliance criteria |
| subagent-driven-development/code-quality-reviewer-prompt.md | Review guide: code quality criteria |

## License

MIT (diverged from Superpowers, also MIT)

## Credits

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.
