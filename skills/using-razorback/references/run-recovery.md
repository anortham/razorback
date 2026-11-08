# Run recovery

Shared by `razorback:executing-plans` and `razorback:subagent-driven-development`. It runs **only on a resumed run**: a post-compaction note, a mismatch between expected and actual conversation state, or the user says "resume". On a fresh or in-flight run, skip it and keep going.

On a resumed run, orient before continuing:

1. If Goldfish is available, call `goldfish:recall` with `workspace` set to the absolute current project/worktree root to retrieve the active brief and recent checkpoints. Without it, use the run report, plan file, TaskList, and git state below.
   Read the report linked by the checkpoint before choosing the next task. Verify the current branch, worktree, commit (HEAD), tested source commit, verification evidence, and publication authority against live state and the authority's recorded source. A checkpoint records prior user-granted authority; it does not grant publication authority. If authority cannot be verified from its cited source, treat it as missing; implementation approval alone never grants push or PR authority. Without Goldfish, recover from the report and git state.
2. Restore any immutable REVIEW CAMPAIGN setup and current counters from the checkpoint. Counters only increase; participants and budgets never change after resume.
3. If recalled `REVIEW CAMPAIGN STATUS` contains `campaign_closed: yes`, treat it as terminal and do not dispatch another reviewer, even when the state is `capped` or `blocked`.
4. Read the plan file, noting which acceptance-criteria checkboxes are already `[x]`.
5. Check the TaskList for completed / in-progress / pending tasks.
6. `git log --oneline <base>..HEAD` — verify what is actually committed.
7. Identify the next incomplete task and resume execution.

Name the next action explicitly, even if it is to keep waiting for publication authority, before continuing.

## Delegated runs (subagent-driven-development only)

Between steps 6 and 7, reconcile `parallel-lead-commit` gaps: re-read this plan's ledger and run Step 1's completion-line check. A missing, `pending`, or unverifiable SHA means inspect the owned files, then commit approved edits per the Commit Mode Contract or re-dispatch. Do not trust a completion record that has no verifiable commit.

Subagent IDs from the prior session cannot be resumed post-compaction: treat any needed fix as a fresh dispatch with prior-commit context.
