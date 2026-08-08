# Source Control Hygiene

Reference for keeping branch and worktree state honest during long autonomous runs. Two checks, run at two fixed moments. Neither check prescribes a branching policy — razorback does not care how you slice the work. Both checks exist so the agent always **knows and states** the source-control state instead of assuming it.

The failure this reference prevents: work that is finished but not integrated. A worktree created for phase 1, left with unmerged commits, while phase 2 creates a second worktree beside it. A run that reports "plan complete" while commits sit on a branch nobody pushed.

## Check A — Inventory before you create

Run before creating any worktree or branch. Read-only.

```bash
git worktree list
git -C <each listed path> status --short --branch
git branch --no-merged <base-branch>
```

For every worktree other than the one you are standing in, and every branch the inventory names, classify it:

| State | Meaning | Default action |
|-------|---------|----------------|
| Fully merged, clean | Its work landed | Reuse or remove; either is fine — say which |
| Unmerged commits | Work is finished-but-stranded | **Report it before creating anything new** |
| Dirty working tree | Work is in flight | **Report it before creating anything new** |
| Belongs to the user or another task | Not yours | Leave it alone; report the path |

`git log --oneline <base>..<branch>` distinguishes merged from unmerged. An empty result means merged.

**The rule is disclosure, not prohibition.** Finding stranded work does not forbid a new worktree — phases legitimately stack, and the user may want them separate. It forbids creating one *silently*. State what you found, state whether the new worktree is a sibling or a continuation, and proceed.

**Prefer continuation over accumulation.** When the new work builds on an unmerged branch, branching from that branch (or reusing its worktree) beats a fresh worktree cut from the base — a sibling cut from the base cannot see the earlier phase's code and will conflict later.

## Check B — Reconcile before you claim done

Run before any of: claiming a plan complete, invoking `razorback:finishing-a-development-branch`, committing a release, pushing, tagging, or writing a final report.

```bash
git status --short --branch          # current tree clean? branch ahead of remote?
git worktree list                    # what else exists
git -C <each listed path> status --short --branch
git log --oneline <base>..<branch>   # per branch: what has not landed
```

A run is done only when every item below is either landed, deliberately left with a stated reason, or explicitly the user's own work:

- Every commit this run produced is on a pushed branch or in an open PR.
- No worktree this run created still holds uncommitted changes.
- No worktree this run created still holds commits absent from the PR branch.
- Every worktree left in place is named in the report with why it is still there.

**Stranded work is not a blocker — it is a reporting obligation.** Land it, or name it. What is forbidden is a completion claim that does not account for it.

## Provenance

A worktree is **yours** if this run created it, or if it sits under a razorback-managed location: `.worktrees/`, `worktrees/`, or `~/.config/razorback/worktrees/<project>/`. Those you may remove once their work has landed.

Any other worktree belongs to the host or the user. Never remove it. Report its path and state instead.

## Anti-rationalization

| Thought | Reality |
|---------|---------|
| "The other worktree isn't part of this task" | Then say so in the report. Silence is the bug. |
| "I'll merge it at the end" | Check B is the end. Do it now or name it. |
| "The PR covers everything" | Verify: `git log --oneline <base>..<branch>` per worktree. |
| "Phase 1 passed its tests, so it's done" | Passing tests is not integration. Landed is integration. |
| "A fresh worktree is cleaner" | Cut from the base it cannot see phase 1's code. Continue instead. |
| "`git worktree list` showed it, so I checked" | The list is an inventory, not a cleanliness check. Status each path. |
