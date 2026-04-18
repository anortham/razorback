# Autonomous Execution by Default — Design

**Date:** 2026-04-18
**Status:** Approved for plan writing
**Motivation:** Approved plans should run to completion without interactive gates. Razorback already invests heavily in spec + plan review; once those are approved, the process should execute overnight without waking the user for anything short of a real blocker.

---

## 1. Philosophy shift

Razorback's execution path currently pauses at task boundaries, plan-save, review thresholds, and the finish step. Each pause exists in case the user wants to redirect. In practice, the user has already agreed to the direction when approving the plan. The pauses have become false-wake sources.

**New stance:** brainstorming and writing-plans are the gates. Once the plan is approved, the execution skills (`writing-plans` handoff, `team-driven-development`, `subagent-driven-development`, `executing-plans`, `finishing-a-development-branch`) run end-to-end without re-prompting. The only stops are:

1. A blocker matching the taxonomy in §2
2. The final stop-before-merge: the run terminates after creating a PR; merge happens on the user's schedule

There is no "autonomous mode" flag. This is how razorback works.

---

## 2. Blocker taxonomy

**A real blocker (stop and report):**

1. **Credentials / auth / env broken** — a required command fails on environmental grounds (missing token, unreachable service, wrong toolchain version) and the plan doesn't say how to recover.
2. **Destructive action not authorized by the plan** — deleting data, force-pushing, dropping tables, running a migration in prod, or any irreversible action outside the plan's explicit scope.
3. **Plan-contradicting data** — codebase reality contradicts a load-bearing plan assumption in a way that invalidates the approach (e.g. plan says "modify X", but X was replaced last week and the plan's strategy no longer applies).
4. **Safety-critical ambiguity** — two plausible interpretations with non-trivial cost if chosen wrong (security boundary, data integrity, billing, auth flow), AND the plan doesn't disambiguate.
5. **Unresolvable test failures** — repeated fix attempts do not converge, the failure is not explained by a plan-level issue the agent can flag-and-skip, and no further strategy is available.

**Not a blocker (decide + log in the morning report):**

- Naming, style, or minor design choices
- A detail the plan doesn't spell out but has an obvious plan-consistent answer
- Non-safety-critical ambiguity — pick the plan-consistent option
- A failing review iteration — retry with reframed context; if still failing, flag the task and continue with others
- An adjacent bug on the path — fix if small, flag if not
- An external reviewer finding the lead judges as false positive — dismiss with reason in the report

**Two bias rules:**

- **When in doubt, press on and flag.** A line in the morning report is always cheaper than a false wake-up.
- **Never silently swallow a judgment call.** Every non-obvious decision ends up in the report with file:line + reason.

---

## 3. Stop-point changes per skill

### 3.1 `writing-plans`

**Current:** ends with an "Execution Handoff" prompt offering two options and asking the user to choose.

**New:** after the plan is approved and the reviewer choice is captured (see §4), `writing-plans` transitions directly into `team-driven-development` (on Claude Code) or `subagent-driven-development` (elsewhere). No handoff question.

The user's approval message can specify the external-review choice inline (e.g. "approved, run it, pre-merge codex review"). Default external-review choice when unspecified: none.

### 3.2 `executing-plans`, `team-driven-development`, `subagent-driven-development`

**Current:** "Stop and Ask for Help" section lists any blocker, unclear instruction, or repeated verification failure as a reason to stop.

**New:** replace with a reference to the §2 blocker taxonomy. Tighten the language to "decide + note" for anything not in the taxonomy. Remove language encouraging the agent to surface questions mid-run.

**Review-iteration cap behavior:**
- Current: 3 iterations → escalate to user.
- New: 3 iterations → dispatch a fresh implementer with reframed context (different file ownership, simpler framing, or explicit disambiguation pulled from the plan). If the fresh attempt still fails, flag the task in the morning report and continue with remaining work. Escalate only if the failure meets §2 (typically only if a whole plan section is blocked, not a single task).

**Between-task behavior:**
- Current: implicit user-confirmation gate after each task.
- New: continue to the next task without pause. No "ready for task 2?" prompts.

**Phase boundaries:**
- After each phase of a multi-phase plan, the lead writes a `goldfish:checkpoint` (see §6) and begins the next phase without user input.

### 3.3 `team-driven-development/implementer-prompt.md` and `subagent-driven-development/implementer-prompt.md`

**Current "Before You Begin" block:**

> If you have questions about:
> - The requirements or acceptance criteria
> - The approach or implementation strategy
> - Dependencies or assumptions
> - Anything unclear in the task description
>
> **Ask them now.** Raise any concerns before starting work.

**New:**

> You are operating inside an approved plan. The plan text in "Task Description" above is the authoritative spec. If something is ambiguous:
>
> 1. Read the plan context to see if it's disambiguated elsewhere.
> 2. Check the surrounding codebase with Julie tools (`get_context`, `deep_dive`, `fast_refs`).
> 3. If still ambiguous, pick the plan-consistent option and note the choice in your report (file:line + reason).
>
> **Only stop and report BLOCKED if** (see blocker taxonomy):
> - Credentials or environment is broken and the plan doesn't say how to recover
> - Your task requires a destructive action not authorized by the plan
> - The code state contradicts a load-bearing plan assumption
> - There's a safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer
>
> Otherwise, make the call, note it, and proceed.

The existing "While you work" line ("It's always OK to pause and clarify") is removed.

### 3.4 `finishing-a-development-branch`

**Current:** always presents a 4-option menu and waits for user input.

**New:** two invocation modes.

- **Autonomous mode (default when called at the tail of an execution skill):** push the branch, create a PR with the morning-report summary, and exit. No menu.
- **Interactive mode (when the user invokes the skill directly, e.g. "finish this branch"):** the 4-option menu still shows. This preserves the skill's utility for ad-hoc cleanup.

Detection: the calling skill passes an invocation-context signal (either via the skill invocation or a convention in the task state). Simplest: a sentence at the top of the skill that says "if you were invoked at the end of `executing-plans` / `team-driven-development` / `subagent-driven-development`, take the PR path without prompting. Otherwise, use the interactive menu."

The PR always targets the base branch. Merge is never auto-performed.

---

## 4. Pre-merge external review

### 4.1 When the choice is made

At plan approval time. The user's approval message can include the reviewer choice. Accepted forms:

- "approved, run it" → no external review
- "approved, pre-merge codex review"
- "approved, pre-merge gemini review"
- "approved, pre-merge claude review"

If the user approves without specifying, the lead asks once (during the approval exchange, before the execution starts — not mid-run): "External review before PR? (none / codex / gemini / claude)". After that single choice, no further prompts.

Multi-reviewer runs (e.g. codex + gemini in parallel) are explicitly out of scope for v1.

### 4.2 Where the review fits

New step between "all tasks complete, tests green" and `finishing-a-development-branch`:

```
All tasks done, internal reviews passed, tests green
    ↓
Pre-merge external review (if chosen)
    1. Build diff: base..HEAD + file summary + plan path
    2. Dispatch reviewer skill in adversarial mode with JSON schema output
    3. Parse findings
    4. Lead verifies each finding:
         - Use deep_dive / fast_refs / get_symbols to check the actual code
         - Classify: real-bug / real-improvement / false-positive / out-of-scope
    5. For verified findings: dispatch fresh implementer subagent per finding
         (or grouped by file if findings cluster) with finding text + file context
    6. Re-run the test suite
    7. Log all findings + classifications + fix commits in morning report
    ↓
finishing-a-development-branch (autonomous mode): push + PR
```

### 4.3 Design rules

- **Single pass.** The external review runs once. No round-2 review after fixes. Leftover verified findings that the lead cannot fix (e.g. architectural concerns requiring user input) are logged in the morning report with "flagged for your review" status and the PR proceeds.
- **Lead verifies, doesn't rubber-stamp.** External reviewers emit noise. Every finding gets a classification with reasoning. Dismissals are logged with the reason so the user can override on PR review.
- **Fresh implementer subagent per fix** (the user's explicit choice). Works at any point in the timeline regardless of team state. Prompt includes the finding, the relevant files with their current state, and the plan context.
- **Read-only reviewer.** The external reviewer never edits code. Fixes are always dispatched through an implementer subagent in razorback's own flow.

### 4.4 Reviewer invocation

Each of codex-cli, gemini-cli, and claude-cli exposes an adversarial-review mode with structured JSON output. The lead calls the appropriate skill with:
- The diff (`base..HEAD`)
- A summary of what shipped (file list + commit messages)
- Optional plan-specific focus (e.g. "focus on the auth boundary" if the plan is an auth change)

Output schema (shared across all three reviewers) reuses codex-cli's existing `schemas/review-output.schema.json`: verdict, summary, findings (severity/file/line/confidence/recommendation), next steps.

---

## 5. `claude-cli` skill (new)

Location: `~/.claude/skills/claude-cli/SKILL.md`.

Mirrors the existing `~/.claude/skills/codex-cli/SKILL.md` structure. Same three modes (second opinion, code review, adversarial review), same JSON schema for adversarial output (shared file copied or referenced from codex-cli's schemas directory).

**Adversarial-review invocation (validated against Claude Code CLI reference):**

```bash
claude -p \
  --bare \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$(cat ~/.claude/skills/claude-cli/schemas/review-output.schema.json)" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model opus \
  --system-prompt-file ~/.claude/skills/claude-cli/adversarial-prompt.txt \
  "$DIFF_AND_CONTEXT"
```

**Flag rationale:**
- `-p`: non-interactive, print-and-exit (parity with `codex exec`)
- `--bare`: skip auto-discovery of hooks, skills, plugins, MCP, CLAUDE.md — gives a truly fresh Claude with no project-level context pollution
- `--no-session-persistence`: ephemeral session (parity with codex's `--ephemeral`)
- `--dangerously-skip-permissions`: required for non-interactive scripted use
- `--output-format json --json-schema ...`: structured review output
- `--tools "Read,Bash"`: read-only — reviewer never edits
- `--max-turns 15 --max-budget-usd 5`: bounded cost/time
- `--model opus`: strongest reviewer
- `--system-prompt-file`: adversarial prompt template (copy of codex-cli's template with tool references adapted)

**Second-opinion mode:** drop `--json-schema`, `--max-turns`, adjust system prompt. Same shape as codex-cli's second-opinion mode.

**Code-review mode (non-adversarial):** same as adversarial but with the standard review prompt instead of the adversarial one.

Critical-evaluation section in the skill: same as codex-cli's — Claude is a peer, not an authority. The lead evaluates, doesn't defer.

---

## 6. Compaction durability

### 6.1 What survives without work

- Plan document (in repo, re-readable)
- Task list (TaskCreate/TaskUpdate state persists through auto-compaction)
- Commits + git log (ground truth for completed work)

### 6.2 What needs explicit checkpointing

- Lead's phase-level decisions and progress reasoning
- Team composition and which teammate owns what (if the team is still alive)
- In-flight external review findings and verification classifications

### 6.3 Checkpoint cadence

The lead writes a `goldfish:checkpoint` at:

1. **Each phase boundary** — "Phase N of M complete. Decisions: …. Next: Phase N+1."
2. **Before external review begins** — captures which reviewer, the diff range, the verification method.
3. **After external review completes** — captures findings, classifications, fixes applied.
4. **After PR creation** — final state.

Not per-task. Per-phase is sufficient and avoids noise.

### 6.4 Recovery sequence

On detecting a resumed run (either post-compaction or session restart), the lead follows a fixed orientation sequence:

1. `goldfish:recall` for the active brief and recent checkpoints
2. Read the plan file
3. Check the TaskList for completed / in-progress / pending
4. `git log --oneline <base>..HEAD` to verify what's actually committed
5. Identify the next incomplete task
6. Resume execution

This sequence is encoded in `team-driven-development` and `subagent-driven-development` as a "Recovery" section. It only activates when the conversation shows signs of compaction (an explicit checkpoint note, a mismatch between expected and actual conversation state, or the user says "resume").

### 6.5 Teammate-side mitigation

Implementer teammates continue to commit once per task (already the convention). A mid-task compaction therefore costs at most one task of re-work. Encourage smaller commits in the plan when feasible.

---

## 7. Morning report

### 7.1 Format

```markdown
# Autonomous Execution Report — [Plan Name]

**Status:** Complete | Blocked | Partial
**Plan:** docs/plans/YYYY-MM-DD-<feature>.md
**Branch:** <branch-name>
**PR:** <URL or "not created (blocked)">
**Duration:** Nh Nm
**Phases:** X/Y complete
**Tasks:** X/Y complete

## What shipped
- [one line per phase or major task]

## Judgment calls (non-blocking decisions made)
- `path/to/file.py:123` — Chose X over Y because [reason].
- `path/to/other.py:45` — Named `foo` instead of `bar` because [reason].
- [continue for every non-obvious decision]

## External review ([reviewer], adversarial)
- **Findings:** N
- **Verified real, fixed:** M (commits: <shas>)
  - [finding 1 summary]
  - [finding 2 summary]
- **Dismissed:** K
  - [finding — reason for dismissal]
- **Flagged for your review:** L
  - [finding — why uncertain]

## Tests
- N passing, 0 failing (or the failure summary if blocked)

## Blockers hit
- [None, or: description + what's needed from you]

## Files changed
- [summary of git diff --stat]

## Next steps
- Review PR: <URL>
- [Specific items flagged for human attention]
```

### 7.2 Where it goes

1. **PR description** — summary sections only (status, what shipped, external review outcome, blockers, next steps). The judgment-calls log is linked, not inlined (links to the file in step 2).
2. **File in the worktree** — full detail at `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, committed with the final PR.
3. **Terminal output** — one-line pointer: `Done. PR: <URL>. Report: <path>.`

If blocked: no PR is created. The report file is still written (same path), and the terminal output describes the blocker and what's needed.

---

## 8. Non-goals (v1)

- **Multi-plan orchestration.** Approving a batch of plans and executing them in sequence is explicitly deferred. v1 handles one multi-phase plan document per run.
- **Multi-reviewer external review.** Running codex + gemini in parallel with deduped findings is a v2 extension.
- **Round-2 external review.** Single pass only.
- **Automatic merge.** The run always stops at "PR created". Merge is a separate human (or another agent's) action.
- **Dynamic reviewer switching.** The reviewer choice is fixed at plan approval time and doesn't change mid-run.

---

## 9. Acceptance criteria

- [ ] `writing-plans` no longer asks "Which approach?" after saving the plan. It either continues to `team-driven-development` / `subagent-driven-development` directly, or (if the execution-time choice wasn't captured) asks a single question: "External review before PR? (none / codex / gemini / claude)."
- [ ] `executing-plans`, `team-driven-development`, and `subagent-driven-development` reference the §2 blocker taxonomy and contain no user-confirmation gates between tasks or phases.
- [ ] Both `implementer-prompt.md` files replace the "ask questions now" block with the "decide + note" language from §3.3.
- [ ] The review-iteration cap in `team-driven-development` and `subagent-driven-development` escalates to a fresh implementer with reframed context before escalating to the user, and flag-and-continues if the fresh attempt still fails.
- [ ] `finishing-a-development-branch` has an autonomous mode that pushes and creates a PR without prompting, and retains the interactive 4-option menu for direct user invocation.
- [ ] A new pre-merge external review step is integrated into `team-driven-development` and `subagent-driven-development` between "tests green" and `finishing-a-development-branch`, gated on the per-plan reviewer choice.
- [ ] `~/.claude/skills/claude-cli/SKILL.md` exists and mirrors `codex-cli`'s structure (second opinion, code review, adversarial review modes with JSON schema output).
- [ ] `team-driven-development` and `subagent-driven-development` include a Checkpoint section specifying phase-boundary / pre-review / post-review / post-PR goldfish checkpoints.
- [ ] Both skills include a Recovery section with the fixed orientation sequence from §6.4.
- [ ] Morning-report format (§7) is documented and emitted to all three targets (PR description, worktree file, terminal).
- [ ] All existing tests for skill infrastructure still pass; no regressions in single-agent `executing-plans` or non-autonomous `finishing-a-development-branch` behavior.
- [ ] Documentation (CLAUDE.md, README if needed) reflects the new default: razorback runs to completion; stops are for real blockers only.

---

## 10. Files expected to change

- `skills/writing-plans/SKILL.md` — remove handoff prompt, add reviewer-choice handling
- `skills/executing-plans/SKILL.md` — blocker taxonomy reference, remove inter-task gates
- `skills/team-driven-development/SKILL.md` — blocker taxonomy, external-review step, checkpointing, recovery, iteration-cap change
- `skills/team-driven-development/implementer-prompt.md` — decide-and-note language
- `skills/subagent-driven-development/SKILL.md` — same as team-driven-development
- `skills/subagent-driven-development/implementer-prompt.md` — decide-and-note language
- `skills/subagent-driven-development/fix-prompt.md` — minor update for reframed-context fix attempts
- `skills/finishing-a-development-branch/SKILL.md` — autonomous vs interactive mode
- **New:** `~/.claude/skills/claude-cli/SKILL.md` and `~/.claude/skills/claude-cli/schemas/review-output.schema.json` and `~/.claude/skills/claude-cli/adversarial-prompt.txt`
- `CLAUDE.md` (razorback project) — updated philosophy note
- `README.md` (razorback) — updated execution-model section if needed

---

## 11. Open questions for plan writing

None. All design questions resolved during brainstorming. The implementation plan can proceed.
