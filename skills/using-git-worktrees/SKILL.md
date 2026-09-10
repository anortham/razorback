---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from the current workspace, or before executing implementation plans
---

# Using Git Worktrees

Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

**Not for:** quick-fix work (razorback:fixing-small-issues runs on the current checkout), a session already inside a linked worktree (Step 0 skips creation), or small same-session work where the user explicitly consented to a plain feature branch.

## Step 0: Detect existing isolation

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
git rev-parse --show-superproject-working-tree 2>/dev/null   # a path means submodule, not worktree
```

- `GIT_DIR != GIT_COMMON` and not a submodule → already in a linked worktree. Report "Already in isolated workspace at `<path>` on branch `<name>`" (or "detached HEAD, externally managed; branch creation needed at finish time"). Skip to Step 2.
- Otherwise → normal checkout. Continue to Step 0b.

## Step 0b: Inventory Existing Worktrees and Branches

Step 0 answers "am I isolated?"; this step answers "what else is outstanding?". Run Check A of the `razorback:using-razorback` skill's `references/source-control-hygiene.md`:

```bash
git worktree list
git -C <each listed path> status --short --branch
git branch --no-merged <base-branch>
git log --oneline <base>..<branch>      # per other worktree / unmerged branch; empty means merged
```

**Report what you found before creating anything**, one line per item:

```
Existing worktrees: <path> on <branch> — <N unmerged commits | clean, merged | dirty (<M> files)>
```

Then choose and say which:

| Choice | When | Action |
|--------|------|--------|
| Continuation | New work builds on an unmerged branch | Branch from that branch or reuse its worktree; a sibling cut from base cannot see its code |
| Sibling | New work is independent | Create the worktree; state that the outstanding work stays outstanding |
| Reuse | An existing worktree matches this task | Use it; no second one |

Finding stranded work does **not** block worktree creation, and it is not a blocker-taxonomy stop. It obliges disclosure. Worktrees outside razorback-managed locations belong to the user: report them; never remove or reuse them without saying so.

## Step 1: Create isolated workspace

### 1a. Native worktree tools (preferred)

If the harness offers a worktree tool (`EnterWorktree`, `WorktreeCreate`, a `/worktree` command, a `--worktree` flag), use it and skip to Step 2. `git worktree add` beside a native tool creates state the harness cannot see.

### 1b. Git worktree fallback

Directory priority (explicit user preference always wins):

1. A worktree directory declared in your instructions.
2. Existing project-local `.worktrees/` (preferred) or `worktrees/`; `.worktrees/` wins if both exist.
3. Existing global `~/.config/razorback/worktrees/$project` (`project=$(basename "$(git rev-parse --show-toplevel)")`).
4. A preference in CLAUDE.md (`grep -i "worktree.*director" CLAUDE.md`).
5. Default to `.worktrees/` at the project root. Do not stop to ask.

Project-local directories MUST be ignored before creation; global directories need no check:

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

If not ignored: add to `.gitignore`, commit, then proceed.

```bash
git worktree add "$path" -b "$BRANCH_NAME"    # $path = <location>/$BRANCH_NAME
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error, say the sandbox blocked worktree creation, work in the current directory, and run setup and baseline there.

## Step 2: Project setup

Run the project-documented setup command (repo docs, scripts, CI metadata, manifest). No guidance → ecosystem detection, and record the choice.

## Step 3: Verify clean baseline

Run the project-defined baseline or smoke scope.

- Fails → real blocker unless the plan explicitly allows a failing baseline. Report the command and a short output summary; do not proceed on a broken baseline by default.
- No automated suite (docs, skills, config-only repos) → skip; report "manual-verify-only" and list the checks a reviewer would run instead.
- Passes → report:

```
Worktree ready at <full-path>
Baseline verification passing (<N> checks, 0 failures)
Ready to implement <feature-name>
```

## Quick reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0) |
| Sibling worktree unmerged or dirty | Report, then continuation / sibling / reuse (Step 0b) |
| Native worktree tool available | Use it (Step 1a) |
| Directory not ignored | Add to .gitignore + commit (Step 1b) |
| Permission error on create | Sandbox fallback, work in place |
| Baseline fails | Report blocker; do not proceed unless plan allows |

## Red Flags

**Never:**
- Create a worktree without running the Step 0b inventory first
- Create a worktree silently beside another worktree that holds unmerged or uncommitted work
- Cut a sibling worktree from the base when the new work builds on an unmerged branch
- Remove or reuse a worktree outside a razorback-managed location without saying so
- Create a worktree when Step 0 detects existing isolation
- Use `git worktree add` when you have a native worktree tool (e.g., `EnterWorktree`). This is the #1 mistake — if you have it, use it.
- Create worktree without verifying it's ignored (project-local)
- Skip baseline verification
- Proceed with failing baseline unless the plan explicitly allows it
- Stop to ask for a worktree directory preference (default to `.worktrees/`)

## It's working if

- Step 0 and Step 0b ran before anything was created, and the report names the choice (continuation / sibling / reuse).
- The worktree came from the native tool wherever one exists.
- Baseline passed, or the report says manual-verify-only and why, before implementation started.

## Integration

**Called by:** razorback:brainstorming (Phase 4), razorback:subagent-driven-development, razorback:executing-plans — REQUIRED before executing tasks. **Escape hatch:** the user can opt out with explicit consent for small, same-session work on a feature branch; record the consent.

**Never called by:** razorback:fixing-small-issues. Quick-fix-tier work happens on the current checkout by policy — no worktree, no baseline verification, and no consent question needed.

**Pairs with:** razorback:finishing-a-development-branch — cleanup after work completes.
