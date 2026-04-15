# Razorback

**Julie-powered development workflow for Claude Code and OpenCode.**

Razorback is a skill set for Claude Code and OpenCode that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Julie MCP for token-efficient codebase orientation. Plan execution runs through parallel subagent dispatch on both harnesses, with Agent Teams as a Claude-Code-only upgrade for persistent named teammates.

## Why?

AI-assisted development burns tokens on repetitive codebase exploration. Every agent, teammate, and subagent re-discovers the same code through Glob/Grep/Read chains. Razorback solves this two ways:

- **Julie MCP** routes all exploration through purpose-built code intelligence tools (get_context, deep_dive, fast_refs, get_symbols) that return targeted context in 1-2 calls instead of 5-8
- **Parallel subagent dispatch with inline review by the lead** keeps the main agent's context clean. Claude Code users get an additional upgrade via Agent Teams: persistent named teammates that receive follow-up messages, so fixes skip cold-restart re-orientation.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [OpenCode](https://opencode.ai)
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

### OpenCode

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.opencode/INSTALL.md
```

**Detailed docs:** [docs/README.opencode.md](docs/README.opencode.md)

### After Installation

Once the plugin is loaded, Razorback works automatically:

1. **Session starts** -- the `SessionStart` hook (Claude Code) or `messages.transform` (OpenCode) fires, injecting the `using-razorback` skill
2. **You request work** -- the agent checks for applicable skills before every response
3. **Skills guide the workflow** -- brainstorming, planning, TDD, execution, review, and verification all route through Julie and the appropriate execution strategy for your harness

No configuration needed beyond plugin installation (assuming Julie is already set up).

## Updating

Neither harness auto-pulls new content on restart. You have to opt in to updates.

### Claude Code

Two ways, depending on how you installed:

**If installed via marketplace (recommended):** enable auto-updates once, then updates pull on each session start.

```bash
# Turn on auto-update for the razorback marketplace
/plugin marketplace update razorback --auto

# Or pull a one-off update manually
/plugin marketplace update razorback
/plugin install razorback@razorback
```

**If installed from a local clone:** `git pull` the repo. Claude Code reloads plugin content on the next session start.

### OpenCode

OpenCode installs razorback as a Bun-cached npm/git package. The reliable pattern is pin-and-bump:

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#v0.7.4"]
}
```

Change the tag in `opencode.json`, then restart OpenCode. Bun caches by the full spec, so changing `#ref` forces a fresh fetch.

Unpinned installs (`razorback@git+…razorback.git` with no `#ref`) may or may not refresh on restart depending on Bun version. If yours gets stuck, flush the cache:

```bash
# macOS/Linux
rm -rf ~/.config/opencode/node_modules/razorback
# Windows PowerShell
Remove-Item -Recurse -Force "$env:USERPROFILE\.config\opencode\node_modules\razorback"
```

Then restart OpenCode.

See [.opencode/INSTALL.md](.opencode/INSTALL.md) for more detail.

## Workflow

The core process: brainstorm, plan, TDD, execute, review, finish.

**Execution model (primary path depends on harness):**
- **Both harnesses, 2+ independent tasks:** `subagent-driven-development` dispatches fresh implementer subagents (in parallel when tasks are independent), lead does inline review (spec compliance + code quality) per task
- **Claude Code upgrade, 2+ independent tasks:** `team-driven-development` creates an Agent Team with persistent named teammates, so fixes go to the teammate who already has context (no cold restart). Promoted as primary on Claude Code via the session-start bootstrap.
- **1 task or sequential (both harnesses):** `executing-plans` runs single-agent batch execution
- **Ad-hoc parallel work (both harnesses):** `dispatching-parallel-agents` for independent tasks outside plans

## Skills

| Skill | Purpose |
|-------|---------|
| using-razorback | Entry point: skill routing, execution model, Julie toolchain |
| brainstorming | Requirements exploration, design, approach selection |
| writing-plans | Implementation plans (full or light) with Julie-verified file paths |
| **team-driven-development** | **Claude Code upgrade: Agent Teams, persistent named teammates, inline review** |
| executing-plans | Single-agent execution (fallback for sequential/single-task work) |
| test-driven-development | Red-green-refactor with Julie-powered test discovery |
| systematic-debugging | Root cause investigation with Julie-powered tracing |
| requesting-code-review | Inline review (during plan execution) or standalone review (ad-hoc) |
| receiving-code-review | Process for acting on review feedback |
| verification-before-completion | Evidence-before-claims verification |
| finishing-a-development-branch | Merge/PR/cleanup decision workflow |
| dispatching-parallel-agents | Ad-hoc parallel agent dispatch |
| using-git-worktrees | Isolated workspace setup |
| writing-skills | Meta-skill for creating/editing skills |
| **subagent-driven-development** | **Primary plan execution (both harnesses): fresh implementer subagents, parallel when independent, inline review by lead** |

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
