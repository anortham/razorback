---
name: fixing-small-issues
description: Use when a reported defect or requested tweak looks small and local — a button not disabled, a double-submit, an off-by-one, a wrong label, CSS/styling adjustments, copy changes, config value fixes — before invoking brainstorming, creating a worktree, or running any test suite.
---

# Fixing Small Issues

Triage-first path for small, local, reversible changes: locate, measure against objective criteria, fix in place, verify the affected scope. No worktree, no baseline suite run, no design doc, no implementer dispatch.

**Announce at start:** "I'm using the fixing-small-issues skill to triage this."

## The Iron Law

```
NO INFRASTRUCTURE BEFORE INVESTIGATION
```

No worktree, no project setup, no baseline or full-suite run until the change target is located and the tier is chosen. Running a 6-minute suite before opening the implicated file is the failure this skill exists to prevent.

**Not for:** new features or components; public APIs, schemas, dependencies, or security behavior; anything investigation shows is bigger than the criteria. When in doubt, run Step 1 — the criteria decide.

## Step 1: Investigate (no infrastructure)

- Locate the target: a search for the symptom or error text, a file read, or code-kb (`search_symbols`, `get_symbol_body`, `find_references` if it might be shared).
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
- TDD applies where a harness covers the behavior: failing regression test first, then the minimal fix (razorback:test-driven-development). No test surface → verify by observing the actual result, and say so.
- One fix at a time. No while-I'm-here improvements.
- If the fix cuts a real corner with a known ceiling, mark it: `# razorback: <ceiling>, <upgrade trigger>` (`//` in C-family languages), e.g. `# razorback: global lock, per-account locks if throughput matters`. razorback:harvesting-debt collects markers into a ledger later; an unmarked shortcut rots.

## Step 4: Verify the affected scope only

- code-kb `blast_radius(symbol='<changed symbol>')` gives the impacted symbols and likely tests — run those and reconfirm the symptom is gone. A failing test iterates on its own id until it passes; the impacted set runs once after (razorback:systematic-debugging Phase 4). razorback:verification-before-completion applies in full.
- The full suite is NOT part of this tier; the full suite runs at the branch gate (CI or pre-merge).
- Commit with a clear message; open a PR where the project is branch-gated.
- In the closing summary, list any `# razorback:` markers left (`<file>:<line>` + ceiling), or say "no markers left."

## Escalation triggers

Checked continuously while fixing:

- The change needs a **3rd source file** or **~2× the line budget**
- The root cause lands in **shared or public code** (API, schema, shared state, security boundary) — check with code-kb `find_references(symbol_name='<symbol>')` and `blast_radius(symbol='<symbol>')`
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

## Red Flags — STOP

- Creating a worktree for a change you haven't located yet
- Running any test suite before opening the implicated code
- Writing a design doc for a measured quick-fix change
- Dispatching an implementer subagent for a ≤ 20-line fix
- Proceeding while a criterion is unmeasured
- Continuing past an escalation trigger

## It's working if

- The tier was announced with its measurements before any fix landed.
- The affected scope ran and the symptom is gone; the full suite never ran in the inner loop.
- Every deliberate corner carries a `# razorback:` marker, and the closing summary lists them or says none.
- Escalation triggers were honored the moment they fired.

## Integration

**Entered from:** the user directly, razorback:brainstorming triage, or razorback:systematic-debugging Phase 4. **Exits to:** the standard flow on any trigger or failed criterion. **Never calls:** razorback:using-git-worktrees. Project instructions supply threshold tuning and affected-scope verification commands.
