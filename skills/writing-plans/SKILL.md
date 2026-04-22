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

Once the plan is approved, razorback runs to completion; it stops only for real blockers (see `skills/using-razorback/references/blocker-taxonomy.md`).

## Plan Depth: Full vs. Light

**Full plan** — for async handoffs, complex multi-session work, or unfamiliar domains:
- Complete code snippets in every task
- Step-by-step TDD choreography (write test → verify fail → implement → verify pass → commit)
- Exact commands with expected output
- Assumes the engineer has zero codebase context and questionable taste

**Light plan** — for same-session execution where implementers execute immediately:
- Task-level granularity: what to build, which files, acceptance criteria
- Exact file paths (always useful) but no complete code snippets
- Brief approach notes instead of full implementations — the implementer uses Julie tools to read the actual code
- TDD expectation stated once, not choreographed per-step — the implementer follows TDD naturally
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

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures**, never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code, the engineer may be reading tasks out of order)

## Codebase Orientation (REQUIRED before writing plan)

You cannot write accurate file paths, line ranges, or implementation steps without understanding the code. Before writing any task:

1. **Orient on the area:** `get_context(query='<feature area>')` — returns token-budgeted context with pivots and neighbors
2. **Understand key symbols:** `deep_dive(symbol='<symbol to modify>')` — shows callers, callees, types, children
3. **Find exact locations:** `get_symbols(file_path='<file>')` — get file structure with line numbers for `Modify:` references
4. **Assess impact:** `fast_refs(symbol='<public API>')` — find all callers before planning changes

**Do NOT guess file paths or line numbers.** Use Julie tools to discover them. Plans with wrong paths waste implementer time on dead ends.

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

---
```

## Task Structure

````markdown
### Task N: [Component Name]

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

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Light Plan Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**What to build:** [2-3 sentences describing the feature/change and why]

**Approach:** [Key decisions — which pattern to follow, what to call things, edge cases to handle]

**Acceptance criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Tests pass, committed
````

## Remember

**Always (both plan types):**
- Exact file paths
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

**Full plans only:**
- Complete code in plan (not "add validation")
- Exact commands with expected output

## Execution Handoff

**Step 1, announce plan save and request approval.** After saving, announce:

**"Plan saved to `<path>`. Please review it and reply **approved** (with an optional reviewer choice, e.g. 'approved, codex review') or request changes."**

**Step 2, wait for explicit approval.** Do NOT proceed on silence, hedged responses ("looks ok", "maybe", "I guess"), questions, or partial feedback. Only an explicit **"approved"**, **"yes, go"**, **"run it"**, or equivalent unblocks execution. The approval message can fold in the reviewer choice (e.g. "approved, codex review", "approved, no external review").

If the user requests changes, revise the plan, re-run the self-review, re-save, and re-ask for approval. Brainstorming gates the spec; writing-plans gates the plan. This is the last human stop before autonomous execution.

**Step 3, capture the reviewer choice.** If the approval message already named a choice (e.g. "approved, run it, pre-merge codex review", "approved, no external review"), skip the question. Otherwise ask once:

**"External review before PR? (none / codex / gemini / claude)"**

**Step 4, invoke the execution skill.** After the reviewer choice is in hand, announce which execution skill will run and invoke it, passing the plan path, the reviewer choice (`none` / `codex` / `gemini` / `claude`), and the project test command if known:

- **When subagent delegation is available:** `razorback:subagent-driven-development`
- **For single-task, tightly-sequential, or no-delegation plans:** `razorback:executing-plans`

Starting execution. Tell me now if you want a separate-session handoff instead; in that case, guide the user to open a new session in the worktree and use `razorback:executing-plans` there.
