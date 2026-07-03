---
name: fixing-small-issues
description: Use when a reported defect or requested tweak looks small and local — a button not disabled, a double-submit, an off-by-one, a wrong label, CSS/styling adjustments, copy changes, config value fixes — before invoking brainstorming, creating a worktree, or running any test suite.
---

# Fixing Small Issues

## Overview

The triage-first path for small, local, reversible changes. It right-sizes process: locate the issue, measure it against objective criteria, fix it in place, verify the affected scope. No worktree, no baseline suite run, no design doc, no implementer dispatch.

**Core principle:** Investigate before infrastructure. Measure before choosing a tier.

**Announce at start:** "I'm using the fixing-small-issues skill to triage this."

## The Iron Law

```
NO INFRASTRUCTURE BEFORE INVESTIGATION
```

No worktree creation, no project setup, no baseline or full test-suite run until the change target is located and the tier is chosen. Running a 6-minute suite before opening the implicated file is the failure this skill exists to prevent — for every tier, not just this one.

## When to Use

Symptoms: a user reports a small defect (double-submit, missing disabled state, wrong label, off-by-one, stale link) or requests a small tweak (CSS values, copy, a config constant).

**Not for:** new features or components, anything touching public APIs, schemas, dependencies, or security behavior, or any issue whose investigation reveals it is bigger than the criteria below. When in doubt, run Step 1 — the criteria decide, not the vibe.

## Step 1: Investigate (no infrastructure)

- Locate the target with Miller: `search` for the symptom, `inspect(target, depth=full)` on the implicated symbol, `trace` if it might be shared.
- For defects: run systematic-debugging Phase 1 — reproduce, find root cause. **REQUIRED BACKGROUND:** razorback:systematic-debugging.
- For tweaks: confirm the exact target (selector, constant, string) with Miller evidence.

## Step 2: Triage (measure, don't vibe)

The quick-fix tier applies only when ALL criteria hold. Project instructions may
tune the numeric thresholds; the criteria themselves are not optional.

| Criterion | Threshold |
|-----------|-----------|
| Target located | Confirmed with Miller evidence, not guessed |
| Files | ≤ 2 source files (tests excluded) |
| Lines | ~20 changed lines (tests excluded) |
| Contracts | No public API, schema, persisted-data, config-contract, security-behavior, or dependency changes |
| Structure | No new modules or components (a new test file is fine) |
| Reversibility | A single `git revert` cleanly undoes it |

**Any criterion fails or cannot be measured → exit this skill.** Name the failed criterion and route to the standard flow (razorback:brainstorming → plan). An unknown is a failure, not a pass.

**All criteria pass →** announce the tier: "Quick-fix tier: <one-line summary> (N files, ~M lines)." No user consent is needed to proceed — the tier is pre-authorized policy. The worktree escape hatch's consent requirement does not apply because using-git-worktrees is never invoked on this tier.

## Step 3: Fix in place

- Work on the current checkout. If the repo protects the current branch, create a plain feature branch — never a worktree.
- TDD still applies where a test harness covers the behavior: write the failing regression test first, then the minimal fix. **REQUIRED SUB-SKILL:** razorback:test-driven-development.
- No test surface (pure visual or copy change)? Verify by observing the rendered or actual result, and say that's what you did.
- One fix at a time. No while-I'm-here improvements.

## Step 4: Verify the affected scope only

- Run the targeted test(s) and reconfirm the original symptom is gone. razorback:verification-before-completion applies in full — evidence, not "should work."
- The full suite is NOT part of this tier. The full suite runs at the branch gate
  (CI or pre-merge), not in the inner loop.
- Finish per project convention: commit with a clear message; open a PR where the project is branch-gated.

## Escalation Triggers

Objective, checked continuously while fixing:

- The change needs a **3rd source file** or **~2× the line budget**
- The root cause lands in **shared or public code** (API, schema, shared state, security boundary)
- A **second fix attempt fails**
- The fix requires a **dependency change or a new module**

On any trigger: STOP. Commit WIP on the branch, then promote to the standard flow (razorback:brainstorming or razorback:writing-plans) carrying the investigation evidence forward. Escalation is a tier change, not a failure — the investigation is never wasted.

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

## Integration

**Entered from:** the user's request directly, razorback:brainstorming triage, or razorback:systematic-debugging Phase 4.

**Exits to:** the standard flow on any escalation trigger or failed criterion.

**Never calls:** razorback:using-git-worktrees.

Use the active project instructions for any threshold tuning or affected-scope
verification commands.
