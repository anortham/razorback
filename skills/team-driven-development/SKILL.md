---
name: team-driven-development
description: Use when executing implementation plans with 2+ independent tasks. Creates an Agent Team where teammates work in parallel with Julie-powered orientation, lead does inline review, and fixes go to the existing teammate (no cold restart).
---

# Team-Driven Development

Execute plans by creating an Agent Team. Each teammate owns a set of tasks and files, works in parallel with Julie-powered codebase orientation, and persists for the entire session. The lead monitors progress, does inline review, and messages teammates directly for fixes.

**Core principle:** Parallel teammates + Julie orientation + persistent context for fixes = fast, high-quality execution without cold-start waste.

## When to Use

```dot
digraph when_to_use {
    "Have implementation plan?" [shape=diamond];
    "2+ independent tasks?" [shape=diamond];
    "team-driven-development" [shape=box style=filled fillcolor=lightgreen];
    "executing-plans (single agent)" [shape=box];
    "Manual execution or brainstorm first" [shape=box];

    "Have implementation plan?" -> "2+ independent tasks?" [label="yes"];
    "Have implementation plan?" -> "Manual execution or brainstorm first" [label="no"];
    "2+ independent tasks?" -> "team-driven-development" [label="yes"];
    "2+ independent tasks?" -> "executing-plans (single agent)" [label="no, sequential"];
}
```

**vs. Executing Plans (single agent):**
- Parallel execution (teammates work simultaneously)
- Persistent teammates (no cold restart for fixes)
- File ownership prevents conflicts
- Julie-powered orientation in each teammate's prompt

**vs. Subagent-Driven Development (DEPRECATED):**
- Teammates persist and can be messaged for fixes (subagents required resume or fresh dispatch)
- True parallelism (subagents were sequential per-task)
- Lead does inline review (no separate reviewer subagents needed)
- Same Julie-powered orientation, lower total token cost

## The Process

```dot
digraph process {
    rankdir=TB;

    "Read plan, analyze task dependencies" [shape=box];
    "Group tasks, assign file ownership" [shape=box];
    "Create team (TeamCreate)" [shape=box];
    "Spawn implementer teammates" [shape=box];

    subgraph cluster_parallel {
        label="Teammates Work in Parallel";
        style=dashed;
        "Teammate orients with Julie tools" [shape=box];
        "Teammate implements, tests, commits" [shape=box];
        "Teammate reports status" [shape=box];
        "Teammate orients with Julie tools" -> "Teammate implements, tests, commits";
        "Teammate implements, tests, commits" -> "Teammate reports status";
    }

    "Lead: inline review (spec + quality)" [shape=box];
    "Issues found?" [shape=diamond];
    "Message teammate with findings" [shape=box];
    "All tasks complete?" [shape=diamond];
    "Lead: final verification" [shape=box];
    "Use razorback:finishing-a-development-branch" [shape=box style=filled fillcolor=lightgreen];

    "Read plan, analyze task dependencies" -> "Group tasks, assign file ownership";
    "Group tasks, assign file ownership" -> "Create team (TeamCreate)";
    "Create team (TeamCreate)" -> "Spawn implementer teammates";
    "Spawn implementer teammates" -> "Teammate orients with Julie tools";
    "Teammate reports status" -> "Lead: inline review (spec + quality)";
    "Lead: inline review (spec + quality)" -> "Issues found?";
    "Issues found?" -> "Message teammate with findings" [label="yes"];
    "Message teammate with findings" -> "Teammate orients with Julie tools" [label="teammate fixes"];
    "Issues found?" -> "All tasks complete?" [label="no, approved"];
    "All tasks complete?" -> "Spawn implementer teammates" [label="more tasks to assign"];
    "All tasks complete?" -> "Lead: final verification" [label="yes"];
    "Lead: final verification" -> "Use razorback:finishing-a-development-branch";
}
```

## Step 1: Analyze Plan and Assign Ownership

Read the plan and identify:

1. **Task dependencies:** Which tasks can run in parallel? Which must wait?
2. **File ownership:** Which files does each task touch? No two teammates should modify the same file.
3. **Team size:** 2-4 teammates for most plans. More than 5 rarely helps. One task per teammate is ideal; group small related tasks if needed.

**File ownership is critical.** Two teammates editing the same file causes overwrites. If tasks share files, either:
- Sequence them (one teammate, then the next)
- Redesign the split (refactor the plan so tasks touch different files)
- Assign to the same teammate

## Step 2: Create Team and Spawn Teammates

Create the team, then spawn one teammate per task group.

**Each teammate spawn prompt MUST include:**

1. **Task assignment** with full text from plan (don't make them read the plan file)
2. **File ownership** listing exactly which files they own
3. **Julie tool directives** (see teammate prompt template below)
4. **Verification commands** specific to their task
5. **Status protocol** (see below)

Use the teammate prompt template at `./implementer-prompt.md`.

```
TeamCreate:
  name: "[feature]-team"

For each task group:
  Agent tool:
    description: "Implement [task name]"
    name: "[task-name]-implementer"
    prompt: [follow ./implementer-prompt.md template]
```

## Step 3: Monitor and Review

As teammates work, monitor their progress. When a teammate reports completion:

**Inline review checklist (lead does this, no reviewer subagents):**

**Spec compliance:**
- Did they implement everything requested? Compare actual code to task requirements.
- Did they add anything not requested? Flag extra work for removal.
- Did they misinterpret any requirements?
- Use `get_symbols(file_path)` to quickly scan changed files without reading them fully.

**Code quality:**
- Is the code clean, tested, and maintainable?
- Do tests actually verify behavior (not just that code runs)?
- Are there any code smells: duplication, tight coupling, unclear names?
- Use `deep_dive(symbol)` on key new/modified symbols to check callers/callees/types.
- Use `fast_refs(symbol)` to verify changes don't break dependents.

**Review cap: 3 iterations max.** If a teammate can't resolve issues in 3 rounds, escalate to the user.

## Step 4: Fix Issues via Message

When review finds issues, **message the teammate directly:**

```
SendMessage:
  to: "[teammate-name]"
  message: |
    Review found issues with your implementation:

    [List specific issues with file:line references]

    Fix these, run tests, commit, and report back.
    Keep it focused - fix what's flagged, don't refactor beyond that.
```

**Why messaging beats fresh dispatch:** The teammate already has full context from implementation - files read, decisions made, tests written. A fresh agent would burn tokens just getting back to where the teammate already is. This is the key advantage of teams over subagents.

## Step 5: Complete

After all teammates finish and reviews pass:

1. **Final verification:** Run the full test suite. Check for integration issues between teammates' work.
2. **Clean up:** `TeamDelete` to shut down the team.
3. **Finish:** Use `razorback:finishing-a-development-branch`.

## Teammate Status Protocol

Teammates report one of four statuses:

| Status | Meaning | Lead action |
|--------|---------|-------------|
| **DONE** | All tasks implemented, tested, committed | Inline review |
| **DONE_WITH_CONCERNS** | Complete, but has questions or doubts | Review + address concerns |
| **BLOCKED** | Can't proceed without help | Unblock: provide info, adjust plan, or reassign |
| **NEEDS_CONTEXT** | Missing codebase knowledge | Provide context or point to relevant files/symbols |

## When to Skip Spec Compliance Check

Same criteria as subagent-driven-development:

**Skip when:**
- Plan has specific acceptance criteria (not vague bullets)
- Task is a single coherent feature
- Teammate's report clearly addresses all requirements

**Keep when:**
- Plan is high-level or ambiguous
- Task has multiple interacting requirements
- Feature has subtle correctness constraints

When skipping spec check, the quality review still covers requirements.

## Prompt Templates

- `./implementer-prompt.md` - Teammate spawn prompt with Julie directives and file ownership

The reviewer prompts from subagent-driven-development (`spec-reviewer-prompt.md`, `code-quality-reviewer-prompt.md`) serve as review guides for the lead's inline review. The lead doesn't dispatch reviewer agents; instead, the lead uses those criteria directly.

## Example Workflow

```
You: I'm using Team-Driven Development to execute this plan.

[Read plan file: docs/plans/auth-overhaul.md]
[Analyze: 4 tasks, 3 are independent, task 4 depends on task 1]
[File ownership: Task 1 owns auth/, Task 2 owns middleware/, Task 3 owns tests/integration/]

[TeamCreate: "auth-overhaul-team"]

[Spawn teammate "session-handler" for Task 1: Session management]
[Spawn teammate "middleware-guard" for Task 2: Auth middleware]
[Spawn teammate "integration-tests" for Task 3: Integration test suite]
[Task 4 waits for Task 1 to complete]

--- Teammates work in parallel ---

middleware-guard reports: DONE
  - Implemented auth middleware with role-based checks
  - 12/12 tests passing
  - Committed

[Lead inline review: get_symbols on changed files, deep_dive on AuthMiddleware]
[Spec check: all requirements met]
[Quality check: clean, well-tested]
[Approved - mark Task 2 complete]

session-handler reports: DONE_WITH_CONCERNS
  - Implemented session store with Redis backend
  - 8/8 tests passing
  - Concern: TTL defaults may be too aggressive for mobile clients

[Lead inline review]
[Spec check: complete]
[Quality check: one issue - magic number for TTL]

[SendMessage to session-handler:]
  "Two things:
   1. Extract TTL to a named constant (SESSION_TTL_SECONDS)
   2. Your concern about mobile TTL is valid - add a comment noting
      this may need tuning. We'll address it in a follow-up."

session-handler: Fixed. TTL constant extracted, comment added, committed.

[Re-review: approved. Mark Task 1 complete]

[Now spawn teammate for Task 4 (depends on Task 1)]
[Spawn teammate "token-refresh" for Task 4: Token refresh flow]

integration-tests reports: DONE
[Lead inline review: approved. Mark Task 3 complete]

token-refresh reports: DONE
[Lead inline review: approved. Mark Task 4 complete]

[All tasks complete]
[Run full test suite - all passing]
[TeamDelete: "auth-overhaul-team"]
[Use razorback:finishing-a-development-branch]
```

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Let two teammates modify the same file (file conflicts overwrite work)
- Skip inline review (it consistently catches real issues)
- Skip the fix-and-re-review loop (if review found issues, they must be fixed AND re-reviewed)
- Spawn more than 5 teammates (diminishing returns, coordination overhead)
- Let blocked teammates spin - unblock them or reassign their work

**If a teammate asks questions:**
- Answer via SendMessage clearly and completely
- Provide additional context from your codebase knowledge
- Don't rush them into implementation

**If a teammate is stuck or unreachable:**
- Try messaging first
- If no response, spawn a new teammate for their remaining tasks
- This is the fallback, not the default

## Integration

**Required workflow skills:**
- **razorback:using-git-worktrees** - Set up isolated workspace before starting. Skip only with explicit user consent (small, single-session work where a feature branch is sufficient).
- **razorback:writing-plans** - Creates the plan this skill executes
- **razorback:finishing-a-development-branch** - Complete development after all tasks

**Teammates should follow:**
- **razorback:test-driven-development** - TDD for each task (embedded in teammate prompt)

**Alternative workflows:**
- **razorback:executing-plans** - Use for single-agent execution (1 task or tightly sequential)
