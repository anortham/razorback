---
name: subagent-driven-development
description: Use when an approved implementation plan has independent tasks that can run in parallel, or tasks whose separate context has a clear benefit, and the harness can launch subagents.
---

# Subagent-Driven Development

Fresh subagent per delegated task. Lead reviews inline (spec + quality). Independent tasks fan out in parallel; dependent tasks run serialized. Commit mode decides who commits.

Dispatch, follow-up, and wait tool names per harness: read `references/harness-dispatch.md` before the first dispatch. Explicit Cursor/Composer delegation from another harness goes through `razorback:cursor-agent`; this lead still owns review and verification. Use the harness default model unless the user, environment, or lead selects another.

## When to Use

- One coherent task → the current agent does it: directly, or with `razorback:executing-plans` when a plan file exists. No worker.
- Plan, but no delegation or explicitly selected single-agent → `razorback:executing-plans`.
- Plan with independent tasks, or tasks whose separate context has a clear benefit (a large unfamiliar area, a context the lead should not fill), and delegation is available and permitted → this skill. 2+ independent tasks → parallel batches; a dependent task that still benefits from a separate context → a serialized lane.

## Step 1: Extract Tasks from the Plan

1. Read the plan once. `TaskCreate` per task. If the plan names a Spec, read that too: the spec is the authority the plan argues from, and conflicts inside the plan resolve against it. A plan with no reachable spec gets a ledger note saying so — rulings made without one are provisional.
2. Read the ledger: `ws=$("$SKILL_DIR/scripts/sdd-workspace" PLAN_FILE); cat "$ws/progress.md"`. Trust it only when its first line names this plan file; any other ledger (or a stray one at the old flat path) is another plan's — leave it, start fresh.
3. Tasks marked complete **with a named commit** are DONE (verify with `git log`). A completion line whose SHA is missing, `pending`, or absent from `git log` is **INCOMPLETE** — the `parallel-lead-commit` crash window: `git status`, inspect the task's owned files, then re-review and commit the approved edits (Commit Mode Contract) or re-dispatch.
4. Orient with code-kb: `codebase_outline` on the plan's areas; `file_skeleton` on the files the plan modifies so review can spot drift. No Glob/Grep/Read chains.
5. Validate the plan's `## Parallel Execution Contract`: a safe batch with 2+ eligible tasks dispatches together. Safe = non-overlapping file ownership, no ordering dependency, `Serialization required: No`. Serialized lanes need `Serialization required: Yes` plus a `Dependency reason`. Serializing a safe batch requires a recorded dependency or tool limitation — caution is not one.
6. **Pre-dispatch conflict scan:** Before dispatching Task 1, scan the plan once for conflicts (tasks that contradict each other or the plan's Global Constraints; requirements treated as defects; self-contradictions). The scan's output is a table, not a verdict: one row for every pair of tasks that share a file or an interface (what one produces against what the other consumes, and what you found), and one row for every task checking its own internal agreement (tests specified against code specified, files created vs touched). Write the table to the ledger. Rule on every conflict found before execution begins (the spec is the binding authority, the plan is its argument) and record each ruling in the ledger beside its row.


## Step 2: Dispatch Implementer Subagent

Template: `./implementer-prompt.md`. Record `BASE=$(git rev-parse HEAD)` first; review packages and fix diffs build from this BASE, never `HEAD~1`. Save the agent ID every dispatch returns.

**The brief file is the single source of task requirements.** Task text and every exact value live only in `task-N-brief.md`, never in the spawn prompt, which introduces the brief path as "read this first — it is your requirements, with the exact values to use verbatim".

Prompt-resident (the template's sections): scene-setting; earlier-task interfaces and lead ambiguity resolutions (never prior-task summaries); file ownership; code-kb directives and evidence requirement; API-shape evidence requirement; gate invariant requirement; TDD (`razorback:test-driven-development`); verification scope; commit mode; architecture-quality context (approved architecture, any `No Architecture Impact` note, the plan mismatch rule); report path under `.razorback/sdd/<plan-key>/` (the worker returns only status, commits, test summary, concerns).

**Verification scopes** (`references/verification-scopes.md`, read before the first dispatch): workers run `worker-red-green` / `worker-ceiling`; the lead owns `affected-change`, `branch-gate`, `expensive-specialist` and the verification ledger. A passing ledger entry for the same HEAD and scope is reusable.

### Commit Mode Contract

Every dispatch copies one mode into the worker prompt; fix rounds keep it.

- `serial-worker-commit`: single-threaded lane. After assigned verification passes, the worker writes a Goldfish checkpoint before the commit, stages that artifact with only its owned files, commits.
- `parallel-lead-commit`: safe batch of 2+. The worker edits owned files, writes the report, runs no `git add`/`git commit`. The lead stages and commits after inline review.

Local commits in both modes are authorized by the approved scope. If a user or host instruction prohibits commits, preserve the reviewed diff and report that approval boundary; never fabricate a completion SHA.

**Lead staging (`parallel-lead-commit`):** tick the task's acceptance-criteria checkboxes, then the lead writes a Goldfish checkpoint before the commit. Explicitly stage the checkpoint artifact with the reviewed task's owned files plus the plan file — `git add <checkpoint> <owned paths> <plan file>` — then commit. Never `git add -A`, `git add .`, or `git commit -a`: sibling workers hold unreviewed in-flight edits.

**Commit before you record:** commit first, then write the durable-progress line with the real commit SHA. A completion record without a verifiable commit strands work in the crash window.

## File Handoffs

Scripts live in this skill's `scripts/` (`"$SKILL_DIR/scripts/…"`), not the target repo. `task-brief PLAN_FILE N` writes `task-N-brief.md` under the plan's workspace and prints the path. The worker writes `task-N-report.md` beside it; fix rounds append. `review-package PLAN_FILE BASE HEAD` builds a focused diff for the lead; no reviewer subagents.

## Durable Progress

Workspace: `"$SKILL_DIR/scripts/sdd-workspace" PLAN_FILE` prints `<repo-root>/.razorback/sdd/<plan-key>/` (git-ignored; other plans' directories are never yours; a stray `.razorback/sdd/progress.md` is another plan's). Ledger `<workspace>/progress.md`, first line `# Razorback SDD ledger — plan: <plan file path>`, lines:

- `Task N: complete (commits <base7>..<head7>, Lead inline review clean)` — serial, after the worker commit.
- `Task N: complete (parallel-lead-commit, Lead inline review clean, lead commit <sha7>)` — the lead commits first, then records the SHA.
- `Task N: fix round <R> (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)` (`commits none - parallel-lead-commit` in that mode).
- `Task N: minor (deferred): <one-liner>`; non-Minor out-of-diff observations: `Task N: deferred (<Important|Critical>): <one-liner>`.
- `Task N: cap ruling (<contested|real-but-deferred|load-bearing-stop>): <finding> — <reason>`.

`git clean -fdx` deletes the ledger; recover from `git log` and plan checkboxes.

### Parallel Dispatch (Independent Tasks)

One call per task in a single turn; file ownership per subagent. Coupled tasks (same files, shared state, ordering) run one at a time with the `Dependency reason` recorded. Review each task inline as it returns; never batch reviews. After a completed batch of file writes, run `code-kb scan` before the next dispatch.

### Batch Small Same-Shape Work

When the plan lists several tasks that are each a small, independent edit of the same kind — the same one-line fix, constant change, or field addition repeated across files — do not dispatch one subagent per task. Compose ONE dispatch brief listing every file and its change, send the whole batch to a single subagent, and review its diff as one unit. Reserve one-dispatch-per-task for work that needs its own judgment, its own tests, or its own review surface.


## Step 3: Lead Inline Review

One pass by the lead. No reviewer subagents. Checklists: `./spec-reviewer-prompt.md`, `./code-quality-reviewer-prompt.md`.

**Spec:** everything requested, nothing extra, no misread requirement. Scan changed files with code-kb `file_skeleton`. The report must show code-kb-first orientation and API-shape evidence for every symbol, signature, config shape, route, CLI flag, or public contract — a guessed shape goes back.

**architecture-quality:** the worker preserved the approved architecture or reported a plan mismatch; reject worker-local redesigns not in the plan.
- Does this keep complexity local?
- Is the caller-facing interface smaller than the behavior it unlocks?
- Are tests written through the same interface callers use?
- Did new seams earn their keep?
- Did this avoid speculative extensibility?
- Did it fix the structural cause, not only the symptom?

**Quality:** tests assert meaningful values; no duplication, tight coupling, unclear names, missing error paths. code-kb `get_symbol_context` on key symbols (`get_symbol_body` for the task's core), `find_references` on changed APIs. Do not ask a reviewer or yourself to re-run tests the implementer already ran on the same code — the implementer's report carries the test evidence. Reviewers will not re-run tests for you; if evidence is missing or illegible, re-read the report or bounce it back to the worker to provide pristine test output rather than rerunning full test suites. Concrete plans get a quality-focused pass; ambiguous or safety-sensitive tasks get the full pass.

**Severity:** only Critical and Important enter the fix loop (Step 4). Minor → `minor (deferred)` ledger line for Step 4a.

**Review cap: 3 iterations.** If the 3rd still fails: (1) dispatch a fresh implementer with reframed context (`./fix-prompt.md`, "Reframed-Context Attempt") — the 4th attempt's value is the reframing; skip it if no honest reframe exists; (2) if that fails, adjudicate.

**Cap adjudication** (only at the cap). Rule each open finding: **Contested** (wrong or not required by the plan) or **Real but deferred** (no later task builds on it) → record, continue; **Real and load-bearing** (later tasks depend on it) → stop per blocker taxonomy #5. Every ruling is a ledger line and appears in the morning report's "Blockers hit"; an unruled open finding is a broken run.

**Approved:** `parallel-lead-commit` → lead stages and commits per the Commit Mode Contract. Either mode → `TaskUpdate` complete and move on; bookkeeping, not a stop.

## Step 4: Fixes

Send `./fix-prompt.md` with the findings to the saved implementer via the harness follow-up path (`references/harness-dispatch.md`); it keeps its orientation context. Iterations 1-3 preserve context; the 4th attempt is a fresh reframed dispatch with the prior-commit pointer.

### Scoped Re-Review

1. Gate the fix report: covering tests, exact command, output. Missing evidence bounces the report; that is not a fix iteration.
2. `"$SKILL_DIR/scripts/review-package" PLAN_FILE FIX_BASE HEAD` (FIX_BASE = the head the previous review saw).
3. Verdict every prior finding ADDRESSED or NOT ADDRESSED with file:line. "Attempted" is not ADDRESSED.
4. Inspect only the fix diff for new breakage.
5. Observations outside the fix diff never extend the loop: ledger them at observed severity; Critical/Important go to cap adjudication; a blocker-taxonomy match stops the run.
6. Write the fix-round ledger line.

### Review Campaign Boundary

The routine scoped fix review here does not start a review campaign: three context-preserving attempts plus the optional reframed 4th attempt, each with lead-only scoped re-review. If a review reopens broad discovery or dispatches an external reviewer, invoke `razorback:managing-review-campaigns` first: one immutable campaign setup, count every external CLI call, close on terminal status.

## Step 4a: Pre-merge external review (if chosen)

Reviewer choice `codex` or `claude`: ensure the ledger has a passing `branch-gate` for the current HEAD (run it now if not), then invoke `razorback:pre-merge-review` with the plan path, reviewer choice, verification strategy, verification ledger, and the ledger's deferred lines. `none` skips this step. Pre-merge-review owns the bounded campaign — one general pass plus one security pass, classification, fix dispatch, verification, the terminal `REVIEW CAMPAIGN STATUS` block; fixes verify locally with no post-fix external re-review. Then Step 5.

## Step 5: Complete

1. **Final verification:** `branch-gate` (or a passing ledger entry for this HEAD) plus required `expensive-specialist` scopes. Branch-gate includes the plan's declared Security scope commands (`security-secrets`, `security-deps` — `razorback:security-review`); `none declared` skips them and is rendered in the morning report.
2. **Reconcile source-control state:** Check B of `razorback:using-razorback` `references/source-control-hygiene.md`. Status every worktree this run or a subagent created and every branch produced. Land stranded commits here (re-run branch-gate) or carry them as named morning-report items.
3. **Collect rulings:** Before deleting the workspace, collect every ledger line containing `Ruling:` — preflight rulings, parked findings, breaker adjudications — into the final message under "Rulings I made", in the order made, each with what it costs if wrong.
4. **Clean up:** re-resolve the workspace with `"$SKILL_DIR/scripts/sdd-workspace" PLAN_FILE` immediately before `rm -rf <printed path>`. Never delete a remembered path or sibling plan directories.
5. `razorback:finishing-a-development-branch`.

## Blockers

The authoritative taxonomy is the `razorback:using-razorback` skill's `references/blocker-taxonomy.md`. Consult it before stopping.

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

In addition to mandatory pre-commit checkpoints, the lead writes a `goldfish:checkpoint` at four phase/review milestones during the run. This persists progress and decisions across auto-compaction and session restarts.

1. **Phase boundary** — after each phase of a multi-phase plan: "Phase N of M complete. Decisions: …. Next: Phase N+1." Record the phase's branch and worktree path. A multi-phase plan runs in one worktree by default; a phase that opens its own worktree runs Step 0b of `razorback:using-git-worktrees` first.
2. **Pre-review** — before Step 4a begins (if a reviewer was chosen): reviewer choice, diff range, verification strategy, and the immutable REVIEW CAMPAIGN setup and current counters.
3. **Post-review** — after Step 4a completes: findings, classifications, fix commits, and the terminal `REVIEW CAMPAIGN STATUS` block.
4. **PR-URL commit checkpoint** — inside `finishing-a-development-branch` Step 7, after the PR exists and before its PR-URL metadata commit; do not emit a duplicate checkpoint after finishing returns.

Checkpoint before each commit and explicitly stage the checkpoint artifact with that commit. In `serial-worker-commit` the worker checkpoints before committing. In `parallel-lead-commit` workers neither checkpoint nor commit; the lead checkpoints before each reviewed lead commit. One pre-commit checkpoint per actual commit.

Phase-level checkpoints remain useful in addition to mandatory pre-commit checkpoints. Never create a checkpoint-only follow-up commit; it would need another checkpoint and recurse.

A checkpoint is a fast, non-blocking memory write — never a stop, a review gate, or a reason to ask the user anything. A phase boundary is a checkpoint trigger, not a stop: finishing a phase never means pausing for confirmation. Write it and immediately continue.

## Recovery

On detecting a resumed run (post-compaction note, mismatch between expected and actual conversation state, or the user says "resume"), the lead follows this fixed orientation sequence before continuing:

1. `goldfish:recall` — retrieve the active brief and recent checkpoints.
2. Restore any immutable REVIEW CAMPAIGN setup and current counters from the checkpoint. Counters only increase; participants and budgets never change after resume.
3. If recalled `REVIEW CAMPAIGN STATUS` contains `campaign_closed: yes`, treat it as terminal and do not dispatch another reviewer, even when the state is `capped` or `blocked`.
4. Read the plan file, noting which acceptance-criteria checkboxes are already `[x]`.
5. Check the TaskList for completed / in-progress / pending tasks.
6. `git log --oneline <base>..HEAD` — verify what is actually committed.
7. Reconcile `parallel-lead-commit` gaps: re-read this plan's ledger and run Step 1's completion-line check — a missing, `pending`, or unverifiable SHA means inspect the owned files, then commit approved edits per the Commit Mode Contract or re-dispatch. Do not trust a completion record that has no verifiable commit.
8. Identify the next incomplete task and resume execution.

This sequence runs only on resumed runs. A fresh run enters at Step 1. Subagent IDs from the prior session cannot be resumed post-compaction — treat any needed fix as a fresh dispatch with prior-commit context.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "This batch looks safe, but serialize to be careful" | Serializing a safe batch requires a recorded dependency or tool limitation. Caution is not one. |
| "`git add -A` just this once — the tree looks clean" | Sibling workers may hold unreviewed in-flight edits. Stage owned files plus the plan file, nothing else. |
| "Record the task complete now, commit in a moment" | A completion record without a verifiable SHA strands work in the crash window. Commit first, then record. |
| "The fix is close — one more round past the cap" | Three attempts, then the reframed 4th, then adjudication. The cap is the mechanism, not a suggestion. |
| "The worker's diff looks fine, skip the re-review" | Every fix gets a scoped re-review. "Attempted" is not ADDRESSED. |
| "The implementer spawned its own reviewer — free extra assurance" | It's a duplicate seat reviewing the same diff; the lead's inline review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Skip inline review (it consistently catches real issues)
- Proceed to the next task while any review has open issues
- Dispatch parallel implementer subagents on overlapping files (conflicts)
- Let parallel-batch workers race on `git add` or `git commit`
- Stage a `parallel-lead-commit` task outside the Commit Mode Contract's lead-staging rule
- Record a `parallel-lead-commit` task complete before its lead commit exists, or write its progress line without the real commit SHA
- Make the subagent read the plan file, or paste task text and exact values into the dispatch prompt (point the worker at its task brief — Step 2)
- Skip scene-setting context (the subagent needs to know where the task fits)
- Ignore subagent questions (answer before letting them proceed)
- Skip the re-review after a fix
- Extend the fix loop with Minor findings or with observations outside the fix diff — both go to the deferred list
- Close an open finding at the cap without a recorded ruling
- Dispatch a separate reviewer subagent when the lead can review inline
- Approve work from an implementer who cannot show code-kb-first orientation
- Open a new phase worktree without running the Step 0b inventory against the prior phase's
- Reach Step 5 without statusing every worktree the run created (Check B)
- Pause for user input between tasks - the plan is approved, run it to completion. Stops are governed by the blocker taxonomy. If you can reason through a plan-consistent path, keep moving and log the choice.

## Integration

`razorback:using-git-worktrees` first (Step 0b inventories outstanding worktrees; `source-control-hygiene.md` Check A before creating one, Check B before Step 5). `razorback:writing-plans` produces the plan; `razorback:requesting-code-review` supplies inline review criteria; `razorback:finishing-a-development-branch` finishes. `razorback:executing-plans` covers single-agent or no-delegation runs.
