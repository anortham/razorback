# Razorback for OpenCode

Complete guide for using razorback with [opencode.ai](https://opencode.ai).

For the bare-minimum quick install, see [`.opencode/INSTALL.md`](../.opencode/INSTALL.md). This document is the long-form guide.

## Prerequisites

- [opencode.ai](https://opencode.ai) installed
- **Julie MCP server** configured and available. Razorback skills depend on Julie for code intelligence, with no fallback to generic tools.

## Installation

Add razorback to the `plugin` array in your `opencode.json` (global at `~/.config/opencode/opencode.json`, or project-level):

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git"]
}
```

Restart opencode. The plugin auto-installs via Bun and registers all skills automatically.

Verify by asking: "Tell me about razorback."

## Migrating from the old symlink-based install

If you installed razorback in the v0.5.0 era using `git clone` and symlinks, remove the old setup before adding the plugin entry:

```bash
# Remove old symlinks
rm -f ~/.config/opencode/plugins/razorback.js
rm -rf ~/.config/opencode/skills/razorback

# Optional: remove the cloned repo
rm -rf ~/.config/opencode/razorback
```

Also open `opencode.json` and remove any `skills.paths` entry you added for razorback. Then follow the installation step above.

## Usage

### Finding Skills

Use opencode's native `skill` tool to list all available skills:

```
use skill tool to list skills
```

### Loading a Skill

```
use skill tool to load razorback/brainstorming
```

### Personal Skills

Create your own skills in `~/.config/opencode/skills/`:

```bash
mkdir -p ~/.config/opencode/skills/my-skill
```

Create `~/.config/opencode/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Use when [condition] - [what it does]
---

# My Skill

[Your skill content here]
```

### Project Skills

Create project-specific skills in `.opencode/skills/<name>/SKILL.md` inside your project.

**Skill Priority:** Project skills > Personal skills > razorback skills

## Updating

Razorback updates when you restart opencode. The plugin is re-fetched from the git repository on each launch.

To pin a specific version, append a branch or tag:

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#v0.7.0"]
}
```

## How It Works

The plugin (`.opencode/plugins/razorback.js`) wires two hooks:

1. **`config` hook** registers razorback's `skills/` directory with opencode so every skill is discoverable natively. No symlinks, no manual paths.
2. **`experimental.chat.messages.transform` hook** injects the razorback bootstrap (from `skills/using-razorback/SKILL.md`) on the first user message of a conversation. Transforming messages rather than the system prompt avoids token bloat on every turn and sidesteps compatibility issues with models like Qwen.

### Execution model

Agent Teams aren't available in opencode, so the primary execution path is `subagent-driven-development`: a fresh subagent per task, with the lead doing inline review. Sequential work still uses `executing-plans`, and ad-hoc parallel work uses `dispatching-parallel-agents`.

### Tool mapping

Skills written for Claude Code are adapted on the fly:

- `TodoWrite` → `todowrite`
- `Task` with subagents → opencode's `@mention` system
- `Skill` tool → opencode's native `skill` tool
- File operations → native opencode tools

## Troubleshooting

### Plugin not loading

1. Check opencode logs: `opencode run --print-logs "hello" 2>&1 | grep -i razorback`
2. Verify the `plugin` entry in your `opencode.json` is spelled correctly and points to the right git URL
3. Make sure you're on a recent opencode release that supports git-sourced plugins

### Skills not found

1. Use the `skill` tool to list available skills. Razorback skills should appear alongside any personal or project skills.
2. Confirm the plugin is actually loading (see above)
3. Each skill needs a `SKILL.md` with valid YAML frontmatter (`name` and `description` required)

### Bootstrap not appearing

1. Confirm your opencode version supports the `experimental.chat.messages.transform` hook
2. Restart opencode after changing `opencode.json`
3. The bootstrap lives in `skills/using-razorback/SKILL.md` inside the fetched plugin. If it's missing there, the plugin install itself failed.

## Getting Help

- Report issues: https://github.com/anortham/razorback/issues
- Main documentation: https://github.com/anortham/razorback
- opencode docs: https://opencode.ai/docs/
