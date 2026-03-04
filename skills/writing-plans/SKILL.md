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

## Plan Depth: Full vs. Light

**Full plan** — for async handoffs, complex multi-session work, or unfamiliar domains:
- Complete code snippets in every task
- Step-by-step TDD choreography (write test → verify fail → implement → verify pass → commit)
- Exact commands with expected output
- Assumes the engineer has zero codebase context and questionable taste

**Light plan** — for same-session execution where a subagent implements immediately:
- Task-level granularity: what to build, which files, acceptance criteria
- Exact file paths (always useful) but no complete code snippets
- Brief approach notes instead of full implementations — the implementer uses Julie tools to read the actual code
- TDD expectation stated once, not choreographed per-step — the implementer follows TDD naturally
- Typically 1/3 the length of a full plan

**How to choose:** If the plan will be executed by a subagent in this session (subagent-driven-development), use light. If it's a handoff to another session or developer, use full. When in doubt, ask.

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

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:executing-plans to implement this plan task-by-task.

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

After saving the plan, offer execution choice:

**"Plan complete and saved to `docs/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with review between batches

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use razorback:subagent-driven-development
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses razorback:executing-plans
