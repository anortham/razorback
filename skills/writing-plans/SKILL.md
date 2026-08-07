---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write implementation plans scaled to the situation. The right level of detail depends on who's executing and when.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree — razorback:brainstorming sets one up (via razorback:using-git-worktrees) after spec approval. If you are not in one, run razorback:using-git-worktrees before writing the plan.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

Once the plan is approved, razorback runs to completion; it stops only for real blockers (see `../using-razorback/references/blocker-taxonomy.md` (in the razorback plugin)). A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment.

## Plan Depth: Full vs. Light

**Full plan** — for async handoffs, complex multi-session work, or unfamiliar domains:
- Complete code snippets in every task
- Step-by-step TDD choreography (write test → verify fail → implement → verify pass → apply commit mode)
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

**Keep it compilable.** Every task ends with the repo building and worker-scope verification green, then either committed by the worker (`serial-worker-commit`) or handed to the lead for staging and commit after inline review (`parallel-lead-commit`). No accepted task state may be broken; broader gates still run at the batch/branch scopes defined in the Verification Strategy.

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
2. **Inspect key symbols:** Miller `inspect(target, depth=overview)` — bounded callers, callees, body preview; escalate to `depth=full` for symbols the plan will modify
3. **Find exact locations:** list a file's symbols with Miller `inspect` — get file structure with line numbers for `Modify:` references
4. **Assess impact:** Miller `impact(target)` — impacted symbols plus the likely tests, so the plan's Verification Strategy names real commands
5. **Find references:** Miller `trace(target)` — every caller before planning a change to a public API

**Do NOT guess file paths, line numbers, symbol names, function signatures, config shapes, route names, CLI flags, or public contracts.** Use Miller to discover them. Plans with wrong paths or invented API shapes waste implementer time on dead ends.

**External API staleness check:** For each task that codes against an external framework, library, or API where training knowledge could be stale (new-in-version features, unfamiliar dependencies, changed defaults), apply razorback:grounding-in-current-docs while planning: verify the exact surface and record it — or the doc URL — in the task itself so implementers don't code external APIs from memory.

## Bite-Sized Task Granularity (Full Plans)

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Apply commit mode" - step

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

## Global Constraints

[One line per project-wide requirement, exact values verbatim from the spec — see the `## Global Constraints` rule below]

---
```

## Global Constraints

Every plan MUST include `## Global Constraints` before the task list. Use it for requirements that bind every task: version floors, dependency limits, naming and copy rules, platform support, exact strings, exact formats, and relationships such as "same layout as X" or "matches Y".

Copy exact values verbatim from the spec. Do not make each task repeat them, and do not leave implementers or reviewers to infer them from prose.

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

**Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]

**Replay/metric evidence:** [For replay, metric, or acceptance evidence, state which assertions or metrics are hard gates and which are report-only.]

**Escalation triggers:** [Changed areas or failure modes that require broader tiers.]

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp. For replay or metric evidence, also record hard-gate metrics and report-only metrics. If the same HEAD already has a passing ledger entry for the required scope, reuse that evidence instead of rerunning the same expensive gate.
```

The `Security scope` field must either name the commands or write `none declared` explicitly — silence is not allowed. `razorback:finishing-a-development-branch` renders `none declared` into the morning report, so the opt-out is visible. `razorback:security-review` defines the scopes (`security-secrets`, `security-deps`) and their gate semantics.

If the repo has no documented hierarchy, define one in the plan using these neutral scope labels: **worker** (narrowest behavior proof), **affected-change** (changed files or touched subsystem), **branch** (broad pre-handoff confidence), and **expensive** (slow specialist gates, run only when touched areas require them).

Do not bake language, framework, or test-runner commands into razorback skills. Put concrete commands in the plan from the target repo's docs.

## Parallel Execution Contract

Every plan MUST include `## Parallel Execution Contract` between
`## Verification Strategy` and the task list. This is the lead's dispatch contract: it says which tasks form
safe parallel batches, which ones must serialize, and why.

Use this exact structure:

```markdown
## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: [name] | [Batch A / Batch B / None - serial] | [Exact create/modify/test ownership for this task] | [No / Yes / Not applicable - single task.] | [Why serialization is required, or `None - safe parallel batch.` / `Not applicable - single task.`] |
```

Rules:
- `Parallel batch` names the safe batch this task belongs to. Use a shared label
  such as `Batch A` only when the tasks can dispatch together without file or
  ordering conflicts.
- `File ownership` is exact. Do not rely on "same area" or "related files" as a
  proxy.
- `Serialization required` is `No` for safe parallel tasks, `Yes` only for a real
  dependency or tool limitation, and `Not applicable - single task.` only when the
  whole plan has one task.
- `Dependency reason` is mandatory. If serialization is `Yes`, record the blocking
  dependency or tool limitation. If serialization is `No`, write
  `None - safe parallel batch.`. If the plan has one task, write
  `Not applicable - single task.`.

Completion follows commit mode:
- `serial-worker-commit`: after assigned verification passes, the worker may make
  the owned-file commit and record the commit SHA.
- `parallel-lead-commit`: after assigned verification passes, the worker does not
  commit. The worker hands the verified diff to the lead for staging and commit
  after inline review.

## Task Structure

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact symbols, signatures, data shape, or user-facing contract]
- Produces: [what later tasks rely on — exact function names, parameter and return types, file formats, CLI flags, routes, or events. A task's implementer sees only their own task; this block is how they learn neighboring contracts.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

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

**Step 5: Apply commit mode**

- `serial-worker-commit`: after assigned verification passes, create the owned-file
  worker commit and record the resulting SHA.
- `parallel-lead-commit`: do not commit from the worker lane. Hand the verified
  change to the lead for staging and commit after inline review.

**Acceptance criteria:**
- [ ] [Specific, testable requirement for this task]
- [ ] Tests pass and the change is either committed by the worker or handed to the lead per commit mode
````

The execution skills tick these `[ ]` → `[x]` as each task completes, so every task carries a tickable progress marker regardless of plan type.

## Compact Single-Task Full-Plan Form

When a full plan has exactly one task, use `## Task Structure` above unchanged — full TDD steps and all. Only two things differ, so do not re-template the task:

- Collapse `## Parallel Execution Contract` to a single row: `Parallel batch` is `None - serial`, `File ownership` carries the task's exact ownership, and both `Serialization required` and `Dependency reason` read `Not applicable - single task.`
- Copy those same values into the task body: **Contract inputs:** and **File ownership:** carry their normal exact values, while **Serialization required:** and **Dependency reason:** both read `Not applicable - single task.`

## Light Plan Task Structure

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [exact contract this task depends on]
- Produces: [exact contract future tasks depend on. A task's implementer sees only their own task, so include names and shapes here.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

**What to build:** [2-3 sentences describing the feature/change and why]

**Approach:** [Key decisions — which pattern to follow, what to call things, edge cases to handle]

**Acceptance criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Worker-scope verification passes and the change is either committed by the worker or handed to the lead per commit mode
````

## Remember

**Always (both plan types):**
- Exact file paths
- Reference relevant skills by name with the `razorback:` prefix (never `@` file links — those force-load content and burn context)
- DRY, YAGNI, TDD, frequent review-approved branch updates through the active commit mode
- Tickable `- [ ]` acceptance criteria per task — execution flips these to `[x]` as a durable, in-document progress record

**Full plans only:**
- Complete code in plan (not "add validation")
- Exact project-defined verification commands with expected output

## Execution Handoff

**Step 1, announce plan save and request approval.** After saving, announce:

**"Plan saved to `<path>`. Please review it and reply **approved** (with optional reviewer choice, e.g. 'approved, codex review'; omit reviewer choice for no external review) or request changes."**

**Step 2, wait for explicit approval.** Do NOT proceed on silence, hedged responses ("looks ok", "maybe", "I guess"), questions, or partial feedback. Only an explicit **"approved"**, **"yes, go"**, **"run it"**, or equivalent unblocks execution. The approval message can fold in the reviewer choice (e.g. "approved, codex review", "approved, no external review").

If the user requests changes, revise the plan, re-run the self-review, re-save, and re-ask for approval. Brainstorming gates the spec; writing-plans gates the plan. This is the last human stop before autonomous execution.

**Step 3, capture the reviewer choice without prompting.** The default reviewer choice is `none`. If the approval message already named a choice (e.g. "approved, run it, pre-merge codex review", "approved, no external review") or the saved spec explicitly requested a reviewer, set `reviewer_choice` to `codex` or `claude` as requested. Do not ask a separate reviewer-choice question after approval.

If the target repo's project instructions declare an `## External model policy` block, the chosen reviewer must appear in its `Reviewer choices permitted:` list. If it does not, surface the conflict to the user at approval time — a human is present at this gate — instead of proceeding. `razorback:security-review` defines the policy block format.

**Step 4, invoke the execution skill immediately.** After approval, announce which execution skill will run and invoke it, passing the plan path, the reviewer choice (`none` / `codex` / `claude`), and verification strategy:

- **When subagent delegation is available:** `razorback:subagent-driven-development`
- **For single-task, tightly-sequential, or no-delegation plans:** `razorback:executing-plans`

Starting execution after approval is the default. If the user requested a separate-session handoff before approval, guide them to open a new session in the worktree and use `razorback:executing-plans` there.
