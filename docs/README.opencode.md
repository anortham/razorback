# Razorback for OpenCode

Complete guide for using Razorback with [OpenCode.ai](https://opencode.ai).

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed
- Git installed
- **Julie MCP server** configured and available (razorback skills require Julie for code intelligence)

## Quick Install

Tell OpenCode:

```
Clone https://github.com/anortham/razorback to ~/.config/opencode/razorback, then create directory ~/.config/opencode/plugins, then symlink ~/.config/opencode/razorback/.opencode/plugins/razorback.js to ~/.config/opencode/plugins/razorback.js, then symlink ~/.config/opencode/razorback/skills to ~/.config/opencode/skills/razorback, then restart opencode.
```

## Manual Installation

### macOS / Linux

```bash
# 1. Install Razorback (or update existing)
if [ -d ~/.config/opencode/razorback ]; then
  cd ~/.config/opencode/razorback && git pull
else
  git clone https://github.com/anortham/razorback.git ~/.config/opencode/razorback
fi

# 2. Create directories
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/skills

# 3. Remove old symlinks/directories if they exist
rm -f ~/.config/opencode/plugins/razorback.js
rm -rf ~/.config/opencode/skills/razorback

# 4. Create symlinks
ln -s ~/.config/opencode/razorback/.opencode/plugins/razorback.js ~/.config/opencode/plugins/razorback.js
ln -s ~/.config/opencode/razorback/skills ~/.config/opencode/skills/razorback

# 5. Restart OpenCode
```

#### Verify Installation

```bash
ls -l ~/.config/opencode/plugins/razorback.js
ls -l ~/.config/opencode/skills/razorback
```

Both should show symlinks pointing to the razorback directory.

### Windows

**Prerequisites:**
- Git installed
- Either **Developer Mode** enabled OR **Administrator privileges**
  - Windows 10: Settings > Update & Security > For developers
  - Windows 11: Settings > System > For developers

Pick your shell below: [Command Prompt](#command-prompt) | [PowerShell](#powershell) | [Git Bash](#git-bash)

#### Command Prompt

Run as Administrator, or with Developer Mode enabled:

```cmd
:: 1. Install Razorback
git clone https://github.com/anortham/razorback.git "%USERPROFILE%\.config\opencode\razorback"

:: 2. Create directories
mkdir "%USERPROFILE%\.config\opencode\plugins" 2>nul
mkdir "%USERPROFILE%\.config\opencode\skills" 2>nul

:: 3. Remove existing links (safe for reinstalls)
del "%USERPROFILE%\.config\opencode\plugins\razorback.js" 2>nul
rmdir "%USERPROFILE%\.config\opencode\skills\razorback" 2>nul

:: 4. Create plugin symlink (requires Developer Mode or Admin)
mklink "%USERPROFILE%\.config\opencode\plugins\razorback.js" "%USERPROFILE%\.config\opencode\razorback\.opencode\plugins\razorback.js"

:: 5. Create skills junction (works without special privileges)
mklink /J "%USERPROFILE%\.config\opencode\skills\razorback" "%USERPROFILE%\.config\opencode\razorback\skills"

:: 6. Restart OpenCode
```

#### PowerShell

Run as Administrator, or with Developer Mode enabled:

```powershell
# 1. Install Razorback
git clone https://github.com/anortham/razorback.git "$env:USERPROFILE\.config\opencode\razorback"

# 2. Create directories
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode\plugins"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode\skills"

# 3. Remove existing links (safe for reinstalls)
Remove-Item "$env:USERPROFILE\.config\opencode\plugins\razorback.js" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\.config\opencode\skills\razorback" -Force -ErrorAction SilentlyContinue

# 4. Create plugin symlink (requires Developer Mode or Admin)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\plugins\razorback.js" -Target "$env:USERPROFILE\.config\opencode\razorback\.opencode\plugins\razorback.js"

# 5. Create skills junction (works without special privileges)
New-Item -ItemType Junction -Path "$env:USERPROFILE\.config\opencode\skills\razorback" -Target "$env:USERPROFILE\.config\opencode\razorback\skills"

# 6. Restart OpenCode
```

#### Git Bash

Note: Git Bash's native `ln` command copies files instead of creating symlinks. Use `cmd //c mklink` instead (the `//c` is Git Bash syntax for `/c`).

```bash
# 1. Install Razorback
git clone https://github.com/anortham/razorback.git ~/.config/opencode/razorback

# 2. Create directories
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/skills

# 3. Remove existing links (safe for reinstalls)
rm -f ~/.config/opencode/plugins/razorback.js 2>/dev/null
rm -rf ~/.config/opencode/skills/razorback 2>/dev/null

# 4. Create plugin symlink (requires Developer Mode or Admin)
cmd //c "mklink \"$(cygpath -w ~/.config/opencode/plugins/razorback.js)\" \"$(cygpath -w ~/.config/opencode/razorback/.opencode/plugins/razorback.js)\""

# 5. Create skills junction (works without special privileges)
cmd //c "mklink /J \"$(cygpath -w ~/.config/opencode/skills/razorback)\" \"$(cygpath -w ~/.config/opencode/razorback/skills)\""

# 6. Restart OpenCode
```

#### WSL Users

If running OpenCode inside WSL, use the [macOS / Linux](#macos--linux) instructions instead.

#### Verify Installation (Windows)

**Command Prompt:**
```cmd
dir /AL "%USERPROFILE%\.config\opencode\plugins"
dir /AL "%USERPROFILE%\.config\opencode\skills"
```

**PowerShell:**
```powershell
Get-ChildItem "$env:USERPROFILE\.config\opencode\plugins" | Where-Object { $_.LinkType }
Get-ChildItem "$env:USERPROFILE\.config\opencode\skills" | Where-Object { $_.LinkType }
```

Look for `<SYMLINK>` or `<JUNCTION>` in the output.

#### Troubleshooting Windows

**"You do not have sufficient privilege" error:**
- Enable Developer Mode in Windows Settings, OR
- Right-click your terminal > "Run as Administrator"

**"Cannot create a file when that file already exists":**
- Run the removal commands (step 3) first, then retry

**Symlinks not working after git clone:**
- Run `git config --global core.symlinks true` and re-clone

## Usage

### Finding Skills

Use OpenCode's native `skill` tool to list all available skills:

```
use skill tool to list skills
```

### Loading a Skill

Use OpenCode's native `skill` tool to load a specific skill:

```
use skill tool to load razorback/brainstorming
```

## Updating

```bash
cd ~/.config/opencode/razorback
git pull
```

Restart OpenCode to load the updates.

## Removal

### macOS / Linux

```bash
# 1. Remove symlinks
rm -f ~/.config/opencode/plugins/razorback.js
rm -rf ~/.config/opencode/skills/razorback

# 2. Remove razorback repo
rm -rf ~/.config/opencode/razorback

# 3. Restart OpenCode
```

### Windows — Command Prompt

```cmd
:: 1. Remove symlinks/junctions
del "%USERPROFILE%\.config\opencode\plugins\razorback.js"
rmdir "%USERPROFILE%\.config\opencode\skills\razorback"

:: 2. Remove razorback repo
rmdir /S /Q "%USERPROFILE%\.config\opencode\razorback"

:: 3. Restart OpenCode
```

### Windows — PowerShell

```powershell
# 1. Remove symlinks/junctions
Remove-Item "$env:USERPROFILE\.config\opencode\plugins\razorback.js" -Force
Remove-Item "$env:USERPROFILE\.config\opencode\skills\razorback" -Force

# 2. Remove razorback repo
Remove-Item "$env:USERPROFILE\.config\opencode\razorback" -Recurse -Force

# 3. Restart OpenCode
```

### Windows — Git Bash

```bash
# 1. Remove symlinks/junctions
rm -f ~/.config/opencode/plugins/razorback.js
rm -rf ~/.config/opencode/skills/razorback

# 2. Remove razorback repo
rm -rf ~/.config/opencode/razorback

# 3. Restart OpenCode
```

## Troubleshooting

### Plugin not loading

1. Check plugin exists: `ls ~/.config/opencode/razorback/.opencode/plugins/razorback.js`
2. Check symlink: `ls -l ~/.config/opencode/plugins/` (macOS/Linux) or `dir /AL %USERPROFILE%\.config\opencode\plugins` (Windows)
3. Check OpenCode logs: `opencode run "test" --print-logs --log-level DEBUG`

### Skills not found

1. Verify skills symlink: `ls -l ~/.config/opencode/skills/razorback` (should point to razorback/skills/)
2. Use OpenCode's `skill` tool to list available skills
3. Check skill structure: each skill needs a `SKILL.md` file with valid frontmatter

### Windows: Module not found error

If you see `Cannot find module` errors on Windows:
- **Cause:** Git Bash `ln -sf` copies files instead of creating symlinks
- **Fix:** Use `mklink /J` directory junctions instead (see Windows installation steps)

### Bootstrap not appearing

1. Verify using-razorback skill exists: `ls ~/.config/opencode/razorback/skills/using-razorback/SKILL.md`
2. Check OpenCode version supports `experimental.chat.system.transform` hook
3. Restart OpenCode after plugin changes
