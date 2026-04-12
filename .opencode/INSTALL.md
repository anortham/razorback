# Installing Razorback for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed
- **Julie MCP server** configured and available — razorback uses Julie for code intelligence and requires it (unlike superpowers, there is no fallback to generic tools)

## Installation

Add razorback to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git"]
}
```

Restart OpenCode. That's it — the plugin auto-registers its skills directory; no symlinks needed.

Verify by asking: "Tell me about razorback."

## Migrating from the old symlink-based install

If you previously installed razorback by cloning and symlinking, remove the old setup:

```bash
# Remove old symlinks
rm -f ~/.config/opencode/plugins/razorback.js
rm -rf ~/.config/opencode/skills/razorback

# Optionally remove the cloned repo
rm -rf ~/.config/opencode/razorback
```

Also remove any `skills.paths` entry in your `opencode.json` that pointed at the razorback skills directory — the plugin now registers that path itself.

Then follow the installation steps above.

## Usage

Use OpenCode's native `skill` tool:

```
use skill tool to list skills
use skill tool to load razorback/brainstorming
```

## Updating

Razorback updates automatically when you restart OpenCode.

To pin a specific version:

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#v0.7.1"]
}
```

## Troubleshooting

### Plugin not loading

1. Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i razorback`
2. Verify the plugin line in your `opencode.json`
3. Make sure you're running a recent version of OpenCode

### Skills not found

1. Use the `skill` tool to list what's discovered
2. Confirm the plugin is loading (see above) — if it is, the skills directory is registered automatically
3. Confirm you don't have a stale `skills.paths` entry pointing at a symlinked location

### Julie not available

Razorback skills assume Julie MCP is present. If Julie isn't configured, many skills (exploration, editing, refs) won't function. Install and configure the Julie MCP server before using razorback.

### Tool mapping

When skills reference Claude Code tools:
- `TodoWrite` → `todowrite`
- `Task` with subagents → `@mention` syntax
- `Skill` tool → OpenCode's native `skill` tool
- File operations → your native tools

## Getting Help

- Report issues: https://github.com/anortham/razorback/issues
