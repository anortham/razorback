# Installing Razorback for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed
- **A code-intelligence MCP server** (julie or miller) configured and available — razorback uses it for code intelligence and requires it (unlike superpowers, there is no fallback to generic tools). Use [julie](https://github.com/anortham/julie) today, or miller (its .NET successor) once released

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

**Recommended: pin to a version and bump the pin to update.** Bun caches the git+https install by the full package spec, so changing `#ref` forces a fresh fetch.

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#<version>"]
}
```

Replace `<version>` with a tag from the [releases page](https://github.com/anortham/razorback/releases) (e.g. `v0.7.2`). To update, change the tag to a newer one and restart OpenCode.

**Unpinned installs** (`razorback@git+…razorback.git` with no `#ref`) may or may not refresh on restart depending on Bun version and platform. If yours gets stuck on an old version, flush the cache:

```bash
# macOS/Linux
rm -rf ~/.config/opencode/node_modules/razorback

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.config\opencode\node_modules\razorback"
```

Then restart OpenCode.

## Troubleshooting

### Plugin not loading

1. Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i razorback`
2. Verify the plugin line in your `opencode.json`
3. Make sure you're running a recent version of OpenCode

### Skills not found

1. Use the `skill` tool to list what's discovered
2. Confirm the plugin is loading (see above) — if it is, the skills directory is registered automatically
3. Confirm you don't have a stale `skills.paths` entry pointing at a symlinked location

### Code-intelligence MCP not available

Razorback skills assume a code-intelligence MCP (julie or miller) is present. If neither is configured, many skills (exploration, editing, refs) won't function. Install and configure a code-intelligence MCP server before using razorback.

### Tool mapping

When skills reference Claude Code tools:
- `TodoWrite` → `todowrite`
- `Agent` tool (dispatching subagents) → OpenCode's `Task` tool (same shape). Users can also `@mention` subagents manually from the UI.
- `Skill` tool → OpenCode's native `skill` tool
- File operations → your native tools

## Getting Help

- Report issues: https://github.com/anortham/razorback/issues
