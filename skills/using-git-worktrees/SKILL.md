---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from the current workspace, or before executing implementation plans
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 2 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout. Continue to Step 0b.

## Step 0b: Inventory Existing Worktrees and Branches

**Step 0 answers "am I isolated?". This step answers "what else is already outstanding?".** Skipping it is how a phase-2 worktree gets created beside a phase-1 worktree whose work never landed.

Run Check A of `../using-razorback/references/source-control-hygiene.md`:

```bash
git worktree list
git -C <each listed path> status --short --branch
git branch --no-merged <base-branch>
```

For each worktree other than the one you are standing in, and each unmerged branch, classify it with `git log --oneline <base>..<branch>` (empty result means merged).

**Report what you found before creating anything.** One line per outstanding item:

```
Existing worktrees: <path> on <branch> — <N unmerged commits | clean, merged | dirty (<M> files)>
```

Then decide, and say which you chose:

- **Continuation** — the new work builds on an unmerged branch. Branch from that branch, or reuse its worktree. A sibling cut from the base cannot see that branch's code and will conflict later.
- **Sibling** — the new work is genuinely independent. Create the new worktree and state that the outstanding work stays outstanding.
- **Reuse** — an existing worktree already matches this task. Use it; do not create a second one.

Finding stranded work does **not** block worktree creation, and it is not a blocker-taxonomy stop. It obliges disclosure. Creating a worktree silently beside unmerged work is the failure; creating one deliberately beside it, and saying so, is fine.

Worktrees outside razorback-managed locations belong to the user. Report them; never remove or reuse them without saying so.

## Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

### 1a. Native Worktree Tools (preferred)

Do you already have a way to create a worktree? It might be a tool with a name like `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag. If you do, use it and skip to Step 2.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Only proceed to Step 1b if you have no native worktree tool available.

### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

#### Directory Selection

Follow this priority order. Explicit user preference always beats observed filesystem state.

1. **Check your instructions for a declared worktree directory preference.** If the user has already specified one, use it without asking.

2. **Check for an existing project-local worktree directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.

3. **Check for an existing global directory:**
   ```bash
   project=$(basename "$(git rev-parse --show-toplevel)")
   ls -d ~/.config/razorback/worktrees/$project 2>/dev/null
   ```
   If found, use it.

4. **Check CLAUDE.md for a stated preference:**
   ```bash
   grep -i "worktree.*director" CLAUDE.md 2>/dev/null
   ```
   If a preference is specified, use it without asking.

5. **Default to `.worktrees/` at the project root.** Razorback runs to completion; do not stop to ask for a directory preference. The user can override the location explicitly in their request.

#### Safety Verification (project-local directories only)

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit the change, then proceed.

**Why critical:** Prevents accidentally committing worktree contents to repository.

Global directories (`~/.config/razorback/worktrees/`) need no verification — outside project entirely.

#### Create the Worktree

```bash
project=$(basename "$(git rev-parse --show-toplevel)")

# Determine path based on chosen location
# For project-local: path="$LOCATION/$BRANCH_NAME"
# For global: path="~/.config/razorback/worktrees/$project/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), tell the user the sandbox blocked worktree creation and you're working in the current directory instead. Then run setup and baseline verification in place.

## Step 2: Project Setup

Run the project-documented setup command. Prefer repo docs, existing scripts, CI metadata, or manifest-declared commands. If the repo has no setup guidance, use ecosystem detection as a fallback and record the choice.

```bash
<project-defined setup command>
```

## Step 3: Verify Clean Baseline

Run the project-defined baseline or smoke verification scope to ensure the worktree starts clean. Use the target repo's docs as the source of truth.

```bash
<project-defined baseline or smoke command>
```

**If baseline verification fails:** Treat it as a real blocker unless the plan explicitly says to work from a failing baseline. Report the failure with the command and short output summary. Do not proceed on a broken baseline by default.

**If baseline verification passes:** Report ready.

**If the project has no automated test suite** (content-only repos, pure documentation, skill libraries, config-only projects): skip this step. Note in your report that the baseline is manual-verify-only and list the integration checks a reviewer would run instead (schema validation, link checks, manifest validation).

### Report

```
Worktree ready at <full-path>
Baseline verification passing (<N> checks, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Sibling worktree has unmerged commits | Report it, then choose continuation / sibling / reuse (Step 0b) |
| Sibling worktree is dirty | Report it before creating anything (Step 0b) |
| New work builds on an unmerged branch | Branch from that branch — don't cut a sibling from the base (Step 0b) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check CLAUDE.md, then default to `.worktrees/` |
| Global path exists | Use it |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Sandbox fallback, work in place |
| Baseline verification fails | Report blocker; do not proceed unless plan allows it |

## Common Mistakes

### Fighting the harness

- **Problem:** Using `git worktree add` when the platform already provides isolation
- **Fix:** Step 0 detects existing isolation. Step 1a defers to native tools.

### Skipping detection

- **Problem:** Creating a nested worktree inside an existing one
- **Fix:** Always run Step 0 before creating anything

### Accumulating stranded worktrees

- **Problem:** Phase 2 gets a fresh worktree while phase 1's worktree still holds unmerged commits. Nobody notices until the run reports "complete" with work stranded in two places.
- **Fix:** Step 0b inventories and reports every outstanding worktree and branch before creation, and prefers continuation over a sibling cut from the base

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > global > CLAUDE.md > default

### Proceeding with failing baseline

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report the baseline as blocked unless the plan explicitly allows a failing baseline

## Red Flags

**Never:**
- Create a worktree without running the Step 0b inventory first
- Create a worktree silently beside another worktree that holds unmerged or uncommitted work
- Cut a sibling worktree from the base when the new work builds on an unmerged branch
- Remove or reuse a worktree outside a razorback-managed location without saying so
- Create a worktree when Step 0 detects existing isolation
- Use `git worktree add` when you have a native worktree tool (e.g., `EnterWorktree`). This is the #1 mistake — if you have it, use it.
- Skip Step 1a by jumping straight to Step 1b's git commands
- Create worktree without verifying it's ignored (project-local)
- Skip baseline verification
- Proceed with failing baseline unless the plan explicitly allows it
- Stop to ask for a worktree directory preference (default to `.worktrees/`)

**Always:**
- Run Step 0 detection first, then the Step 0b inventory
- State what the inventory found and which choice you made (continuation / sibling / reuse)
- Prefer native tools over git fallback
- Follow directory priority: existing > global > CLAUDE.md > default
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean baseline

## Integration

**Called by:**
- **brainstorming** (Phase 4) - REQUIRED when design is approved and implementation follows
- **subagent-driven-development** - REQUIRED before executing any tasks
- **executing-plans** - REQUIRED before executing any tasks
- Any skill needing isolated workspace

**Escape hatch:** The "REQUIRED" callers above default to worktree isolation. The user can opt out with explicit consent for small, same-session work where a feature branch on the current workspace is sufficient. Record the consent and proceed — don't silently skip worktree setup.

**Never called by:** razorback:fixing-small-issues. Quick-fix-tier work happens on the current checkout by policy — no worktree, no baseline verification, and no consent question needed, because this skill is never invoked for that tier.

**Pairs with:**
- **finishing-a-development-branch** - REQUIRED for cleanup after work complete
