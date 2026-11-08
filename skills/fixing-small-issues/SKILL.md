---
name: fixing-small-issues
description: Fixes a small, local defect on the current checkout after an objective size check, and verifies only the affected scope, with no worktree and no baseline suite. Runs a list of such items as one batch on one branch with one branch gate and one PR. Use when a reported defect or requested tweak looks small and local (a button not disabled, a double-submit, an off-by-one, a wrong label, CSS/styling adjustments, copy changes, config value fixes), before invoking brainstorming, systematic-debugging, or test-driven-development, creating a worktree, or running any test suite.
---

# Fixing Small Issues

Triage-first path for small, local, reversible changes: locate, measure against objective criteria, fix in place, verify the affected scope. No worktree, no baseline suite run, no design doc, no implementer dispatch. A list of such items is one batch (see Batch mode): one branch, one branch gate, one PR.

**Announce at start:** "I'm using the fixing-small-issues skill to triage this."

## The Iron Law

```
NO INFRASTRUCTURE BEFORE INVESTIGATION
```

No worktree, no project setup, no baseline or full-suite run until the change target is located and the tier is chosen. Running a 6-minute suite before opening the implicated file is the failure this skill exists to prevent.

**Not for:** new features or components; public APIs, schemas, dependencies, or security behavior; anything investigation shows is bigger than the criteria. When in doubt, run Step 1 — the criteria decide.

## Step 1: Investigate (no infrastructure)

- Locate the target: a search for the symptom or error text, a file read, or code-kb (`lookup_symbol`, which shows the body of one short definition, and `get_symbol_context` if it might be shared, which carries its callers).
- Defects: razorback:systematic-debugging Phase 1 — reproduce, find root cause.
- Tweaks: confirm the exact target (selector, constant, string) in current source.

## Step 2: Triage (measure, don't vibe)

The quick-fix tier applies only when ALL criteria hold. Project instructions may tune the numbers; the criteria are not optional.

| Criterion | Threshold |
|-----------|-----------|
| Target located | Confirmed with evidence from current source, not guessed |
| Files | ≤ 2 source files (tests excluded) |
| Lines | ~20 changed lines (tests excluded) |
| Contracts | No public API, schema, persisted-data, config-contract, security-behavior, or dependency changes |
| Structure | No new modules or components (a new test file is fine) |
| Reversibility | A single `git revert` cleanly undoes it |

**Any criterion fails or cannot be measured → exit this skill.** Name the failed criterion and route to razorback:brainstorming triage, which picks the process from uncertainty and consequence. An unknown is a failure, not a pass.

**All pass →** announce: "Quick-fix tier: <summary> (N files, ~M lines)." No user consent is needed to proceed — the tier is pre-authorized policy, and using-git-worktrees is never invoked on this tier.

## Step 3: Fix in place

- Work on the current checkout. Protected branch → plain feature branch, never a worktree.
- TDD applies when suitable automation can test the behavior: add a failing regression test first, then the minimal fix (razorback:test-driven-development). A missing test is not an exception. Only when there is no suitable automated test surface because automation is unsuitable for the behavior, not merely absent from the current test suite, may you use a manual check; record why automation is unsuitable and a concrete observable before-and-after result. Stricter project instructions can prohibit this exception, and it does not waive tests for other behavior in the same change.
- One fix at a time. No while-I'm-here improvements.
- If the fix cuts a real corner with a known ceiling, mark it: `# razorback: <ceiling>, <upgrade trigger>` (`//` in C-family languages), e.g. `# razorback: global lock, per-account locks if throughput matters`. razorback:harvesting-debt collects markers into a ledger later; an unmarked shortcut rots.

## Step 4: Verify the affected scope only

- Identify affected callers and tests with native search and file reads, or code-kb (the tests to run in `get_symbol_context`, and `blast_radius` for the full list) when useful. Its predictions can be incomplete; verify coverage against current source and reconfirm the symptom is gone. A failing test iterates on its own id until it passes; the impacted set runs once after (razorback:systematic-debugging Phase 4). razorback:verification-before-completion applies in full.
- The full suite is NOT part of this tier; the full suite runs at the branch gate (CI or pre-merge).
- Commit with a clear message. The PR belongs to the branch, not to the item: with more items queued, go to the next item (Batch mode). When the branch is done, run the branch gate once and open one PR with a plain body (items done, items left out and why, gate result).
- In the closing summary, list any `# razorback:` markers left (`<file>:<line>` + ceiling), or say "no markers left."

## Batch mode: a list of small items

A list of small, independent items (a backlog, a review's nits, a to-do list) is one batch: not N separate quick fixes with N PRs, and not a plan. Announce: "Batch mode: <N> items on branch <name>."

- One branch for the whole batch. Protected branch → one plain feature branch, never one branch per item.
- Triage each item against the Step 2 criteria when you reach it. Fix it (Step 3), verify its affected scope (Step 4), commit it, move on. A harness task list tracks the items.
- Measure the criteria and the escalation triggers per item, never against the sum of the branch. Eleven two-file fixes are eleven quick fixes, not a 22-file change.
- An item that fails a criterion or fires a trigger leaves the batch: note it, finish the other items, then route the leftover through razorback:brainstorming triage. One hard item never promotes the whole list to a plan.
- The full suite and any slow suite run once, after the last item, as the branch gate. Then one PR for the batch. Never a gate or a PR per item.
- No plan file, no worker, no ledger, no task report, no morning report. A plan file needs a handoff, a multi-session effort, or a coordination need (razorback:writing-plans), never an item count.
- Independent items may run in parallel subagents with disjoint files (razorback:dispatching-parallel-agents). The lead reviews each diff, then one gate and one PR.

## Escalation triggers

Checked continuously while fixing:

- The change needs a **3rd source file** or **~2× the line budget**
- The root cause lands in **shared or public code** (API, schema, shared state, security boundary) — check callers and impact with native search or code-kb
- A **second fix attempt fails**
- The fix needs a **dependency change or a new module**

On any trigger: STOP, commit WIP, promote to razorback:brainstorming or razorback:writing-plans with the evidence. Escalation is a tier change, not a failure.

## Rationalization Table — Both Directions

Downscaling abuse and ceremony reflex are both violations.

| Excuse | Reality |
|--------|---------|
| "It's basically small" (no measurement) | Measure files and lines against the criteria. Unknown = not quick-fix. |
| "Skip the regression test, it's tiny" | Tiny fixes regress too. Test surface exists → failing test first. |
| "One more file won't hurt" | The third file is an escalation trigger. Stop and promote. |
| "Better safe than sorry — run the full suite first" | Suite-before-looking is the incident this skill was built from. Affected scope only. |
| "The rules say always use a worktree" | Not on this tier. Worktrees are for plan execution and feature work. |
| "I should ask the user to opt out of the ceremony" | The tier is pre-authorized policy. Asking re-imports the interruption the tier removes. |
| "Brainstorming says modifying behavior MUST brainstorm" | Repairing or tuning agreed behavior is not designing new behavior. Brainstorming governs design work. |
| "I'm almost done, no need to escalate" | Triggers are objective. Almost-done past a trigger is how 20-line fixes become 200-line messes. |
| "A narrow workaround keeps it in budget" | The tier is measured by where the root cause lives, not by how small you can make the diff. A symptom patch that dodges a shared-code root cause is an escalation, not a fix. |
| "Eleven items, so eleven PRs" | The PR belongs to the branch. One branch, one gate, one PR. A gate per item is the all-day run Batch mode exists to prevent. |
| "Eleven items is too big for this tier, so write a plan" | The criteria measure one item. A list of small items is a batch, not a plan. |

## Red Flags — STOP

- Creating a worktree for a change you haven't located yet
- Running any test suite before opening the implicated code
- Writing a design doc for a measured quick-fix change
- Dispatching an implementer subagent for a ≤ 20-line fix
- Proceeding while a criterion is unmeasured
- Continuing past an escalation trigger
- Opening a PR, or running the full suite, after each item of a batch
- Writing a plan file for a list of items that each pass the criteria

## It's working if

- The tier was announced with its measurements before any fix landed.
- The affected scope ran and the symptom is gone; the full suite never ran in the inner loop.
- Every deliberate corner carries a `# razorback:` marker, and the closing summary lists them or says none.
- Escalation triggers were honored the moment they fired.
- A list of items shipped on one branch with one branch gate and one PR.

## Integration

**Entered from:** the user directly, razorback:brainstorming triage, or razorback:systematic-debugging Phase 4. **Exits to:** the standard flow on any trigger or failed criterion. **Never calls:** razorback:using-git-worktrees. Project instructions supply threshold tuning and affected-scope verification commands.
