# Installing Razorback for Codex

Enable razorback skills in Codex via native skill discovery. Clone and symlink.

## Prerequisites

- Git
- [Julie MCP Server](https://github.com/anortham/julie) configured in Codex (razorback assumes Julie is available)

## Installation

1. **Clone the razorback repository:**
   ```bash
   git clone https://github.com/anortham/razorback.git ~/.codex/razorback
   ```

2. **Create the skills symlink:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/razorback/skills ~/.agents/skills/razorback
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\razorback" "$env:USERPROFILE\.codex\razorback\skills"
   ```

3. **Enable multi-agent support** (required for parallel execution skills). Add to your Codex config:
   ```toml
   [features]
   multi_agent = true
   ```

4. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Verify

```bash
ls -la ~/.agents/skills/razorback
```

You should see a symlink (or junction on Windows) pointing to your razorback skills directory.

## Updating

```bash
cd ~/.codex/razorback && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/razorback
```

Optionally delete the clone: `rm -rf ~/.codex/razorback`.
