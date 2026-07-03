# Installing Razorback for Codex CLI and Desktop

Enable razorback skills in Codex CLI or the Codex desktop app with the Codex plugin install path first. Local clone plus skills symlink remains the development fallback.

## Prerequisites

- Git
- Miller MCP configured in Codex
- [Goldfish MCP Server](https://github.com/anortham/goldfish) configured in Codex

Razorback assumes both Miller and Goldfish are available.

## Installation

### Preferred: Codex plugin install

1. **Use the repo-scoped Codex marketplace entry** in `.agents/plugins/marketplace.json` to install the `razorback` plugin from this repository.

2. **Enable multi-agent support** (required for parallel execution skills). Add to your Codex config:
   ```toml
   [features]
   multi_agent = true
   ```

3. **Restart Codex** (quit and relaunch the CLI or desktop app) so native skill discovery reloads the installed plugin skills.

### Fallback: local clone plus skills symlink

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

4. **Restart Codex** (quit and relaunch the CLI or desktop app) to discover the skills.

## Verify

```bash
codex features list | grep '^multi_agent'
```

If you used the manual fallback, also verify the local skills path:

```bash
ls -la ~/.agents/skills/razorback
```

`multi_agent` should show as enabled. For the manual fallback, the path should be a symlink (or junction on Windows) pointing to your razorback skills directory.

## Updating

For the preferred plugin install path, refresh razorback through the same Codex plugin marketplace flow you used to install it.

For the manual fallback:

```bash
cd ~/.codex/razorback && git pull
```

Skills update instantly through the fallback symlink. Restart Codex if you want the refreshed skill list reflected in discovery.

## Uninstalling

If you installed via the Codex plugin path, remove the `razorback` plugin from Codex.

If you used the manual fallback:

```bash
rm ~/.agents/skills/razorback
```

Optionally delete the clone: `rm -rf ~/.codex/razorback`.
