# Task A report: execution consistency

## Result

Implemented the approved workflow contracts in `/home/murphy/.config/razorback/worktrees/razorback/workflow-consistency` without staging or committing.

## Changed files

- `skills/brainstorming/SKILL.md`
- `skills/executing-plans/SKILL.md`
- `skills/finishing-a-development-branch/SKILL.md`
- `skills/finishing-a-development-branch/morning-report-template.md`
- `skills/requesting-code-review/SKILL.md` (lead-requested integration correction)
- `skills/subagent-driven-development/SKILL.md`
- `skills/subagent-driven-development/implementer-prompt.md`
- `skills/subagent-driven-development/fix-prompt.md`
- `skills/writing-plans/SKILL.md`
- `tests/autonomous-process-gates.test.mjs`
- `tests/codex-parallelism-contract.test.mjs`
- `tests/twin-sections.test.mjs`
- `tests/workflow-execution-contracts.test.mjs` (new)

## Contracts implemented

- Planning records normal local commit authority from the implementation scope plus separate `push_authority` and `pr_authority` values with their user/repository sources. Implementation approval starts local work but does not imply publication.
- Autonomous finish captures authority early, completes local verification, source-control reconciliation, and report preparation first, renders `Awaiting publication approval` before committing that report, then asks once for missing push/PR actions at Step 4a. Awaiting authority is not a blocker or failed implementation.
- Resumption persists changed authority/status metadata with a checkpoint and explicit report staging before push, then state-checks. Push reconciliation that changes HEAD invalidates affected verification and source-control evidence.
- Push recovery inspects exact errors and remote state, detects already-landed pushes, bounds transient retries to two after the initial attempt, diagnoses auth/non-fast-forward cases separately, and forbids force push. The PR/target branch is never merged automatically; an authorized ordinary reconciliation into the feature branch remains possible.
- Goldfish checkpoints now precede every actual commit and their artifacts are explicitly staged. Serial workers checkpoint their own commits; parallel workers do not checkpoint or commit their batch, and the lead checkpoints before its reviewed commit. SHA-bearing durable-progress lines remain post-commit. Checkpoint-only follow-up commits are forbidden to prevent recursion.
- The final post-PR milestone is the pre-commit checkpoint inside finishing Step 7. Its artifact ships with the PR-URL report metadata commit; SDD does not emit a duplicate checkpoint after finishing returns.
- Delegation availability is the canonical routing decision: SDD handles one or more tasks whenever delegation is available and permitted, serializing dependent tasks; executing-plans handles unavailable delegation or explicit single-agent selection.
- Requesting-code-review now distinguishes native Mode 2 review, restricted planned pre-merge reviewers, and standalone provider CLI second opinions. Standalone reviews retain their provider workflow, redaction, and policy gate instead of being forced through plan/clean-HEAD preconditions.

## RED/GREEN evidence

- RED: `node --test tests/workflow-execution-contracts.test.mjs`
  - exit 1; 0 passed, 4 failed.
  - Failures covered authority separation, push recovery, Goldfish pre-commit checkpoints, and delegation-based routing.
- Correction RED: the same focused guard failed 2 of 5 after adding the report-status/commit-order and simplified local-commit assertions; failures were the stale pending-commit model and Step 4a status mutation.
- Final checkpoint-sequencing RED: `node --test tests/workflow-execution-contracts.test.mjs tests/twin-sections.test.mjs` exited 1 with 12 passed and 2 failed because the old post-return checkpoint remained and Step 7 did not yet include its artifact.
- GREEN affected scope: `node --test tests/workflow-execution-contracts.test.mjs tests/autonomous-process-gates.test.mjs tests/codex-parallelism-contract.test.mjs tests/twin-sections.test.mjs tests/digest-wiring.test.mjs tests/source-control-hygiene.test.mjs tests/review-campaign-integration.test.mjs tests/borrowed-superpowers.test.mjs tests/architecture-quality-review.test.mjs tests/workflow-tool-contracts.test.mjs && git diff --check`
  - exit 0; 78 passed, 0 failed; diff whitespace check passed.
- Final sequencing scope: `node --test tests/workflow-execution-contracts.test.mjs tests/twin-sections.test.mjs tests/codex-parallelism-contract.test.mjs tests/autonomous-process-gates.test.mjs && git diff --check`
  - exit 0; 36 passed, 0 failed; diff whitespace check passed.

## Miller evidence

- `workspace(list, filter="workflow-consistency")` confirmed workspace `workflow-consistency-d2bb477b5209` at the assigned path.
- `context(...)` oriented on execution consistency and test entry points.
- `search(mode=source/content)` located existing guards and exact routing, commit-mode, finish, and report text.
- `inspect(depth=full)` established the caller-facing instruction sections before edits: Writing Plans `Execution Handoff`; SDD `When to Use`, `Commit Mode Contract`, and `Checkpoints`; Executing Plans `Overview` and `Checkpoints`; Brainstorming `Lightweight Implementation`; finish mode and Steps 3–7; report template; and focused test bodies.
- `edit(replace_text)` previewed and then applied the exact Writing Plans handoff-field change after proving one match.
- `impact(git=true, view=tests)` completed after edits and named the focused autonomous, parallelism, and twin-section guards among likely tests. Its first attempt hit the shared Miller database lock; the supported workspace refresh restored current indexed evidence before the successful call.

## Interface and shape evidence

- The authority ledger records `local_commit_authority` as authorized by implementation scope, plus independently sourced `push_authority` and `pr_authority` states.
- The discarded `pending_commit_paths` execution state is absent; an explicit user/host commit prohibition uses the existing approval/blocker boundary. Broad staging remains forbidden.
- Report status adds `Awaiting publication approval`, and the report renders each publication authority.
- Existing commit modes remain `serial-worker-commit` and `parallel-lead-commit`; no third mode was introduced.
- Existing execution test conventions use Node's built-in test runner and source-contract assertions; the new guard follows that interface.

## Self-review

- Spec: all five assigned contracts are represented; historical plans and worker B's bootstrap/tool/reviewer files were not edited by this task.
- Quality: the finish sequence now names evidence invalidation and resume behavior instead of treating approval as a vague precondition. Checkpoint cadence separates mandatory per-commit memory from additional phase/review recovery points. Existing twin-section guards were updated to preserve shared invariants rather than weakened.
- Risk: the authority ledger is instructional state rather than a machine-enforced schema. Agents must preserve its cited source across turns; the focused guards protect the vocabulary and ordering but do not execute a real forge push.

## Worktree state

- Path: `/home/murphy/.config/razorback/worktrees/razorback/workflow-consistency`
- Branch: `codex/workflow-consistency`
- Base/current commit: `464d4d317c206335e0b67ffdbc4f45a8e962b5e8`
- Commit mode: `parallel-lead-commit`; no staging or commit performed.
- Dirty state includes this task's files plus concurrent lead/worker changes in the shared task worktree. See `git status --short --branch`; no unrelated changes were reverted.
