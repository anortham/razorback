# Razorback for Codex

Guide for using Razorback with OpenAI Codex via native skill discovery in the CLI or desktop app.

## Quick Install

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.codex/INSTALL.md
```

## Manual Installation

### Prerequisites

- OpenAI Codex CLI or Codex desktop app
- Git
- Miller MCP configured in Codex
- [Goldfish MCP Server](https://github.com/anortham/goldfish) configured in Codex

### Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/anortham/razorback.git ~/.codex/razorback
   ```

2. Create the skills symlink:
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/razorback/skills ~/.agents/skills/razorback
   ```

3. Enable multi-agent support in your Codex config (required for `subagent-driven-development` and `dispatching-parallel-agents`):
   ```toml
   [features]
   multi_agent = true
   ```

4. Restart Codex CLI or the desktop app.

### Windows

Use a junction instead of a symlink (works without Developer Mode):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
cmd /c mklink /J "$env:USERPROFILE\.agents\skills\razorback" "$env:USERPROFILE\.codex\razorback\skills"
```

## How It Works

Codex CLI and the Codex desktop app share native skill discovery. They scan `~/.agents/skills/` at startup, parse SKILL.md frontmatter, and load skills on demand. Razorback skills are made visible through a single symlink:

```
~/.agents/skills/razorback/ → ~/.codex/razorback/skills/
```

The `using-razorback` skill is discovered automatically and enforces skill usage discipline. No additional configuration needed beyond the shared install above.

**Note:** On Codex, delegated plan execution routes through `subagent-driven-development`, which dispatches fresh implementer subagents in parallel when tasks are independent. If the current session cannot delegate, fall back to `executing-plans`.
Miller-first applies to the lead session and every spawned worker. Implementers, reviewers, and fix workers should orient with Miller before raw file reads.

**Desktop note:** The same Codex agent lifecycle applies in desktop sessions that expose `spawn_agent`, `send_input`, `wait_agent`, and `close_agent`. The separate `razorback:codex-cli` skill is for launching an external Codex CLI reviewer or delegate, not for the desktop app's built-in tools.

## Usage

Skills are discovered automatically. Codex activates them when:
- You mention a skill by name (e.g., "use brainstorming")
- The task matches a skill's description
- The `using-razorback` skill directs Codex to use one

### Miller MCP

Razorback skills assume Miller is configured. Without it, the exploration directives in skill bodies will fail. Use Miller by capability: `context` to orient, `search` to find text/symbols/files/content, `inspect` to list file symbols or inspect symbols, `trace` to find references, `impact` to assess blast radius, and `workspace` to manage indexing. Install and configure Miller before relying on razorback for real work.

### Goldfish MCP

Razorback's long-running autonomous flow also assumes Goldfish is configured for checkpoints, recall, and recovery. Install Goldfish before relying on overnight or resumed runs: https://github.com/anortham/goldfish

### Personal Skills

Create your own skills in `~/.agents/skills/`:

```bash
mkdir -p ~/.agents/skills/my-skill
```

Create `~/.agents/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Use when [condition] - [what it does]
---

# My Skill

[Your skill content here]
```

The `description` field is how Codex decides when to activate a skill automatically. Write it as a clear trigger condition.

## Updating

```bash
cd ~/.codex/razorback && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/razorback
```

**Windows (PowerShell):**
```powershell
Remove-Item "$env:USERPROFILE\.agents\skills\razorback"
```

Optionally delete the clone: `rm -rf ~/.codex/razorback` (Windows: `Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\razorback"`).

## Troubleshooting

### Skills not showing up

1. Verify the symlink: `ls -la ~/.agents/skills/razorback`
2. Check skills exist: `ls ~/.codex/razorback/skills`
3. Restart Codex CLI or the desktop app. Skills are discovered at startup.

### Windows junction issues

Junctions normally work without special permissions. If creation fails, try running PowerShell as administrator.

## Getting Help

- Report issues: https://github.com/anortham/razorback/issues
- Main documentation: https://github.com/anortham/razorback
