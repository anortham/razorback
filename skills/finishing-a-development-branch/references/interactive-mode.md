# Interactive Mode

Used when the user invokes the skill directly ("finish this branch").

## Step 1: Verify branch gate

Run the plan's `branch-gate` scope, or cite a passing ledger entry for current HEAD. Running the branch gate includes running the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); `none declared` skips them.

If it fails, show the failures and stop:

```
Branch verification failing (<N> failures). Must fix before completing:
[failures]
Cannot proceed with merge/PR until branch verification passes.
```

## Step 2: Determine base branch

Resolve `$BASE_BRANCH` and `$BASE_SHA` with the Autonomous Step 2 lookup chain. Two differences:

1. Capture what Step 5 needs before Step 4 changes branch and directory:
   ```bash
   FEATURE_BRANCH=$(git branch --show-current)
   WORKTREE_PATH=$(git rev-parse --show-toplevel)
   ```
2. Resolution failure is not a blocker. Ask: "This branch split from main - is that correct?" Do not continue until the base is confirmed.

## Step 3: Present options

Present exactly these 4 options, no explanation:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

## Step 4: Execute choice

| Option | Commands | Then |
|--------|----------|------|
| 1. Merge locally | `git checkout <base>` → `git pull` → `git merge <feature>` → if the merge fast-forwarded to the HEAD Step 1 verified, cite that ledger entry; otherwise `<branch-gate command>` once → if green, `git branch -d <feature>` | Step 5 |
| 2. Push + PR | `git push -u origin <feature>` → `gh pr create --title "<title>" --body "<Summary bullets + Test Plan checklist>"`; if `gh` fails, walk the Autonomous Step 6 forge ladder | Keep worktree |
| 3. Keep as-is | Report: "Keeping branch <name>. Worktree preserved at <path>." | Keep worktree |
| 4. Discard | Show branch, commit list, and worktree path. Require the user to type `discard`. Then `git checkout <base>` → `git branch -D <feature>` | Step 5 |

## Step 5: Cleanup worktree (Options 1 and 4)

Use `$WORKTREE_PATH` and `$FEATURE_BRANCH` from Step 2. Re-deriving them after the checkout names the wrong branch and the cleanup silently no-ops.

```bash
git worktree list | grep "$WORKTREE_PATH"
```

If listed **and** the provenance rule in SKILL.md says it is yours:

```bash
git worktree remove "$WORKTREE_PATH"
```

**If removal is refused** (`contains modified or untracked files`): the
worktree holds files that exist nowhere else — uncommitted plans, notes,
or scratch work. Never `--force` on your own initiative. Show the user
what is at stake:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

Ask:
1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Carry out the choice, then remove the worktree.

Report: "Removed worktree $WORKTREE_PATH for branch $FEATURE_BRANCH."

## Step 6: Reconcile remaining source-control state

Run Check B of the `razorback:using-razorback` skill's `references/source-control-hygiene.md`. Report one line per outstanding item (dirty worktree, branch with commits absent from the base and from any PR opened here). Land it or name it; never report "done" with state unaccounted for.

## Quick reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | Yes | - | - | Yes |
| 2. Create PR | - | Yes | Yes | - |
| 3. Keep as-is | - | - | Yes | - |
| 4. Discard | - | - | - | Yes (force) |

## Common mistakes

| Mistake | Fix |
|---------|-----|
| "What should I do next?" | Present exactly the 4 options |
| Removing the worktree on Option 2 or 3 | Cleanup only for Options 1 and 4 |
| Discard without confirmation | Require the typed `discard` |
