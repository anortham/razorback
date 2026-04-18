---
name: subagent-driven-development
description: Execute an implementation plan by dispatching fresh subagents (sequentially or in parallel) with inline review by the lead. Primary execution path for opencode, and a Claude Code fallback when Agent Teams don't fit.
---

# Subagent-Driven Development

Execute a plan by dispatching fresh subagents per task, with the lead doing inline review (spec compliance + code quality) after each task. Independent tasks can be dispatched in parallel; tightly coupled tasks run sequentially. For fixes, dispatch a fresh implementer with the fix prompt and prior-task context.

**Core principle:** Fresh subagent per task + inline review by lead + parallel fan-out when tasks are independent = high quality without wasted ceremony.

**Dispatch mechanism:**
- **Claude Code:** `Agent` tool (one call per subagent; multiple calls in one turn run in parallel).
- **opencode:** `Task` tool (one call per subagent; multiple calls in one turn run in parallel). The built-in `general` subagent is suitable for most implementer work; `@mention` also works for manual invocation.

## When to Use

```dot
digraph when_to_use {
    "Have implementation plan?" [shape=diamond];
    "Tasks mostly independent?" [shape=diamond];
    "Stay in this session?" [shape=diamond];
    "subagent-driven-development" [shape=box style=filled fillcolor=lightgreen];
    "executing-plans" [shape=box];
    "Manual execution or brainstorm first" [shape=box];

    "Have implementation plan?" -> "Tasks mostly independent?" [label="yes"];
    "Have implementation plan?" -> "Manual execution or brainstorm first" [label="no"];
    "Tasks mostly independent?" -> "Stay in this session?" [label="yes"];
    "Tasks mostly independent?" -> "Manual execution or brainstorm first" [label="no - tightly coupled"];
    "Stay in this session?" -> "subagent-driven-development" [label="yes"];
    "Stay in this session?" -> "executing-plans" [label="no - parallel session"];
}
```

**vs. Executing Plans (parallel session):**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Lead does inline review after each task (one pass, no reviewer subagents)
- Faster iteration (no human-in-loop between tasks)

**vs. Team-Driven Development (Claude Code only):**
- Fresh subagent per task; team-driven uses persistent named teammates that receive follow-up messages
- Both can fan out in parallel; the difference is persistence, not parallelism
- Fixes here dispatch a fresh implementer with the fix prompt plus prior context, rather than resuming a teammate
- Used on opencode (no Agent Teams) or on Claude Code when teammate persistence isn't worth the ceremony

## The Process

```dot
digraph process {
    rankdir=TB;

    subgraph cluster_per_task {
        label="Per Task";
        "Dispatch implementer subagent (./implementer-prompt.md)" [shape=box];
        "Implementer asks questions?" [shape=diamond];
        "Answer questions, provide context" [shape=box];
        "Implementer implements, tests, commits, reports" [shape=box];
        "Lead: inline review (spec + quality)" [shape=box];
        "Issues found?" [shape=diamond];
        "Resume implementer with findings (./fix-prompt.md)" [shape=box];
        "Mark task complete (TaskUpdate)" [shape=box];
    }

    "Read plan, extract tasks, create tasks via TaskCreate" [shape=box];
    "More tasks remain?" [shape=diamond];
    "Lead: final verification" [shape=box];
    "Use razorback:finishing-a-development-branch" [shape=box style=filled fillcolor=lightgreen];

    "Read plan, extract tasks, create tasks via TaskCreate" -> "Dispatch implementer subagent (./implementer-prompt.md)";
    "Dispatch implementer subagent (./implementer-prompt.md)" -> "Implementer asks questions?";
    "Implementer asks questions?" -> "Answer questions, provide context" [label="yes"];
    "Answer questions, provide context" -> "Dispatch implementer subagent (./implementer-prompt.md)";
    "Implementer asks questions?" -> "Implementer implements, tests, commits, reports" [label="no"];
    "Implementer implements, tests, commits, reports" -> "Lead: inline review (spec + quality)";
    "Lead: inline review (spec + quality)" -> "Issues found?";
    "Issues found?" -> "Resume implementer with findings (./fix-prompt.md)" [label="yes"];
    "Resume implementer with findings (./fix-prompt.md)" -> "Lead: inline review (spec + quality)" [label="re-review"];
    "Issues found?" -> "Mark task complete (TaskUpdate)" [label="no, approved"];
    "Mark task complete (TaskUpdate)" -> "More tasks remain?";
    "More tasks remain?" -> "Dispatch implementer subagent (./implementer-prompt.md)" [label="yes"];
    "More tasks remain?" -> "Lead: final verification" [label="no"];
    "Lead: final verification" -> "Use razorback:finishing-a-development-branch";
}
```

## Step 1: Extract Tasks from the Plan

Read the plan file once. Extract every task with its full text and surrounding context. Create tracking tasks via `TaskCreate` so progress is visible.

Before dispatching, orient yourself on the codebase with Julie:
- `get_context(query)` for initial orientation around the areas the plan touches
- `get_symbols(file_path)` on files the plan will modify, so you can spot later drift during review
- Do NOT chain Glob/Grep/Read for orientation — Julie is the required entry point

## Step 2: Dispatch Implementer Subagent

Use the template at `./implementer-prompt.md`. The spawn prompt MUST include:

1. **Task text** copied from the plan (don't make the subagent read the plan file)
2. **Scene-setting context** (how this task fits the larger plan)
3. **File ownership** (which files this task may modify)
4. **Julie tool directives** (use `get_context`, `deep_dive` before modifying any symbol, `fast_refs` before changing public APIs, `get_symbols` before reading full files)
5. **TDD expectations** (from `razorback:test-driven-development`)
6. **Verification commands** specific to this task

On Claude Code, save the **agent ID** returned by the dispatch so you can resume the subagent for fixes (preserves its orientation context). On opencode, the Task tool does not expose persistent resume, so fixes go to a fresh subagent with fix context included (see Step 4).

If the subagent asks questions, answer completely before letting it proceed.

### Parallel Dispatch (Independent Tasks)

When the plan has 2+ independent tasks (non-overlapping files, no ordering dependency), dispatch them in parallel:

- **Claude Code:** make multiple `Agent` tool calls in a single turn. They run concurrently and you review each as it reports back.
- **opencode:** make multiple `Task` tool calls in a single turn (or in the TUI, @mention the `general` subagent concurrently). Child sessions run in parallel; navigate with `session_child_*` keybinds.

Assign file ownership per subagent to prevent collisions. If tasks are tightly coupled (same files, shared state, ordering dependency), dispatch sequentially instead — one subagent at a time, lead reviews, then next.

Reviews still happen inline per-task. Do not batch reviews — a failing task shouldn't block review of the ones that passed.

## Step 3: Lead Inline Review

When the implementer reports completion, the lead does a single inline review covering both spec compliance and code quality. No reviewer subagents — the lead does this directly.

**Spec compliance:**
- Did the implementer build everything requested?
- Did they add anything not requested? Flag extras for removal.
- Did they misinterpret any requirement?
- Use `get_symbols(file_path)` to scan changed files without reading them fully.

**Code quality:**
- Is the code clean, tested, and maintainable?
- Do tests assert on meaningful values (not just "code ran without crashing")?
- Code smells: duplication, tight coupling, unclear names, missing error paths?
- Use `deep_dive(symbol)` on key new/modified symbols to check callers, callees, and types.
- Use `fast_refs(symbol)` to verify API changes don't break dependents.

**Review cap: 3 iterations.**

- On Claude Code: 3 resume-the-implementer attempts using `./fix-prompt.md`.
- On opencode: 3 fresh-dispatch-with-fix-context attempts.

If the 3rd iteration still fails:

1. Dispatch a **fresh implementer with reframed context** using `./fix-prompt.md`'s "Reframed-Context Attempt" section — different framing (different ownership, explicit plan disambiguation, simpler decomposition, or a prior-commit pointer so the fresh agent can read what was tried without rediscovering it).
2. If the fresh attempt also fails, flag the task in the morning report's "Blockers hit" section and continue with remaining tasks.
3. Escalate to the user only if the failure matches blocker taxonomy #5 (unresolvable test failures blocking the whole plan).

### When Lighter Review Is Appropriate

Spec compliance checking earns its keep when the plan leaves room for misinterpretation. When the plan is concrete, the review can focus on quality:

**Lighter (quality-focused) review when:**
- The plan has specific acceptance criteria or detailed requirements
- The task is a single coherent feature (not a multi-part system)
- The implementer's report clearly addresses every requirement

**Full (spec + quality) review when:**
- The plan is high-level or ambiguous
- The task has multiple interacting requirements that could be partially implemented
- The feature has subtle correctness constraints (security, data integrity)

Either way, the review is a single pass by the lead. Never collapse the loop to skip re-reviewing after a fix.

## Step 4: Fixes

When review finds issues, route the fix back to an implementer with the reviewer findings.

**Claude Code (prefer resume):** Use `Agent(resume: "<agent-id>")` with the prompt from `./fix-prompt.md`. The resumed subagent keeps its orientation context — files read, decisions made, tests written — and goes straight to the fix instead of re-reading the codebase.

**opencode (dispatch fresh with context):** The Task tool doesn't expose persistent resume. Dispatch a fresh implementer via the Task tool (or @mention `general`) using `./fix-prompt.md` plus:
- The original task text
- A pointer to the commit(s) the prior implementer produced (so the fresh subagent can `git show` or read the files instead of rediscovering them)
- The reviewer findings

Either way, re-review after the fix. Iteration cap applies: 3 resume-or-fresh-dispatch attempts, then a 4th attempt with reframed context, then flag-and-continue (see "Review cap" in Step 3).

**When to dispatch fresh on Claude Code:** the subagent is unreachable (session error, context limit), the prior implementer's context is genuinely stale (another task modified the same files), or the fix needs a fundamentally different approach.

## Step 4a: Pre-merge external review (if chosen)

If the reviewer choice propagated from `writing-plans` (via the plan-approval message) is `codex`, `gemini`, or `claude`, invoke `razorback:pre-merge-review`, passing:

- plan path
- reviewer choice
- project test command

If the choice is `none` (or absent), skip Step 4a.

Pre-merge-review builds the full branch diff, dispatches the chosen reviewer in adversarial read-only mode, classifies findings (real-bug / real-improvement / false-positive / out-of-scope), dispatches fresh implementer subagents for verified fixes, re-runs the test suite, and emits a summary block for the morning report. Single pass — no round-two review.

After `pre-merge-review` returns, proceed to Step 5 (Complete → `razorback:finishing-a-development-branch`).

## Step 5: Complete

When all tasks are approved and marked complete:

1. **Final verification:** Run the full test suite and check for integration issues across tasks.
2. **Finish:** Use `razorback:finishing-a-development-branch`.

## Blockers

The authoritative taxonomy is `skills/using-razorback/references/blocker-taxonomy.md`. Consult it before stopping.

**Bias rules:**
- When in doubt, press on and flag. A line in the morning report is cheaper than a false wake-up.
- Never silently swallow a judgment call. Every non-obvious decision ends up in the report with file:line + reason.

**Real blockers (stop and report):**
1. Credentials / auth / env broken, with no recovery path in the plan
2. Destructive action not authorized by the plan
3. Plan-contradicting data (codebase reality invalidates a load-bearing assumption)
4. Safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer
5. Unresolvable test failures (repeated fix attempts do not converge)

Anything else: pick the plan-consistent option, note the choice in your report, continue. Full definitions in the taxonomy.

## Checkpoints

The lead writes a `goldfish:checkpoint` at four points during the run. This persists phase-level progress and decisions across auto-compaction and session restarts.

1. **Phase boundary** — after each phase of a multi-phase plan: "Phase N of M complete. Decisions: …. Next: Phase N+1."
2. **Pre-review** — before Step 4a begins (if a reviewer was chosen): captures reviewer choice, diff range, verification strategy.
3. **Post-review** — after Step 4a completes: captures findings, classifications, fix commits.
4. **Post-PR** — after `finishing-a-development-branch` creates the PR: final state.

Checkpoint at phase granularity, not per task or per subagent dispatch. Per-task checkpoints are noise; per-phase is enough to recover.

## Recovery

On detecting a resumed run (post-compaction note, mismatch between expected and actual conversation state, or the user says "resume"), the lead follows this fixed orientation sequence before continuing:

1. `goldfish:recall` — retrieve the active brief and recent checkpoints.
2. Read the plan file.
3. Check the TaskList for completed / in-progress / pending tasks.
4. `git log --oneline <base>..HEAD` — verify what is actually committed.
5. Identify the next incomplete task and resume execution.

This sequence runs only on resumed runs. A fresh run dispatches directly into Step 1 (Extract Tasks from the Plan). Subagent IDs from the prior session cannot be resumed post-compaction — treat any needed fix as a fresh dispatch with prior-commit context.

## Prompt Templates

- `./implementer-prompt.md` — Dispatch implementer subagent
- `./fix-prompt.md` — Resume implementer to fix review issues
- `./spec-reviewer-prompt.md` and `./code-quality-reviewer-prompt.md` — Review checklists the lead consults during inline review. Not dispatched as separate subagents; they encode the criteria the lead applies directly.

## Example Workflow

```
You: I'm using Subagent-Driven Development to execute this plan.

[Read plan file once: docs/plans/feature-plan.md]
[get_context("hook installation recovery") for orientation]
[Extract all 5 tasks with full text and context]
[TaskCreate for each task]

--- Task 1: Hook installation script ---

[Dispatch implementer subagent with full task text + context + Julie directives]
[Save agent ID: impl-a1b2]

Implementer (impl-a1b2): "Before I begin — should the hook be installed at user or system level?"

You: "User level (~/.config/razorback/hooks/)."

Implementer: "Got it. Implementing now..."
[Later] Implementer reports:
  - Implemented install-hook command
  - Added tests, 5/5 passing
  - Committed (SHA abc123)
  Status: DONE

[Lead inline review]
[get_symbols on install-hook.ts to scan structure]
[deep_dive on installHook() to check flow]
[Spec check: all requirements met, nothing extra]
[Quality check: clean, well-tested, no smells]
[Approved — TaskUpdate task 1 completed]

--- Task 2: Recovery modes ---

[Dispatch implementer subagent. Save agent ID: impl-c3d4]
Implementer: [No questions, proceeds]
Implementer reports:
  - Added verify/repair modes
  - 8/8 tests passing
  - Committed (SHA def456)
  Status: DONE

[Lead inline review]
[get_symbols on recovery.ts]
[deep_dive on verifyMode(), repairMode()]
[Spec check: MISSING — progress reporting ("report every 100 items")]
[Spec check: EXTRA — --json flag not requested]
[Quality check: magic number 100 hard-coded]

[Resume impl-c3d4 with ./fix-prompt.md:]
  "Three issues:
   1. Spec: add progress reporting every 100 items (missing)
   2. Spec: remove --json flag (not requested)
   3. Quality: extract 100 into a PROGRESS_INTERVAL constant"

Implementer (resumed): Progress reporting added, --json removed,
  PROGRESS_INTERVAL extracted. Tests still passing. Committed (SHA ghi789).

[Lead re-review]
[Approved — TaskUpdate task 2 completed]

--- ...remaining tasks follow the same pattern... ---

[After all tasks complete]
[Lead final verification: full test suite, integration check]
[All green]
[Use razorback:finishing-a-development-branch]

Done.
```

## Advantages

**vs. Manual execution:**
- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Subagent can ask questions (before AND during work)

**vs. Executing Plans:**
- Same session (no handoff)
- Continuous progress (no waiting)
- Review checkpoints automatic

**Efficiency gains:**
- Lead curates exactly what context each subagent needs
- No file reading overhead inside the subagent (lead provides full text)
- Questions surface before work begins (not after)
- Julie tools replace Glob/Grep/Read chains (2-3 calls vs 5-8 for orientation)
- Inline review by lead avoids spawning reviewer subagents (lower total token cost)

**Quality gates:**
- Inline review catches spec + quality issues in one pass
- On Claude Code, resume-for-fix preserves the implementer's context; on opencode, fix-dispatch includes prior commits as context
- Re-review loop ensures fixes actually work

**Cost:**
- Subagent invocations scale with plan complexity (one implementer per task, plus fix rounds)
- Lead does more prep (extracting tasks, curating context, reviewing inline)
- Catches issues early — cheaper than debugging later

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Skip inline review (it consistently catches real issues)
- Proceed to the next task while any review has open issues
- Dispatch parallel implementer subagents on overlapping files (conflicts)
- Make the subagent read the plan file (provide the full task text instead)
- Skip scene-setting context (the subagent needs to know where the task fits)
- Ignore subagent questions (answer before letting them proceed)
- Skip the re-review after a fix
- Dispatch a separate reviewer subagent when the lead can review inline
- **On Claude Code, prefer resume for iterations 1-3** (the implementer has full context). Use fresh-dispatch-with-reframed-context for iteration 4 only, after 3 resume attempts failed. The 4th attempt's value is the reframing, not the freshness.
- Never pause for user input between tasks — the plan is approved, run it to completion. Stops are governed by the blocker taxonomy.

**If the subagent asks questions:**
- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation

**If review finds issues:**
- Claude Code: resume the implementer subagent with `./fix-prompt.md` + reviewer findings
- opencode: dispatch a fresh implementer with `./fix-prompt.md` + reviewer findings + pointer to prior commits
- Re-review after the fix
- Iteration cap: 3 resume-or-fresh-dispatch attempts → 4th attempt with reframed-context (see `./fix-prompt.md`) → flag the task in the morning report and continue with remaining tasks. Escalate to the user only for blocker taxonomy #5.

## Integration

**Required workflow skills:**
- **razorback:using-git-worktrees** — Set up isolated workspace before starting. Skip only with explicit user consent (small, single-session work where a feature branch is sufficient).
- **razorback:writing-plans** — Creates the plan this skill executes
- **razorback:requesting-code-review** — Review criteria the lead applies during inline review
- **razorback:finishing-a-development-branch** — Complete development after all tasks

**Subagents should follow:**
- **razorback:test-driven-development** — TDD for each task (embedded in the implementer prompt)

**Alternative workflows:**
- **razorback:team-driven-development** — Alternative for Claude Code (Agent Teams instead of sequential subagents)
- **razorback:executing-plans** — Use for parallel-session or single-agent execution
