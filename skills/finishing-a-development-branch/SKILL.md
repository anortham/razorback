---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

## Overview

Guide completion of development work by selecting a mode, then executing the appropriate flow (autonomous push+PR or interactive menu).

**Core principle:** Verify tests -> choose mode (autonomous default) -> execute -> clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## Mode Selection

If the agent was just finishing an autonomous execution run (i.e. this skill is being invoked as the final step of `razorback:executing-plans` / `razorback:team-driven-development` / `razorback:subagent-driven-development`), use **Autonomous Mode**. If the user invoked the skill directly (e.g. "finish this branch"), use **Interactive Mode**. In ambiguous cases, default to Autonomous — run-to-completion is the bias.

## Autonomous Mode

No menu, no prompts. Push the branch, open a PR with the morning-report summary, write the full report to `.memories/`, emit a one-line terminal pointer, exit. Merge is never auto-performed.

### Step 1: Verify tests pass

Run the project's test suite:

```bash
npm test / cargo test / pytest / go test ./...
```

If tests fail, this is a blocker taxonomy #5 (unresolvable test failures). Do **not** create a PR. Instead:
- Render a partial morning report with `Status: Blocked`, the failure summary in the `Tests` section, and the blocker description in `Blockers hit`.
- Write it to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`.
- Emit terminal one-liner: `Blocked. Report: .memories/autonomous-run-YYYY-MM-DD-<slug>.md` and exit.

If tests pass, continue.

### Step 2: Determine base branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Use the branch that produced a merge-base. This becomes the PR's base.

### Step 3: Render morning report

Fill the placeholders in `./morning-report-template.md` using the fields the caller accumulated during execution (plan name + path, branch name, phases complete/total, tasks complete/total, duration, judgment calls log, external review outcome, tests summary, blockers, files changed from `git diff --stat <base>..HEAD`, next steps).

Produce two renderings:
- **Full report** — every section filled in, for `.memories/` and for review.
- **PR summary** — status, What shipped, External review, Blockers, Next steps only. The Judgment calls section is not inlined in the PR description; the PR body points at the `.memories/` file instead (it lands in the PR via Step 6's commit).

### Step 4: Push branch

```bash
git push -u origin <branch>
```

If the push is rejected (branch already tracks a different remote, non-fast-forward, network failure), log the exact error in the report's `Blockers hit` section, set `Status: Blocked`, write the partial report to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, emit the terminal pointer, and exit. Do not retry with `--force`.

### Step 5: Create PR

```bash
gh pr create \
  --base <base-branch-from-step-2> \
  --title "<plan name or feature name>" \
  --body "$(rendered_pr_summary)"
```

If `gh` is not installed or the command fails (auth, network, repo not on origin), log the failure in `Blockers hit`, set `Status: Partial` (the branch was pushed but the PR was not created), write the report to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, emit the terminal pointer, and exit.

Capture the PR URL from `gh`'s output.

### Step 6: Write full report + commit

Write the full rendered report to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, where `<slug>` is a short kebab-case identifier for the plan (e.g. `autonomous-execution`).

```bash
git add .memories/autonomous-run-YYYY-MM-DD-<slug>.md
git commit -m "docs: autonomous run report for <plan name>"
git push
```

The extra push makes the `.memories/` file visible in the PR.

### Step 7: Emit terminal pointer

One line, then exit:

```
Done. PR: <url>. Report: .memories/autonomous-run-YYYY-MM-DD-<slug>.md
```

### Autonomous Mode rules

- **Never merge.** Stopping at PR creation is the point; merge is a separate human (or agent) action after PR review.
- **Never show a menu, never ask "which option".** Autonomous means no prompts.
- **Never fall back to Interactive Mode mid-run.** If a step fails (push rejected, `gh` missing, remote mismatch), emit a partial report with `Status: Blocked` or `Status: Partial` as appropriate and let the user resolve from there.
- **Always write the report to `.memories/`**, even on blocked/partial outcomes — the report is the user's morning read regardless of outcome.

## Interactive Mode

Used when the user invokes this skill directly ("finish this branch"). Presents the classic 4-option menu.

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 5)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | Yes | - | - | Yes |
| 2. Create PR | - | Yes | Yes | - |
| 3. Keep as-is | - | - | Yes | - |
| 4. Discard | - | - | - | Yes (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" -> ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Merge in autonomous mode — merge is always a separate human (or agent) action after PR review
- Fall back to Interactive Mode mid-autonomous-run — if autonomous mode can't complete (e.g. `gh` not installed), emit a partial report with status `Blocked` and let the user resolve; don't prompt for an option

**Always:**
- Verify tests before offering options (Interactive) or before pushing (Autonomous)
- In Interactive Mode, present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
- In Autonomous Mode, emit the morning report to all three destinations (PR summary, `.memories/` file, terminal one-liner) regardless of outcome

## Integration

**Called by:**
- `razorback:executing-plans` (Step 5) — Autonomous mode when the execution skill finishes cleanly
- `razorback:team-driven-development` (Step 5 or 5a+finish) — Autonomous mode
- `razorback:subagent-driven-development` (Step 5 or 4a+finish) — Autonomous mode
- Direct user invocation ("finish this branch") — Interactive mode

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill (Interactive Mode, Options 1 & 4)
- **morning-report-template.md** (this directory) — template rendered by Autonomous Mode Step 3
