---
name: writing-plans
description: Use when work needs a written plan file - a handoff to another session or agent, a multi-session effort, or parallel work that needs file ownership and ordering - before touching code. Not for one coherent task the current agent can finish.
---

# Writing Plans

**Announce:** "I'm using the writing-plans skill to create the implementation plan."

Run in the task worktree razorback:brainstorming created; if not in one, run razorback:using-git-worktrees first. Save to `docs/plans/YYYY-MM-DD-<feature-name>.md`. Copy the plan header, Verification Strategy, Parallel Execution Contract, and task templates from `task-templates.md` (this directory).

**Not for:** one coherent task the current agent can finish in this session (do it directly; the design in chat or the user's request is the plan) or a small local defect (razorback:fixing-small-issues).

## When to Write a Plan File

Write a plan file only when it carries information across a boundary:

- **Handoff:** another session, agent, or person executes the work.
- **Multi-session:** the work will not finish in this session, and the next session needs the decisions.
- **Coordination:** parallel workers need file ownership, ordering, and shared contracts.

Otherwise, do the work directly. A task list in the harness is enough to track steps.

After approval, razorback runs to completion and stops only for real blockers (`razorback:using-razorback` skill's `references/blocker-taxonomy.md`).

## Plan Depth

| | Full plan | Light plan |
|---|---|---|
| Use for | Async handoffs, no-delegation runs, multi-session or unfamiliar work | Same-session execution by dispatched subagents via `subagent-driven-development` |
| Tasks | Step-by-step TDD (write test → verify fail → implement → verify pass → apply commit mode), one action per step, exact commands with expected output | What to build, exact files, approach notes, acceptance criteria; the implementer reads code with code-kb and follows TDD |

Both depths describe outcomes, constraints, ownership, and checks. Neither prewrites the implementation: include code only for an exact contract, schema, migration, or string the implementer must not vary. The implementer writes the code with TDD.

## Before Writing

1. **Scope check:** a spec covering several independent subsystems becomes one plan per subsystem, each producing working software alone.
2. **Read the code the plan touches:** file reads and searches, or code-kb (`codebase_outline`, `get_symbol_context`, `blast_radius` for likely tests, `find_references` before changing a public API). Do NOT guess file paths, line numbers, symbol names, function signatures, config shapes, route names, CLI flags, or public contracts.
3. **External API staleness:** where training knowledge may be stale, apply razorback:grounding-in-current-docs and record the verified surface or doc URL in the task.
4. **File structure:** map created and modified files, one responsibility each. Follow existing patterns; split an unwieldy file only when the plan already modifies it.

## Task Slicing

- **Vertical slices by default:** one thin observable behavior end to end per task (query + endpoint + UI + test). Horizontal layers only when shared by several later slices or when a contract must lock before parallel fan-out. Riskiest task first.
- **Keep it compilable:** every task ends with the repo building and worker-scope verification green, then the worker commits (`serial-worker-commit`) or hands the diff to the lead for staging and commit after inline review (`parallel-lead-commit`).
- **Rollback-friendly order:** a partially executed plan leaves the branch shippable or cleanly revertible.
- **Slices are not stop points:** continue; stops come only from the blocker taxonomy and the final PR.
- **No placeholders:** "TBD", "implement later", "add appropriate error handling", "write tests for the above" without naming the behavior each test proves, "similar to Task N" (state the outcome) are plan failures.

## Global Constraints

Required before the task list: requirements that bind every task (version floors, dependency limits, naming and copy rules, platform support, exact strings and formats, "same layout as X"). Copy exact values verbatim from the spec; tasks do not repeat them.

## Architecture Quality

Non-mechanical plans record the approved module/interface shape and the main architecture risk in the header's `Architecture Quality` field. Mechanical plans write `No Architecture Impact`. If code reality contradicts the approved shape, the worker reports a plan mismatch instead of redesigning locally.

## Spec Pointer

**Spec:** Every plan header points to the spec or design doc this plan implements (`**Spec:** [path to the spec/design doc this plan implements]`). The plan argues from the spec, so the spec travels with it; executors read both so ambiguities and conflicts inside the plan resolve against the binding spec. A plan with no reachable spec gets a ledger note saying so — rulings made without one are provisional.


## Verification Strategy

Required. Razorback owns scope boundaries; the target repo owns commands. Never bake language or test-runner commands into razorback skills. If the repo has no documented hierarchy, define one with the neutral labels **worker**, **affected-change**, **branch**, **expensive**.

The security field is never left blank:

```markdown
**Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]
```

`razorback:finishing-a-development-branch` renders `none declared` in the morning report; `razorback:security-review` defines `security-secrets` and `security-deps`.

## Parallel Execution Contract

Required between `## Verification Strategy` and the task list; the lead's dispatch contract. Per task: `Parallel batch` (a shared label only when tasks dispatch together without file or ordering conflicts), `File ownership` (exact; "same area" is not a proxy), `Serialization required` (`Yes` only for a real dependency or tool limitation), `Dependency reason` (mandatory: the blocking dependency, `None - safe parallel batch.`, or `Not applicable - single task.`).

Commit mode: `serial-worker-commit` = after assigned verification passes, the worker commits its owned files and records the SHA. `parallel-lead-commit` = the worker hands the verified diff to the lead, who stages and commits after inline review.

## Task Structure

Both plan types share the header block — Files, Interfaces, **Contract inputs:**, **File ownership:**, **Serialization required:**, **Dependency reason:** — then diverge: full tasks choreograph TDD (test code, verify-fail run, implementation code, verify-pass run, "Apply commit mode"); light tasks give **What to build** and **Approach**. Every task ends with tickable `- [ ]` acceptance criteria; execution flips them to `[x]`.

Always: exact file paths; reference skills as `razorback:<name>` (never `@` links, which force-load content); DRY, YAGNI, TDD.

## Compact Single-Task Full-Plan Form

When a full plan has exactly one task, use the full-plan task template unchanged. Only two things differ:

- Collapse `## Parallel Execution Contract` to one row: `Parallel batch` is `None - serial`, `File ownership` carries the task's exact ownership, and both `Serialization required` and `Dependency reason` read `Not applicable - single task.`
- In the task body, **Contract inputs:** and **File ownership:** carry their normal exact values, while **Serialization required:** and **Dependency reason:** both read `Not applicable - single task.`

## Plan Self-Review

1. Placeholder scan: TODOs, "TBD", steps too vague to act on.
2. Spec alignment: every requirement covered, no scope creep.
3. Task decomposition: clear boundaries, actionable steps, correct dependency order.
4. Buildability: every path and symbol is real — check it in current source (a file read, or code-kb `lookup_symbol(query='<symbol>')`). Fix any invented API.

Fix inline. If the session can dispatch subagents, you may instead dispatch a reviewer with `plan-document-reviewer-prompt.md` (this directory).

## Execution Handoff

1. **Announce and request approval.** The plan's visual digest (`<plan>.html`, sibling basename, composed per the `razorback:using-razorback` skill's `references/digest-kit.md`) is opt-in: write it only when the user asked for a digest in this session or in project instructions; never unprompted. Announce: **"Plan saved to `<path>`. Please review it and reply **approved** (with optional reviewer choice, e.g. 'approved, codex review'; omit reviewer choice for no external review) or request changes."** When a digest was requested, add "with a visual digest at `<plan>.html`".
2. **Wait for explicit approval.** Silence, hedges ("looks ok"), questions, or partial feedback do not unblock; only "approved", "yes, go", "run it", or equivalent does. On change requests: revise, re-run the self-review, re-save, re-ask. This is the last human stop before autonomous local execution. **Exception:** when the user already authorized the work and the plan adds no consequential choice they have not made, record that authorization in the plan and proceed without a second approval round.
3. **Record authority.** Implementation approval does not imply publication authority. Record sources already granted in the conversation or project instructions:
   - `local_commit_authority: authorized — <implementation request/repo instruction>`
   - `push_authority: authorized | missing — <user/repo instruction>`
   - `pr_authority: authorized | missing — <user/repo instruction>`

   Local commits are authorized by the approved scope unless a user or host instruction prohibits them; a prohibition uses the approval/blocker boundary once the local diff and review materials are ready. Do not ask for missing push or PR authority here; `razorback:finishing-a-development-branch` asks once, later. Never infer push or PR authority from "implement it", plan approval, or permission to commit.
4. **Capture the reviewer choice without prompting.** The default reviewer choice is `none`; set `codex` or `claude` only when the approval message or the saved spec named it. If project instructions declare an `## External model policy` block, the reviewer must appear in `Reviewer choices permitted:`; if not, surface the conflict now (`razorback:security-review` defines the block).
5. **Invoke the execution skill immediately**, passing the plan path, reviewer choice, authority ledger, and verification strategy:
   - Independent tasks, or tasks whose separate context has a clear benefit, and delegation is available and permitted → `razorback:subagent-driven-development`.
   - Otherwise (one coherent task, dependent tasks, no delegation, or single-agent execution selected) → `razorback:executing-plans`; the current agent runs the plan.

   If the user requested a separate-session handoff before approval, tell them to open a new session in the worktree and use `razorback:executing-plans` there.

## It's working if

- Every path, symbol, and command in the plan came from current source or the repo's docs, never from memory.
- Each task ends compilable, with tickable acceptance criteria and exact file ownership.
- The plan file existed because of a handoff, a multi-session effort, or a coordination need.
- The plan described outcomes and checks, not prewritten implementation code.
- The self-review ran before the approval ask, and execution started only after an explicit "approved" or a recorded prior authorization.
