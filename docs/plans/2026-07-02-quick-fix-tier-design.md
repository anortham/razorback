# Quick-Fix Tier Design

**Date:** 2026-07-02
**Status:** Approved (conversational approval; this doc records the agreed design)

## Problem

Razorback has no process tier below brainstorming's "Lightweight" path. Every
behavior-modifying request — including one-line defect repairs and cosmetic
tweaks — routes through brainstorming → worktree creation → baseline test-suite
run → design doc → implementer dispatch → finishing-a-development-branch.

Two real incidents motivated this change:

1. A "submit button isn't disabled, users can double-submit" bug report
   triggered worktree creation and a full test-suite baseline run before the
   agent had located the defect.
2. A two-property CSS tweak triggered a full test-suite run before the agent
   looked at the stylesheet.

Both trace to `using-git-worktrees` Step 4 (baseline verification runs the
suite immediately after worktree creation, before the issue is examined) and to
the absence of any triage step that could route small work away from the
worktree path. The anti-rationalization tables correctly forbid agents from
*deciding* a process is overkill — so the fix must be a structural tier with
objective criteria, not a judgment call.

## Design

Three pieces:

### 1. New skill: `razorback:fixing-small-issues`

A triage + execution path for small, local, reversible changes.

**Order of operations (the load-bearing rule):** investigate first,
infrastructure never (for this tier). Locate the root cause / target with
Miller and systematic-debugging Phase 1 BEFORE creating any worktree, running
any setup, or running any test suite. Classification happens after evidence
exists.

**Entry criteria (ALL must hold, measured after locating the target):**

- Root cause or change target located and confirmed with Miller evidence
  (`inspect` / `trace`), not guessed.
- Expected change fits in ≤ 2 source files and ~20 changed lines
  (tests excluded from both counts).
- No changes to public API signatures, schemas, persisted data shapes,
  config contracts, security-relevant behavior, or dependencies.
- No new modules/components (a new test file is allowed).
- A single `git revert` would cleanly undo it.

Projects may override the numeric thresholds in repo-root `RAZORBACK.md`.

**Execution:** work on the current checkout (feature branch if the repo
protects main; never a worktree, never a baseline suite run). TDD still
applies where a test harness covers the behavior: failing regression test →
minimal fix. Pure visual tweaks with no test surface verify by observing the
rendered result. Verification scope is the affected scope only — the targeted
test(s) plus the original symptom. The full suite belongs to the project's
branch gate (CI), not to this tier's inner loop.

**Escalation triggers (objective, checked continuously):**

- The change needs a 3rd source file or ~2× the line budget.
- The root cause lands in shared/public code (API, schema, shared state,
  security boundary).
- A second fix attempt fails (systematic-debugging's counter).
- The fix requires a dependency change or a new module.

On any trigger: stop, preserve work (commit WIP on the branch), and promote to
the standard flow (brainstorming / writing-plans) carrying the investigation
evidence forward. Escalation is a tier change, not a failure.

**Anti-rationalization, both directions:** the skill's table counters
downscaling abuse ("it's basically small" without measuring, "skip the
regression test, it's tiny") AND ceremony reflex ("better safe — run the full
suite first", "the rules say always worktree"). Criteria are measured, not
vibed; ceremony that the tier does not require is also a violation.

### 2. `RAZORBACK.md` change-tier policy

Extend this repo's `RAZORBACK.md` (already the declared source of truth for
"verification tiers") with a **Change Tiers** section: the quick-fix tier and
its verification scope, the standard tier, and the
investigate-before-infrastructure rule. This section doubles as the schema
example other projects copy.

### 3. Routing wire-ins

- `brainstorming`: triage carve-out before "Choosing the Right Path" — requests
  meeting quick-fix criteria route to `razorback:fixing-small-issues`;
  brainstorming remains mandatory for designing new behavior. Existing
  approval gates unchanged.
- `using-razorback` Execution Model: add the quick-fix routing line.
- `using-git-worktrees` Integration: note that `fixing-small-issues` works on
  the current checkout and does not call this skill.
- `systematic-debugging` Related skills: cross-reference for executing
  qualifying fixes.

## Acceptance criteria

- [ ] Baseline (RED) scenarios documented: agents without the skill choose
      worktree + suite ceremony for small issues.
- [ ] `skills/fixing-small-issues/SKILL.md` exists with objective entry
      criteria, investigate-before-infrastructure rule, affected-scope
      verification, escalation triggers, bidirectional rationalization table,
      red flags.
- [ ] `RAZORBACK.md` has a Change Tiers section.
- [ ] Routing wire-ins in brainstorming, using-razorback,
      using-git-worktrees, systematic-debugging.
- [ ] With-skill (GREEN) scenarios: agents choose the quick path for the two
      incident scenarios AND escalate correctly when a fix outgrows criteria.
- [ ] `tests/quick-fix-tier.test.mjs` process gates pass; existing
      `node --test` suite stays green; `bump-version.sh --check` clean.
- [ ] Protected conventions intact: anti-rationalization tables, existing
      approval gates, Miller-first exploration.

## Out of scope

- Flipping `using-git-worktrees` defaults for standard-tier work (option 2
  from the review — not chosen).
- Any change to plan-execution ceremony for multi-task work.
