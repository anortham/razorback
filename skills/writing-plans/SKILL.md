---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write implementation plans scaled to the situation. The right level of detail depends on who's executing and when.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

Once the plan is approved, razorback runs to completion; it stops only for real blockers (see `skills/using-razorback/references/blocker-taxonomy.md`). A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment.

## Plan Depth: Full vs. Light

**Full plan** — for async handoffs, complex multi-session work, or unfamiliar domains:
- Complete code snippets in every task
- Step-by-step TDD choreography (write test → verify fail → implement → verify pass → commit)
- Exact verification scopes with commands supplied from the target repo's docs
- Assumes the engineer has zero codebase context and questionable taste

**Light plan** — for same-session execution where implementers execute immediately:
- Task-level granularity: what to build, which files, acceptance criteria
- Exact file paths (always useful) but no complete code snippets
- Brief approach notes instead of full implementations — the implementer uses Miller to read the actual code
- TDD expectation stated once, not choreographed per-step — the implementer follows TDD naturally
- Verification strategy stated once: worker scope, affected-change scope, branch gate, and expensive-tier triggers
- Typically 1/3 the length of a full plan

**How to choose:** If the plan will be executed in this session by dispatched subagents via `subagent-driven-development`, use light. If it's a handoff to another session, a no-delegation run, or work for another developer, use full. When in doubt, ask.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans, one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure, but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Task Slicing

**Default to vertical slices.** Each task should cut through the stack to deliver one thin, observable behavior end to end — query + endpoint + UI affordance + test in one task — rather than one horizontal layer per task (all queries, then all endpoints, then all UI). Vertical slices are independently verifiable, reviewable, and revertible; horizontal layers ship nothing until the last one lands.

Horizontal decomposition is justified only when a layer is genuinely shared by several later slices, or an interface contract must be locked before parallel work can fan out (contract-first). When one task carries most of the technical risk, schedule it first (risk-first) so a wrong bet is discovered at minimum sunk cost.

**Keep it compilable.** Every task ends with the repo building and worker-scope verification green, committed. No committed state may be broken; broader gates still run at the batch/branch scopes defined in the Verification Strategy.

**Rollback-friendly ordering.** Order tasks so a partially executed plan leaves the branch shippable or cleanly revertible: no half-wired user-facing behavior between tasks, and the slice that completes a user-visible behavior is the one that exposes it.

**Slice boundaries are not stop points.** Slices exist for verifiability and rollback, not for pausing. Completing a slice means checkpoint and continue immediately to the next task — the autonomous execution model stops only for the blocker taxonomy and the final PR, never because a slice finished.

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures**, never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code, the engineer may be reading tasks out of order)

## Codebase Orientation (REQUIRED before writing plan)

You cannot write accurate file paths, line ranges, or implementation steps without understanding the code. Before writing any task:

1. **Orient on the area:** Miller `context` — returns token-budgeted context with pivots and neighbors
2. **Inspect key symbols:** Miller `inspect depth=full` — shows callers, callees, types, children
3. **Find exact locations:** list a file's symbols with Miller `inspect` — get file structure with line numbers for `Modify:` references
4. **Assess impact:** find references with Miller `trace` — find all callers before planning changes

**Do NOT guess file paths or line numbers.** Use Miller to discover them. Plans with wrong paths waste implementer time on dead ends.

## Bite-Sized Task Granularity (Full Plans)

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

Light plans use task-level granularity instead: each task is a coherent unit of work (add a function, modify an API, write tests for a component). Steps within a task are left to the implementer's judgment.

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Architecture Quality:** [Approved module/interface shape, architecture risk, or `No Architecture Impact` for mechanical plans]

---
```

## Architecture Quality

Non-mechanical plans MUST include an `Architecture Quality` section that records the approved module/interface shape and the main architecture risk. Mechanical plans may use a `No Architecture Impact` note instead.

If code reality contradicts the approved shape, the worker reports a plan mismatch rather than redesigning locally.

## Verification Strategy

Every plan MUST include a language-agnostic verification strategy. Razorback owns the scope boundaries; the target repo owns the commands.

```markdown
## Verification Strategy

**Project source of truth:** [AGENTS.md / CLAUDE.md / docs path / CI config / manifest metadata that defines verification tiers]

**Worker red/green scope:** [Lowest-cost verification that proves the new or changed behavior. Use the repo's documented command.]

**Worker ceiling:** [Maximum scope workers may run on their own. Workers do not own broader regression gates. If the lead asks for broad diagnostic output, the lead still owns acceptance for that scope.]

**Worker gate invariant:** [For each assigned worker gate, state the behavior or evidence invariant the gate proves.]

**Lead affected-change scope:** [Project-defined affected-area or changed-files gate. Run after a coherent batch, not after every edit.]

**Branch gate:** [Project-defined broad confidence gate before handoff, push, or PR.]

**Replay/metric evidence:** [For replay, metric, or acceptance evidence, state which assertions or metrics are hard gates and which are report-only.]

**Escalation triggers:** [Changed areas or failure modes that require broader tiers.]

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp. For replay or metric evidence, also record hard-gate metrics and report-only metrics. If the same HEAD already has a passing ledger entry for the required scope, reuse that evidence instead of rerunning the same expensive gate.
```

If the repo has no documented hierarchy, define one in the plan using neutral scope labels:
- **worker:** narrowest behavior proof
- **affected-change:** changed files or touched subsystem
- **branch:** broad pre-handoff confidence
- **expensive:** slow specialist gates, run only when touched areas require them

Do not bake language, framework, or test-runner commands into razorback skills. Put concrete commands in the plan from the target repo's docs.

## Model Routing

Every plan that will dispatch workers MUST include a language-agnostic model-routing section. Razorback owns the role/risk policy; the target repo maps tiers to harness-specific model names.

Read repo-root `RAZORBACK.md` first. If it exists, copy the relevant routing policy into the plan. If it is absent, use explicit harness docs if present. If no policy exists and the run needs delegation, ask once for routing.

```markdown
## Model Routing

**Project source of truth:** [RAZORBACK.md / harness docs / user choice]

**Strategy tier:** [planning, architecture, decomposition, lead review, finding triage]
- Harness mapping: [model/reasoning setting or inherit]

**Implementation tier:** [bounded worker tasks from a clear plan]
- Harness mapping: [model/reasoning setting or inherit]

**Mechanical tier:** [docs, fixtures, rote edits, formatting, manifests with no test, replay, metric, or acceptance-gate ownership]
- Harness mapping: [model/reasoning setting or inherit]

**Gate-interpretation reviewer:** [reviewer tier for reading the plan, failing test or replay, and diff to decide whether the test or implementation is wrong]
- Harness mapping: [model/reasoning setting or inherit]

**Escalation tier:** [security, subtle correctness, high blast radius, weak tests, repeated failures, gate interpretation]
- Harness mapping: [model/reasoning setting or inherit]

**Worker eligibility:** [conditions that allow implementation-tier workers]

**Escalation triggers:** [conditions that require strategy/escalation tier]

**Mechanical exclusion:** Mechanical workers cannot own failing tests, replay evidence, metrics, or acceptance gates. Split docs-only updates from evidence interpretation.

**Unsupported harness behavior:** If the harness cannot choose models per agent, use `inherit`, note it in the plan, and continue.
```

Do not hard-code provider-specific model names in razorback skills. Put those names in `RAZORBACK.md` or the plan's copied routing block.

Harness-specific model selection:
- **Claude Code:** Agent tool `model` parameter accepts short names only: `opus`, `sonnet`, `haiku`. Translate full model IDs (e.g., `claude-opus-4-7`) to the short form when dispatching.
- **Codex:** `spawn_agent(model=..., reasoning_effort=...)` for delegated workers
  when the session supports per-agent selection; `-m <model>` on `codex exec`
  for CLI reviewer runs; otherwise inherit the global default from
  `~/.codex/config.toml` and note the limitation.
- **Cursor:** model selection is IDE-level; use `inherit` and note the limitation.
- **OpenCode / Copilot CLI:** use the harness model parameter if available, otherwise `inherit`.

## Task Structure

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `<project-defined worker red/green command for this behavior>`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `<project-defined worker red/green command for this behavior>`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Light Plan Task Structure

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**What to build:** [2-3 sentences describing the feature/change and why]

**Approach:** [Key decisions — which pattern to follow, what to call things, edge cases to handle]

**Acceptance criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Worker-scope verification passes, committed
````

## Remember

**Always (both plan types):**
- Exact file paths
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

**Full plans only:**
- Complete code in plan (not "add validation")
- Exact project-defined verification commands with expected output

## Execution Handoff

**Step 1, announce plan save and request approval.** After saving, announce:

**"Plan saved to `<path>`. Please review it and reply **approved** (with optional reviewer choice, e.g. 'approved, codex review'; omit reviewer choice for no external review) or request changes."**

**Step 2, wait for explicit approval.** Do NOT proceed on silence, hedged responses ("looks ok", "maybe", "I guess"), questions, or partial feedback. Only an explicit **"approved"**, **"yes, go"**, **"run it"**, or equivalent unblocks execution. The approval message can fold in the reviewer choice (e.g. "approved, codex review", "approved, no external review").

If the user requests changes, revise the plan, re-run the self-review, re-save, and re-ask for approval. Brainstorming gates the spec; writing-plans gates the plan. This is the last human stop before autonomous execution.

**Step 3, capture the reviewer choice without prompting.** The default reviewer choice is `none`. If the approval message already named a choice (e.g. "approved, run it, pre-merge codex review", "approved, no external review") or the saved spec explicitly requested a reviewer, set `reviewer_choice` to `codex`, `gemini`, or `claude` as requested. Do not ask a separate reviewer-choice question after approval.

**Step 4, invoke the execution skill immediately.** After approval, announce which execution skill will run and invoke it, passing the plan path, the reviewer choice (`none` / `codex` / `gemini` / `claude`), verification strategy, and model routing:

- **When subagent delegation is available:** `razorback:subagent-driven-development`
- **For single-task, tightly-sequential, or no-delegation plans:** `razorback:executing-plans`

Starting execution after approval is the default. If the user requested a separate-session handoff before approval, guide them to open a new session in the worktree and use `razorback:executing-plans` there.
