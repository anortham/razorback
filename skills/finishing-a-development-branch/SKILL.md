---
name: finishing-a-development-branch
description: Use when implementation is complete, branch verification passes, and you need to decide how to integrate the work
---

# Finishing a Development Branch

## Overview

Guide completion of development work by selecting a mode, then executing the appropriate flow (autonomous push+PR or interactive menu).

**Core principle:** Verify the project-defined branch gate -> choose mode (autonomous default) -> execute -> clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## Mode Selection

If the agent was just finishing an autonomous execution run (i.e. this skill is being invoked as the final step of `razorback:executing-plans` or `razorback:subagent-driven-development`), use **Autonomous Mode**. If the user invoked the skill directly (e.g. "finish this branch"), use **Interactive Mode**. In ambiguous cases, default to Autonomous - run-to-completion is the bias.

## Autonomous Mode

No menu, no prompts. Push the branch, open a PR with the morning-report summary, write the full report to `.memories/`, emit a one-line terminal pointer, exit. Merge is never auto-performed.

### Step 1: Verify branch gate

Use the plan's Verification Strategy and verification ledger.

Run the project-defined `branch-gate` scope before push or PR. If the verification ledger already has a passing `branch-gate` entry for the current HEAD, reuse that evidence instead of rerunning the same command. Add any required `expensive-specialist` scopes when touched areas demand them. Running the branch gate includes running the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); a plan with `none declared` skips them, and the morning report renders that.

If required verification fails, keep the branch local and diagnose, repair, and rerun the failed scope while a safe, plan-consistent recovery path remains. Follow razorback:security-review for scanner or security-finding failures so its hard gates remain intact. Record each recovery attempt and refresh the verification ledger for the resulting HEAD. Do not classify the first failed run as blocker taxonomy #5.

Only after recovery paths are exhausted, classify the failure with the canonical blocker taxonomy. Repeated test failures with no further viable strategy are blocker taxonomy #5; environmental failures may instead be taxonomy #1. Do **not** create a PR. Instead:
- Render a partial morning report with `Status: Blocked`, the failure summary in the `Tests` section, and the blocker description in `Blockers hit`.
- Write it to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`.
- Emit terminal one-liner: `Blocked. Report: .memories/autonomous-run-YYYY-MM-DD-<slug>.md` and exit.

If required verification passes, continue.

### Step 2: Determine base branch and merge-base commit

`git merge-base` returns a commit SHA, not a branch name. Autonomous Mode needs both: the branch name for `gh pr create --base`, and the SHA for diff-range computation. Resolve them as two separate values:

```bash
# Prefer an explicit base from the plan/user, then the remote's default branch,
# then main/master. Merge-base-with-main alone is wrong for repos whose PRs
# target another branch (develop, release/*) — main almost always shares history.
if [ -n "$PLAN_BASE" ]; then
  BASE_BRANCH="$PLAN_BASE"
elif DEFAULT_REF=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null); then
  BASE_BRANCH="${DEFAULT_REF#refs/remotes/origin/}"
elif git show-ref --verify --quiet refs/heads/main; then
  BASE_BRANCH=main
elif git show-ref --verify --quiet refs/heads/master; then
  BASE_BRANCH=master
fi

if [ -z "$BASE_BRANCH" ] || ! BASE_SHA=$(git merge-base HEAD "$BASE_BRANCH" 2>/dev/null); then
  echo "Cannot determine PR base branch/merge-base." >&2
  # Blocker taxonomy #3 (plan-contradicting data): the branch doesn't descend
  # from a known base. Emit a Blocked report per the failure protocol below and
  # exit. Do NOT push.
fi
```

Use `$BASE_SHA` for any `base..HEAD` range computation (e.g. `git diff --stat $BASE_SHA..HEAD` in Step 3). Use `$BASE_BRANCH` for `gh pr create --base "$BASE_BRANCH"` in Step 6.

**If both lookups fail** (no `main`, no `master` ancestor), that's a blocker per taxonomy #3. Render a partial morning report with `Status: Blocked`, describe the missing base in `Blockers hit`, write it to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, emit the terminal one-liner, and exit. Do **not** push.

### Step 3: Render morning report

Fill the placeholders in `./morning-report-template.md` using the fields the caller accumulated during execution (plan name + path, branch name, phases complete/total, tasks complete/total, duration, judgment calls log, external review outcome, tests summary, blockers, files changed from `git diff --stat $BASE_SHA..HEAD`, next steps).

Produce three renderings:
- **Full report** — every section filled in, for `.memories/` and for review.
- **PR summary** — status, What shipped, External review, Blockers, Next steps only. The Judgment calls section is not inlined in the PR description; the PR body points at the `.memories/` file instead (committed in Step 4, so the link is live the moment the PR opens).
- **Report digest** — the full report's `.html` sibling (same basename), composed per the `razorback:using-razorback` skill's `references/digest-kit.md`. Rendering the digest is part of rendering the report, not a separate step.

### Step 4: Write full report + commit

Write the full rendered report to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md` and its digest to `.memories/autonomous-run-YYYY-MM-DD-<slug>.html`, where `<slug>` is a short kebab-case identifier for the plan (e.g. `autonomous-execution`). Committing them before the push means the PR includes the report from its first revision — no dead link in the PR body. The PR does not exist yet, so render `{{pr_url}}` as `pending — filled in after PR creation`; Step 7 writes the real URL back.

```bash
git add .memories/autonomous-run-YYYY-MM-DD-<slug>.md .memories/autonomous-run-YYYY-MM-DD-<slug>.html
git commit -m "docs: autonomous run report for <plan name>"
```

This commit (and the Step 7 URL write-back) are metadata-only: they touch nothing outside `.memories/`, so the Step 1 branch-gate evidence carries over to the new HEAD. If anything outside `.memories/` changes after Step 1, the evidence is invalidated — re-run the branch gate before pushing.

Every report mutation after this step updates the digest sibling's matching field and stages both files in the same commit — a committed digest that contradicts its markdown is worse than none.

### Step 5: Push branch

```bash
git push -u origin <branch>
```

If the push is rejected (branch already tracks a different remote, non-fast-forward, network failure), log the exact error in the report's `Blockers hit` section, set `Status: Blocked`, commit the updated report, emit the terminal pointer, and exit. Do not retry with `--force`.

### Step 6: Create PR

Work down the forge ladder. Stop at the first rung that succeeds; a rung that is unavailable or fails (not installed, auth, network, repo not on origin) drops to the next.

1. **`gh` (preferred — machine-readable URL for the Step 7 write-back):**

```bash
gh pr create \
  --base "$BASE_BRANCH" \
  --title "<plan name or feature name>" \
  --body "$(rendered_pr_summary)"
```

Capture the PR URL from `gh`'s output for Step 7.

2. **Another forge CLI, if present** — `glab mr create` (GitLab) or `tea pr create` (Gitea/Forgejo), with the equivalent base/title/body arguments. Capture the PR URL it prints for Step 7.

3. **The creation URL the forge printed on push** — many forges answer the Step 5 `git push` with a ready-made PR-creation URL. Record it in the report's `PR` field as `not created — open <creation-url>`, set `Status: Partial` (branch pushed; PR needs one click), commit and push the update (both siblings, per Step 4), and emit the URL in the terminal pointer.

4. **No rung worked** — update the report with the failure in `Blockers hit` and `Status: Partial` (the branch was pushed but the PR was not created), commit and push the update (both siblings, per Step 4), emit the terminal pointer, and exit.

### Step 7: Write the PR URL back into the report

Applies to ladder rungs 1–2, which return the created PR's URL; rungs 3–4 already wrote their outcome in Step 6. Replace the `pending — filled in after PR creation` value in the committed report with the captured URL, update the digest's `PR` field to match (per Step 4), then commit and push the update. This is a metadata-only commit; the branch-gate evidence still holds (see Step 4).

```bash
git add .memories/autonomous-run-YYYY-MM-DD-<slug>.md .memories/autonomous-run-YYYY-MM-DD-<slug>.html
git commit -m "docs: record PR URL in run report"
git push
```

### Step 8: Emit terminal pointer

One line, then exit:

```
Done. PR: <url>. Report: .memories/autonomous-run-YYYY-MM-DD-<slug>.md. Digest: .memories/autonomous-run-YYYY-MM-DD-<slug>.html
```

### Autonomous Mode rules

- **Never merge.** Stopping at PR creation is the point; merge is a separate human (or agent) action after PR review.
- **Never show a menu, never ask "which option".** Autonomous means no prompts.
- **Never fall back to Interactive Mode mid-run.** If a step fails (push rejected, every forge-ladder rung failed, remote mismatch), emit a partial report with `Status: Blocked` or `Status: Partial` as appropriate and let the user resolve from there.
- **Always write the report to `.memories/`**, even on blocked/partial outcomes — the report is the user's morning read regardless of outcome.

## Interactive Mode

Used when the user invokes this skill directly ("finish this branch"). Presents the classic 4-option menu.

### Step 1: Verify Branch Gate

**Before presenting options, verify the project-defined branch gate passes or reuse a passing ledger entry for current HEAD:**

```bash
# Run the command specified by the plan's branch-gate scope
<branch-gate command>
```

Running the branch gate includes running the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); a plan with `none declared` skips them.

**If verification fails:**
```
Branch verification failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until branch verification passes.
```

Stop. Don't proceed to Step 2.

**If verification passes:** Continue to Step 2.

### Step 2: Determine Base Branch

`git merge-base` returns a commit SHA, not a branch name. Downstream steps need the branch **name** (`git checkout <base-branch>`, `gh pr create --base`), so resolve both values the same way Autonomous Step 2 does:

```bash
# Capture now: Step 4 changes branch and directory before Step 5 needs these values.
FEATURE_BRANCH=$(git branch --show-current)
WORKTREE_PATH=$(git rev-parse --show-toplevel)

# Prefer an explicit base from the plan/user, then the remote's default branch,
# then main/master. Merge-base-with-main alone is wrong for repos whose PRs
# target another branch (develop, release/*) — main almost always shares history.
if [ -n "$PLAN_BASE" ]; then
  BASE_BRANCH="$PLAN_BASE"
elif DEFAULT_REF=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null); then
  BASE_BRANCH="${DEFAULT_REF#refs/remotes/origin/}"
elif git show-ref --verify --quiet refs/heads/main; then
  BASE_BRANCH=main
elif git show-ref --verify --quiet refs/heads/master; then
  BASE_BRANCH=master
fi

if [ -z "$BASE_BRANCH" ] || ! BASE_SHA=$(git merge-base HEAD "$BASE_BRANCH" 2>/dev/null); then
  echo "Cannot determine base branch/merge-base." >&2
  # Interactive Mode: nothing resolved, so ask the user instead of guessing.
  # Do NOT proceed to Step 3 until the base branch is confirmed.
fi
```

If nothing resolves, ask: "This branch split from main - is that correct?"

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

# Verify branch gate on merged result
<branch-gate command>

# If verification passes
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

If `gh` is unavailable or fails, walk the same forge ladder as Autonomous Step 6 (forge CLI → push-printed creation URL).

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

Use `$WORKTREE_PATH` and `$FEATURE_BRANCH` captured in Step 2 — Step 4 already checked out the base branch, so re-deriving them here names the wrong branch and the cleanup silently no-ops.

Check whether the captured path is a listed worktree:
```bash
git worktree list | grep "$WORKTREE_PATH"
```

If it is listed **and** the path lies under `.claude/worktrees/`:
```bash
git worktree remove "$WORKTREE_PATH"
```

Then report: "Removed worktree $WORKTREE_PATH for branch $FEATURE_BRANCH."

Provenance rule: a worktree anywhere else belongs to the host or the user. Leave it in place and report its path instead.

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
- Fall back to Interactive Mode mid-autonomous-run — if autonomous mode can't complete (e.g. every forge-ladder rung fails), emit a partial report with status `Blocked` and let the user resolve; don't prompt for an option

**Always:**
- Verify tests before offering options (Interactive) or before pushing (Autonomous)
- In Interactive Mode, present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
- In Autonomous Mode, emit the morning report to all three destinations (PR summary, `.memories/` file, terminal one-liner) regardless of outcome

## Integration

**Called by:**
- `razorback:executing-plans` (Step 5) — Autonomous mode when the execution skill finishes cleanly
- `razorback:subagent-driven-development` (Step 5 or 4a+finish) — Autonomous mode
- Direct user invocation ("finish this branch") — Interactive mode

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill (Interactive Mode, Options 1 & 4)
- **morning-report-template.md** (this directory) — template rendered by Autonomous Mode Step 3
