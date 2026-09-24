---
name: finishing-a-development-branch
description: Use when implementation is complete, branch verification passes, and you need to decide how to integrate the work
---

# Finishing a Development Branch

Two flows behind one gate: the branch gate must pass before any push, merge, or menu. Autonomous Mode ends at PR creation; merge is never automatic.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

**Not here:** `razorback:pre-merge-review` already ran. Quick-fix work (`razorback:fixing-small-issues`) never reaches this skill.

## Mode selection

- Invoked as the final step of `razorback:executing-plans` or `razorback:subagent-driven-development` → **Autonomous Mode**.
- Invoked directly by the user ("finish this branch") → **Interactive Mode**. Read `references/interactive-mode.md` when the user invoked this skill directly.
- Ambiguous → Autonomous.

## Autonomous Mode

No options menu. With recorded authority: commit, push, open a PR with the morning-report summary, write the full report to `.memories/`, emit a one-line terminal pointer, exit.

### Step 0: Resolve publication authority

Read the handoff's authority ledger and preserve its cited sources: `local_commit_authority` (authorized by implementation scope unless explicitly prohibited), `push_authority`, `pr_authority`. Implementation approval grants local commits, not push or PR. Record missing push/PR entries without prompting here; Step 4a owns the single request after Steps 1–4 prepare the materials. If commits are explicitly prohibited, use the approval/blocker boundary once the local diff and review materials are ready.

### Step 1: Verify branch gate

Run the plan's `branch-gate` scope, or reuse a passing verification-ledger entry for current HEAD. Add required `expensive-specialist` scopes. Running the branch gate includes running the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); `none declared` skips them and the report says so.

On failure: keep the branch local; diagnose, repair, and rerun the failed scope while a safe, plan-consistent recovery path remains. Capture the failing run to a file once; repair against the failing test ids through the runner's own filter (razorback:systematic-debugging Phase 4); rerun the failed scope once when every id passes, not after each repair. Follow razorback:security-review for scanner or security-finding failures. Record each attempt and refresh the ledger for the resulting HEAD. Do not classify the first failed run as blocker taxonomy #5.

Only after recovery paths are exhausted, classify with the blocker taxonomy (#5 for unfixable test failures, #1 for environmental). No PR. Render a partial report with `Status: Blocked` (failure in `Tests`, blocker in `Blockers hit`), write it to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, emit `Blocked. Report: <path>`, exit.

### Step 2: Determine base branch and merge-base commit

Resolve two values: `$BASE_BRANCH` for `gh pr create --base`, `$BASE_SHA` for diff ranges.

```bash
if [ -n "$PLAN_BASE" ]; then BASE_BRANCH="$PLAN_BASE"
elif DEFAULT_REF=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null); then BASE_BRANCH="${DEFAULT_REF#refs/remotes/origin/}"
elif git show-ref --verify --quiet refs/heads/main; then BASE_BRANCH=main
elif git show-ref --verify --quiet refs/heads/master; then BASE_BRANCH=master
fi
BASE_SHA=$(git merge-base HEAD "$BASE_BRANCH")
```

Merge-base with `main` alone is wrong for repos whose PRs target `develop` or `release/*`. If either value cannot be resolved: blocker taxonomy #3. Render `Status: Blocked` per Step 1, do not push.

### Step 2a: Reconcile source-control state

Run Check B of the `razorback:using-razorback` skill's `references/source-control-hygiene.md`. Last chance to notice finished-but-unintegrated work.

```bash
git status --short --branch
git worktree list
git -C <path> status --short --branch        # per listed worktree
git log --oneline "$BASE_BRANCH".."<branch>"
```

Classify every worktree and branch:

| Class | Meaning | Action |
|-------|---------|--------|
| Landed | Commits are ancestors of this branch or merged into base | None |
| Riding along | Commits are on the branch about to be pushed | None |
| Stranded | Commits absent from base and this branch, or uncommitted changes in a worktree this run created | Land it or name it; after the last landing, rerun Step 1 once — the diff changed |
| The user's | Worktree outside razorback-managed locations, or a branch this run did not create | Report the path; change nothing |

Stranded work deliberately left is a `Next steps` item, not a blocker; the run still reports `Complete`. Stranded work you can neither land nor explain is a judgment call to log, not a reason to withhold the report. Autonomous Mode never removes worktrees.

### Step 3: Render morning report

Fill `./morning-report-template.md` from the fields accumulated during execution (plan name and path, branch, phases and tasks complete/total, duration, publication authority with sources, judgment calls, external review outcome, tests, blockers, `git diff --stat $BASE_SHA..HEAD`, Step 2a source-control state, next steps).

Render `Status: Awaiting publication approval` when `push_authority` or `pr_authority` is missing. The report carries this status before its commit; Step 4a asks using the prepared report and does not dirty committed metadata to mark the wait.

Three renderings:
- **Full report** — every section, for `.memories/`.
- **PR summary** — status, What shipped, External review, Blockers, Next steps. Judgment calls are not inlined; the PR body links the `.memories/` file (committed in Step 4, so the link is live when the PR opens).
- **Report digest (opt-in)** — the full report's `.html` sibling (same basename) per the `razorback:using-razorback` skill's `references/digest-kit.md`. Write it only when the user asked for a digest in this session or in project instructions. When no digest was requested, skip every digest step below.

### Step 4: Write full report + commit

Write `.memories/autonomous-run-YYYY-MM-DD-<slug>.md` (plus the `.html` sibling when requested); `<slug>` is a short kebab-case plan identifier. Render `{{pr_url}}` as `pending — filled in after PR creation`; Step 7 writes the real URL.

The report is the run's handoff record, so this commit needs no separate checkpoint. When a checkpoint is warranted (a blocker, a surprising failure), write it before the commit and stage its artifact with the report files. Never make a checkpoint-only follow-up commit.

```bash
git add .memories/autonomous-run-YYYY-MM-DD-<slug>.md   # plus the .html sibling when requested, and a warranted checkpoint
git commit -m "docs: autonomous run report for <plan name>"
```

This commit and the Step 7 write-back are metadata-only (`.memories/` only), so Step 1 evidence carries over. Any change outside `.memories/` after Step 1 invalidates the evidence: rerun the branch gate before pushing. When a digest exists, every later report mutation updates the digest's matching field and stages both files in the same commit.

### Step 4a: Request missing publication authority once

After Steps 1–4 have produced local verification, source-control reconciliation, and the committed prepared report, ask using the prepared report once for all missing push and PR actions. This is an approval boundary, not a blocker. Emit a local terminal pointer and stop until the user answers.

On resumption: preserve every previously authorized entry and its source; update only what the answer grants; never repeat granted questions. Persist report status and authority metadata updates: stage the report (and digest), commit, then run the source-control state check before push. If anything outside `.memories/` changed, rerun the affected branch gate. If authority remains missing, keep `Status: Awaiting publication approval`; do not call the work blocked or failed.

### Step 5: Push branch

```bash
git push -u origin <branch>
```

Capture exact output and exit status. On failure, inspect the exact failure and remote branch state before deciding whether to retry:

- Refresh the remote ref and compare with local HEAD; a push that already landed is success.
- Transient network failures only: at most two retries with bounded backoff and a fresh remote-state check before each.
- Auth or permission failures: do not retry unchanged.
- Non-fast-forward: fetch and inspect both histories; reconcile only via an authorized, plan-consistent fast-forward or ordinary merge/rebase into the feature branch. Any reconciliation that changes HEAD invalidates prior evidence: rerun Step 1's affected gate, Step 2a, and the authority check before retrying.
- History rewriting returns to the approval boundary. Never force push.

Declare a blocker only after these paths are exhausted: record the blocker and diagnostics in the report, add a checkpoint before committing if Goldfish is available, set `Status: Blocked`, emit the terminal pointer, exit.

### Step 6: Create PR

Walk the forge ladder; stop at the first rung that succeeds.

1. `gh pr create --base "$BASE_BRANCH" --title "<plan or feature name>" --body "$(rendered_pr_summary)"` — capture the URL for Step 7.
2. Another forge CLI (`glab mr create`, `tea pr create`) with equivalent arguments — capture the URL.
3. The creation URL the forge printed on push — record `PR: not created — open <creation-url>`, `Status: Partial`, commit and push the update (both siblings), emit the URL in the pointer.
4. No rung worked — record the failure in `Blockers hit`, `Status: Partial`, commit and push the update, emit the pointer, exit.

### Step 7: Write the PR URL back into the report

Rungs 1–2 only. Replace `pending — filled in after PR creation` with the URL, update the digest's `PR` field when present, commit, push. Metadata-only; gate evidence holds.

Without Goldfish, the run report carries the handoff. Write the run's final post-PR checkpoint here when Goldfish is available: the PR is the handoff. Write it after the PR exists and before the PR-URL metadata commit, and explicitly stage that checkpoint artifact with the URL report and digest in the same commit. This satisfies the SDD milestone; do not emit a duplicate checkpoint after this skill returns.

```bash
git add .memories/autonomous-run-YYYY-MM-DD-<slug>.md   # plus the .html sibling when requested, and a checkpoint when one exists
git commit -m "docs: record PR URL in run report"
git push
```

### Step 8: Emit terminal pointer

```
Done. PR: <url>. Report: .memories/autonomous-run-YYYY-MM-DD-<slug>.md.
```

Append ` Digest: .memories/autonomous-run-YYYY-MM-DD-<slug>.html` when a digest was requested.

### Autonomous Mode rules

- **Never merge the PR or target branch.** Integrating reviewed remote changes into the feature branch under Step 5 is not a merge of the PR.
- **Never show an options menu.** The only routine prompt is Step 4a's single request after local work and review materials are ready. Genuine credential, safety, or history blockers use the smallest question the blocker taxonomy allows.
- **Never fall back to Interactive Mode mid-run.** On a failed step, emit `Status: Blocked` or `Status: Partial` and exit.
- **Always write the report to `.memories/`**, on every outcome.
- **Never report `Complete` with unaccounted source-control state.** Step 2a lands stranded work or names it in `Source control`.
- **Never remove a worktree in Autonomous Mode.** The PR is open; disposition is the user's call.

## Provenance rule (worktree removal, Interactive Mode)

Canonical definition: the `razorback:using-razorback` skill's `references/source-control-hygiene.md`. A worktree is yours to remove when this run created it, or when its path lies under a razorback-managed location — `.worktrees/`, `worktrees/`, or `~/.config/razorback/worktrees/<project>/` — the locations `razorback:using-git-worktrees` Step 1 creates. Any other worktree belongs to the host or the user: leave it and report its path.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests passed earlier, the gate is a formality" | The gate needs evidence for the current HEAD. Stale evidence is no evidence. |
| "Fixed one failure, rerun the whole gate to see the rest" | The captured first run lists every failure. Fix them against their ids; rerun the gate once. |
| "The PR is open, the run may as well merge it" | Stopping at PR creation is the design. Merge is a separate human (or agent) action after review. |
| "The push failed — I'll just show the menu" | Mid-run fallback breaks the autonomous contract. Report `Blocked` and exit. |
| "The other worktree isn't this run's problem" | Unaccounted state makes the report a lie. Land it or name it. |
| "Removing the worktree now saves the user a step" | The branch is live behind an open PR. Disposition is the user's call. |
| "Removal refused — `--force` is just finishing the cleanup" | The refusal means files exist only in that worktree. `--force` destroys them permanently. Show the user and ask. |

## Red Flags

**Never:**
- Claim the work is finished without running Check B (the `razorback:using-razorback` skill's `references/source-control-hygiene.md`), or with stranded commits unnamed in the report
- Remove a worktree outside a razorback-managed location
- Merge, push, or offer options with the branch gate failing or unverified
- Delete work without typed confirmation
- Force-push without explicit request
- Break an Autonomous Mode rule — that list is the contract, not advice

**Always:**
- Reconcile source-control state (Check B) before reporting the work finished
- In Interactive Mode, present exactly 4 options and clean up the worktree for Options 1 & 4 only
- In Autonomous Mode, emit the morning report to all three destinations (PR summary, `.memories/` file, terminal one-liner) regardless of outcome

## Integration

- **Called by:** `razorback:executing-plans`, `razorback:subagent-driven-development` (Autonomous); direct user invocation (Interactive).
- **Pairs with:** `razorback:using-git-worktrees` (worktree cleanup, Interactive Options 1 & 4); `morning-report-template.md` (rendered by Step 3).
