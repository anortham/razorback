# Razorback for Codex

Guide for using Razorback with OpenAI Codex in the CLI or desktop app. Preferred install uses the Codex plugin path; native skill discovery still loads the installed skills at startup.

## Quick Install

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.codex/INSTALL.md
```

The preferred path is the Codex plugin install flow from this repository's `.agents/plugins/marketplace.json`.

## Manual Installation

### Prerequisites

- OpenAI Codex CLI or Codex desktop app
- Git
- code-kb MCP configured in Codex (optional)
- [Goldfish MCP Server](https://github.com/anortham/goldfish) configured in Codex (optional)

### Steps

Manual installation is the local-development fallback when you do not want to install the Codex plugin from the repo-scoped marketplace entry.

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

Codex CLI and the Codex desktop app share native skill discovery. With the preferred install path, Codex reads the plugin metadata from `.codex-plugin/plugin.json`, installs from the repo-scoped marketplace entry, and loads the bundled skills at startup. The manual fallback still uses `~/.agents/skills/`:

```
~/.agents/skills/razorback/ -> ~/.codex/razorback/skills/
```

The `using-razorback` skill is discovered automatically and enforces skill usage discipline. No additional Codex hook setup is required for this plugin path or for the fallback symlink.

**Note:** On Codex, one coherent task runs directly in the lead session. Delegated plan execution routes through `subagent-driven-development` for independent tasks, which dispatches fresh implementer subagents in parallel. If the current session cannot delegate, use `executing-plans`.
The evidence rules apply to the lead session and every spawned worker: code-kb is the first route for code structure, and native search and file reads are the first route for literal text and small whole files.

**Desktop note:** The same Codex agent lifecycle applies in desktop sessions that expose `spawn_agent`, `send_input`, `wait_agent`, and `close_agent`. The separate `razorback:codex-cli` skill is for launching an external Codex CLI reviewer or delegate, not for the desktop app's built-in tools.

## Usage

Skills are discovered automatically. Codex activates them when:
- You mention a skill by name (e.g., "use brainstorming")
- The task matches a skill's description
- The `using-razorback` skill directs Codex to use one

### code-kb MCP

code-kb is optional. When it is configured, skills use it first for code structure. Without it, they use native search and file reads. Use code-kb by capability: `file_skeleton` on a folder or a file you do not know yet, to orient; `lookup_symbol` to locate symbols by name or concept, and routes or config keys (one short definition comes with its body); `get_symbol_context` before you change a symbol, since it carries the body, callers, tests to run, and types; and `check_edit` after you edit, to check for callers and tests the diff did not reach. Read the file you will edit, since the editor needs it. `get_symbol_body`, `find_references`, and `blast_radius` give a full body, the full list of callers or callees, and the full list of tests. Use your host's native editing tools to modify files.

### Goldfish MCP

Goldfish is optional. When it is configured, the long-running autonomous flow uses it for checkpoints, recall, and recovery. Without it, the plan, the ledger, and git state carry recovery. Install Goldfish: https://github.com/anortham/goldfish

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

If you installed razorback as a Codex plugin, refresh it through the same plugin marketplace flow you used to install it.

If you used the manual fallback:

```bash
cd ~/.codex/razorback && git pull
```

Skills update instantly through the fallback symlink. Restart Codex if you want the refreshed skill list reflected in discovery.

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

1. Restart Codex CLI or the desktop app. Native skill discovery runs at startup.
2. If you used the manual fallback, verify the symlink: `ls -la ~/.agents/skills/razorback`
3. If you used the manual fallback, check skills exist: `ls ~/.codex/razorback/skills`

### Windows junction issues

Junctions normally work without special permissions. If creation fails, try running PowerShell as administrator.

## Getting Help

- Report issues: https://github.com/anortham/razorback/issues
- Main documentation: https://github.com/anortham/razorback
