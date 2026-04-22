# Razorback

**Julie-powered development workflow for Claude Code, Cursor, Codex, OpenCode, Copilot CLI, and Gemini CLI.**

Razorback is a skill set for every major coding-agent harness, diverged from [Superpowers](https://github.com/obra/superpowers) to add Julie MCP for token-efficient codebase orientation. Plan execution runs through `subagent-driven-development` on harnesses that support delegation, and `executing-plans` where delegation is unavailable.

## Why?

AI-assisted development burns tokens on repetitive codebase exploration. Every agent and subagent re-discovers the same code through Glob/Grep/Read chains. Razorback solves this two ways:

- **Julie MCP** routes all exploration through purpose-built code intelligence tools (get_context, deep_dive, fast_refs, get_symbols) that return targeted context in 1-2 calls instead of 5-8
- **Julie-first applies to every worker**: the lead, implementers, reviewers, and fix workers all orient with Julie before raw file reads.
- **Parallel subagent dispatch with inline review by the lead** keeps the main agent's context clean while letting independent tasks move concurrently.
- **Autonomous execution of approved plans** with optional pre-merge external review (codex / gemini / claude) and compaction-durable goldfish checkpoints; runs overnight without waking you for anything short of a real blocker

## Requirements

- A supported harness: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.sh), [Codex](https://openai.com/codex/), [OpenCode](https://opencode.ai), [Copilot CLI](https://github.com/github/copilot-cli), or [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Julie MCP Server](https://github.com/anortham/julie) — hard requirement for code intelligence; must be configured and indexing your workspace
- [Goldfish MCP Server](https://github.com/anortham/goldfish) — hard requirement for persistent memory (checkpoints, briefs, recall); used for compaction-durable execution during long autonomous runs
- For Codex: enable `multi_agent = true` in `~/.codex/config.toml` so parallel execution skills can dispatch subagents

## Installation

Razorback is a pure-content plugin (skills, commands, hooks) — no build step or runtime dependencies required. Install paths below are all "pull from GitHub"; most harnesses support one-liner installs.

### Claude Code

```bash
/plugin marketplace add anortham/razorback
/plugin install razorback@razorback
```

Scope to a specific project instead of user-wide:

```bash
/plugin install razorback@razorback --scope project
```

Or clone and load locally for development:

```bash
git clone https://github.com/anortham/razorback.git
claude --plugin-dir /path/to/razorback
```

### Cursor

Cursor has a plugin marketplace, but razorback isn't listed there yet. For now, clone and point Cursor at the local checkout via its plugin-load mechanism:

```bash
git clone https://github.com/anortham/razorback.git ~/path/to/razorback
# Then in Cursor: add ~/path/to/razorback to your plugin paths
```

The plugin manifest at `.cursor-plugin/plugin.json` declares skills, agents, commands, and hooks. Cursor marketplace submission is tracked as a follow-up — it will just be a one-liner when live.

### Codex

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.codex/INSTALL.md
```

Codex uses native skill discovery, so installation is a clone plus a symlink at `~/.agents/skills/razorback`. Delegated execution skills (`subagent-driven-development`, `dispatching-parallel-agents`) require Codex's `multi_agent` feature.

**Detailed docs:** [.codex/INSTALL.md](.codex/INSTALL.md)

### OpenCode

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.opencode/INSTALL.md
```

**Detailed docs:** [.opencode/INSTALL.md](.opencode/INSTALL.md)

### Copilot CLI

```bash
copilot plugin marketplace add anortham/razorback
copilot plugin install razorback@razorback
```

Copilot CLI reads the same `.claude-plugin/marketplace.json` that Claude Code uses. Named plugin agents (like `razorback:code-reviewer`) are auto-discovered.

### Gemini CLI

```bash
gemini extensions install https://github.com/anortham/razorback
```

Gemini loads `gemini-extension.json` + `GEMINI.md` at session start, which pulls in the `using-razorback` skill and the Gemini tool mapping. Gemini CLI doesn't support subagents, so `subagent-driven-development` and `dispatching-parallel-agents` fall back to single-session execution via `executing-plans`.

### After Installation

Once loaded, razorback works automatically. The bootstrap path varies by harness:

1. **Session starts** — the `SessionStart` hook (Claude Code, Cursor), `messages.transform` (OpenCode), native skill discovery (Codex), the `SessionStart` hook with `additionalContext` (Copilot CLI), or `GEMINI.md` includes (Gemini CLI) surfaces the `using-razorback` skill.
2. **You request work** — the agent checks for applicable skills before every response.
3. **Skills guide the workflow** — brainstorming, planning, TDD, execution, review, and verification all route through Julie and the appropriate execution strategy for your harness.

No configuration needed beyond plugin installation (assuming Julie is already set up).

## Updating

No harness auto-pulls new content on restart. You have to opt in to updates.

### Claude Code

**If installed via marketplace (recommended):** enable auto-updates once, then updates pull on each session start.

```bash
# Turn on auto-update for the razorback marketplace
/plugin marketplace update razorback --auto

# Or pull a one-off update manually
/plugin marketplace update razorback
/plugin install razorback@razorback
```

**If installed from a local clone:** `git pull` the repo. Claude Code reloads plugin content on the next session start.

### Cursor

Until razorback lands in the Cursor marketplace, update by `git pull` in the local clone and restarting Cursor.

### Codex

```bash
cd ~/.codex/razorback && git pull
```

Skills update instantly through the symlink. Restart Codex if you want the new skill list reflected in discovery.

### OpenCode

OpenCode installs razorback as a Bun-cached npm/git package. The reliable pattern is pin-and-bump:

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#<version>"]
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

### Copilot CLI

```bash
copilot plugin update razorback
```

### Gemini CLI

```bash
gemini extensions update razorback
```

## Workflow

The core process: brainstorm, plan, TDD, execute, review, finish.

**Execution model (primary path depends on harness):**
- **Autonomous by default:** once a plan is approved, execution runs to completion gated only by real blockers. A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. An optional pre-merge external review (codex / gemini / claude) runs before branch finish. See [autonomous-execution design](docs/plans/2026-04-18-autonomous-execution-design.md) for the rationale.
- **Harnesses with delegation support, 2+ independent tasks:** `subagent-driven-development` dispatches fresh implementer subagents (in parallel when tasks are independent), and the lead does inline review (spec compliance + code quality) per task.
- **Gemini CLI (no subagent support):** falls back to `executing-plans` for all plans.
- **1 task, tightly sequential work, or no delegation:** `executing-plans` runs single-agent batch execution.
- **Ad-hoc parallel work (delegation available):** `dispatching-parallel-agents` for independent tasks outside plans.

## Skills

| Skill | Purpose |
|-------|---------|
| using-razorback | Entry point: skill routing, execution model, Julie toolchain |
| brainstorming | Requirements exploration, design, approach selection |
| writing-plans | Implementation plans (full or light) with Julie-verified file paths |
| executing-plans | Single-agent execution (fallback for sequential/single-task work or no-subagent harnesses) |
| test-driven-development | Red-green-refactor with Julie-powered test discovery |
| systematic-debugging | Root cause investigation with Julie-powered tracing |
| requesting-code-review | Inline review (during plan execution) or standalone review (ad-hoc) with per-harness dispatch |
| receiving-code-review | Process for acting on review feedback |
| verification-before-completion | Evidence-before-claims verification |
| finishing-a-development-branch | Merge/PR/cleanup decision workflow |
| dispatching-parallel-agents | Ad-hoc parallel agent dispatch |
| using-git-worktrees | Isolated workspace setup |
| writing-skills | Meta-skill for creating/editing skills |
| **subagent-driven-development** | **Primary delegated plan execution: fresh implementer subagents, parallel when independent, inline review by lead** |
| pre-merge-review | Optional external review (codex / gemini / claude) run before PR — verifies findings, dispatches fixes, emits morning-report block |
| codex-cli | Invokes `codex exec` (GPT-5.4 xhigh) for second opinions and adversarial review |
| gemini-cli | Invokes `gemini` (gemini-3-pro with `--yolo`) for second opinions and adversarial review |
| claude-cli | Invokes `claude -p` for second opinions and adversarial review; omits `--bare` because it breaks OAuth auth |

## Prompt Templates

| Template | Purpose |
|----------|---------|
| subagent-driven-development/implementer-prompt.md | Implementer spawn: task assignment, file ownership, Julie directives, status protocol |
| subagent-driven-development/fix-prompt.md | Fix-round prompt with reviewer findings and reframed-context guidance |
| subagent-driven-development/spec-reviewer-prompt.md | Review guide: spec compliance criteria |
| subagent-driven-development/code-quality-reviewer-prompt.md | Review guide: code quality criteria |

## Version management

Razorback ships five version-bearing manifests (`package.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `gemini-extension.json`). Keep them in sync with:

```bash
./scripts/bump-version.sh --check          # detect drift
./scripts/bump-version.sh --audit          # check + scan for undeclared version references
./scripts/bump-version.sh <new-version>    # bump all five in one pass
```

## License

MIT (diverged from Superpowers, also MIT)

## Credits

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.
