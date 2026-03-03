# Razorback

**Julie/Goldfish-aware development workflow skills for Claude Code.**

Razorback is a fork of [Superpowers](https://github.com/obra/superpowers) (v4.3.1) that adds explicit awareness of two MCP servers to every skill and subagent prompt:

- **Julie** — Code intelligence (search, symbols, references, context)
- **Goldfish** — Developer memory (checkpoints, recall, plans)

## Why?

Superpowers produces high-quality results but burns tokens and time because every agent (controller and subagents) explores the codebase using generic Glob/Grep/Read chains. Razorback keeps the exact same proven workflow but routes all exploration through Julie's purpose-built tools and all state management through Goldfish's memory system.

**Same process. Better tools. Faster results.**

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Julie MCP Server](https://github.com/anortham/julie) — must be configured and indexing your workspace
- [Goldfish MCP Server](https://github.com/anortham/goldfish) — must be configured

## Installation

Razorback is a pure-content plugin (skills, commands, hooks) — no build step or runtime dependencies required.

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

1. **Session starts** — the `SessionStart` hook fires, injecting the `using-razorback` skill
2. **You request work** — Claude checks for applicable skills before every response
3. **Skills guide the workflow** — brainstorming, planning, TDD, debugging, code review, and verification all route exploration through Julie and state through Goldfish

No configuration needed beyond plugin installation (assuming Julie and Goldfish are already set up).

## What Changed from Superpowers

**Everything kept:**
- All 14 skills with identical process flows
- Same brainstorming → planning → TDD → execution → review → completion workflow
- Same two-stage code review (spec compliance + code quality)
- Same anti-rationalization tables and red flags
- Same SessionStart hook for skill activation

**What was added:**
- Julie tool calls at every exploration point (get_context, deep_dive, fast_refs, get_symbols)
- Goldfish integration for plan persistence and session continuity
- Toolchain documentation in the entry-point skill
- Checkpoint instructions at milestone completion points

## Skills

| Skill | Julie Integration | Goldfish Integration |
|-------|-------------------|---------------------|
| using-razorback | Toolchain docs | Toolchain docs |
| brainstorming | get_context for exploration | recall + plan for persistence |
| writing-plans | — | plan(save) for persistence |
| subagent-driven-development | — | checkpoint per task |
| executing-plans | — | recall + checkpoint per batch |
| test-driven-development | get_symbols for patterns | — |
| systematic-debugging | deep_dive + fast_refs | — |
| requesting-code-review | deep_dive + fast_refs | — |
| receiving-code-review | deep_dive + fast_refs | — |
| verification-before-completion | fast_refs for impact | checkpoint for evidence |
| finishing-a-development-branch | — | checkpoint + plan(complete) |
| dispatching-parallel-agents | get_context hint | — |
| using-git-worktrees | — | — |
| writing-skills | — | — |

## Subagent Prompt Changes

| Prompt | Julie Integration |
|--------|-------------------|
| implementer-prompt.md | Full orientation block: get_context → deep_dive → fast_refs → get_symbols |
| spec-reviewer-prompt.md | get_symbols + fast_refs for targeted review |
| code-quality-reviewer-prompt.md | deep_dive + fast_refs for impact analysis |

## License

MIT (forked from Superpowers, also MIT)

## Credits

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.
