---
name: pre-merge-review
description: Use after all tasks are complete and tests pass, before finishing-a-development-branch, when a pre-merge external reviewer was chosen at plan approval time (codex, gemini, or claude). Builds diff, dispatches the chosen reviewer in adversarial mode, verifies each finding using Julie tools, dispatches fresh implementer subagents for verified fixes, re-runs tests, and emits a summary for the morning report. Single-pass — does not loop external reviews.
---

# Pre-Merge External Review

## Overview

Run a fresh, isolated external reviewer (codex / gemini / claude) against the full branch diff after all tasks are done and tests are green, then route verified findings through razorback's own implementer-subagent flow for fixes. The lead verifies every finding against the actual code with Julie, classifies it (real-bug / real-improvement / false-positive / out-of-scope), fixes what's real, dismisses what isn't (with a written reason), and flags what needs human judgment. Single pass — no round-two review after fixes. The output is a summary block that slots into the morning report's External review section, so the user sees exactly what the reviewer said, what the lead did with it, and why.

## When to invoke

Invoked by:

- `team-driven-development` Step 5a (between final verification and `finishing-a-development-branch`)
- `subagent-driven-development` Step 4a (same position in that flow)

Skip this skill entirely if the reviewer choice is `none`. The choice is fixed at plan approval time (captured by `writing-plans`) and does not change mid-run.

**Pre-conditions:**

- All plan tasks are complete
- The full test suite passes
- The branch is NOT yet pushed (no PR yet)
- A reviewer was chosen: one of `codex`, `gemini`, `claude`

If any pre-condition is not met, abort and surface the gap to the caller. Do not review a partial branch or pre-push a branch on your own.

## The Process

```dot
digraph pre_merge_review {
    rankdir=TB;

    "Reviewer choice (codex/gemini/claude)" [shape=box];
    "Step 1: Build diff + context" [shape=box];
    "Step 2: Dispatch chosen reviewer (adversarial, read-only)" [shape=box];
    "Step 3: Parse findings (JSON for codex/claude, envelope+fallback for gemini)" [shape=box];
    "Any findings?" [shape=diamond];
    "Step 4: Lead verifies each finding with Julie" [shape=box];
    "Classify: real-bug / real-improvement / false-positive / out-of-scope" [shape=box];
    "Any verified fixes?" [shape=diamond];
    "Step 5: Dispatch fresh implementer subagent(s) for verified fixes" [shape=box];
    "Step 6: Re-run full test suite" [shape=box];
    "Tests green?" [shape=diamond];
    "Step 7: Emit summary block for morning report" [shape=box style=filled fillcolor=lightgreen];
    "Return to caller (proceed to finishing-a-development-branch)" [shape=box style=filled fillcolor=lightgreen];
    "Blocker per taxonomy (stop + report)" [shape=box style=filled fillcolor=lightpink];

    "Reviewer choice (codex/gemini/claude)" -> "Step 1: Build diff + context";
    "Step 1: Build diff + context" -> "Step 2: Dispatch chosen reviewer (adversarial, read-only)";
    "Step 2: Dispatch chosen reviewer (adversarial, read-only)" -> "Step 3: Parse findings (JSON for codex/claude, envelope+fallback for gemini)";
    "Step 3: Parse findings (JSON for codex/claude, envelope+fallback for gemini)" -> "Any findings?";
    "Any findings?" -> "Step 7: Emit summary block for morning report" [label="no"];
    "Any findings?" -> "Step 4: Lead verifies each finding with Julie" [label="yes"];
    "Step 4: Lead verifies each finding with Julie" -> "Classify: real-bug / real-improvement / false-positive / out-of-scope";
    "Classify: real-bug / real-improvement / false-positive / out-of-scope" -> "Any verified fixes?";
    "Any verified fixes?" -> "Step 7: Emit summary block for morning report" [label="no (all dismissed/flagged)"];
    "Any verified fixes?" -> "Step 5: Dispatch fresh implementer subagent(s) for verified fixes" [label="yes"];
    "Step 5: Dispatch fresh implementer subagent(s) for verified fixes" -> "Step 6: Re-run full test suite";
    "Step 6: Re-run full test suite" -> "Tests green?";
    "Tests green?" -> "Step 7: Emit summary block for morning report" [label="yes"];
    "Tests green?" -> "Blocker per taxonomy (stop + report)" [label="no (after fixes)"];
    "Step 7: Emit summary block for morning report" -> "Return to caller (proceed to finishing-a-development-branch)";
}
```

## Step 1: Build diff + context

The reviewer needs the full picture of what shipped, not the latest commit only. Build the diff from the merge base of the branch against the base branch (typically `main` or `master`).

```bash
# Detect base branch (prefer main, fall back to master)
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROJECT_DIR=$(git rev-parse --show-toplevel)

# Full diff (what the reviewer reads)
DIFF=$(git diff "$BASE"..HEAD --no-ext-diff)

# File summary (stat + per-file line counts)
FILE_STAT=$(git diff --stat "$BASE"..HEAD)

# Commit messages on this branch (intent of each change)
COMMIT_LOG=$(git log --oneline "$BASE"..HEAD)

# Plan path (so the reviewer can cross-check scope)
PLAN_PATH="docs/plans/<YYYY-MM-DD>-<feature>.md"   # filled from the in-session plan
```

Pass all four to the chosen reviewer: `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PLAN_PATH`. The reviewer prompts at `reviewer-prompts/*.md` document how to wire them into each CLI's invocation.

Optional: if the plan carried a focus area ("focus on the auth boundary", "pay attention to schema migrations"), include it in the prompt. Do not invent a focus the user did not ask for.

## Step 2: Dispatch the chosen reviewer

Select the prompt file based on the reviewer choice and invoke the matching reviewer-cli skill. Each file contains a complete runnable invocation. All three invocations run the reviewer in adversarial mode with read-only tool access — the reviewer never edits code.

- **codex** → follow [`reviewer-prompts/codex.md`](reviewer-prompts/codex.md). Calls `codex exec --ephemeral --color never --output-schema …` with the shared JSON schema. See `~/.claude/skills/codex-cli/SKILL.md` "Adversarial Review" for the canonical prompt template.
- **gemini** → follow [`reviewer-prompts/gemini.md`](reviewer-prompts/gemini.md). Calls `gemini -o json -m gemini-3-pro --yolo` with the schema inlined in the prompt body (gemini has no `--json-schema` flag). See `~/.claude/skills/gemini-cli/SKILL.md`.
- **claude** → follow [`reviewer-prompts/claude.md`](reviewer-prompts/claude.md). Calls `claude -p --bare --no-session-persistence --dangerously-skip-permissions --output-format json --json-schema … --tools "Read,Bash" --max-turns 15 --max-budget-usd 5.00 --model opus --system-prompt-file …`. See `~/.claude/skills/claude-cli/SKILL.md` "Adversarial Review" — that file is the canonical source; `reviewer-prompts/claude.md` quotes it so the user can read it without chasing links.

All three target the shared output schema: `~/.claude/skills/codex-cli/schemas/review-output.schema.json` (verdict, summary, findings[severity, title, body, file, line_start, line_end, confidence, recommendation], next_steps).

## Step 3: Parse findings

Two paths, because gemini's output shape differs from codex's and claude's.

**codex / claude (strict schema):** the CLI enforces the JSON schema directly. Parse the stdout with `jq` against the same schema file and iterate `.findings[]`. No envelope.

```bash
jq -e '.findings[]' < reviewer-output.json     # fail non-zero if any finding is malformed
```

**gemini (envelope + markdown fallback):** gemini's `-o json` wraps the model response in a metadata envelope: `{session_id, response, stats: {models: {…: {tokens: …}}}}`. The `.response` field is plain text, frequently fenced in markdown (```` ```json … ``` ````). Execute the 5-step parsing protocol in `reviewer-prompts/gemini.md`:

1. `jq -r '.response'` to extract the model text from the envelope.
2. Strip markdown code fences.
3. `jq empty` to confirm the cleaned text is parseable JSON.
4. Validate against the shared schema. If invalid, retry once with a stricter "return ONLY JSON, no prose, no fences" prompt. If still invalid, fall back to the structured-markdown regex parser (`## Finding N` blocks).
5. Normalize every finding to the shared finding shape (the one in `review-output.schema.json`): `{severity, title, body, file, line_start, line_end, confidence, recommendation}`.

After Step 3, all three reviewer paths produce the same in-memory list of normalized findings. Log `stats.models.*.tokens` from the gemini envelope into the morning report's per-reviewer section for cost tracking; codex and claude do not surface per-request token counts in their JSON output, so note the asymmetry in the report.

## Step 4: Verify findings

For every finding, the lead checks the actual code before deciding what to do. Reviewers emit noise; rubber-stamping is banned. The full classification protocol lives in [`verification-protocol.md`](verification-protocol.md) — read it for the concrete examples.

Summary of the four classifications:

- **real-bug** — the code actually has the defect described. Fix is mandatory.
- **real-improvement** — not a bug, but a legitimate quality improvement (naming, coupling, missed edge case that matters). Fix is recommended unless it expands scope beyond the plan.
- **false-positive** — reviewer misread the code, invented a path, or flagged an intentional pattern. Dismiss with a written reason.
- **out-of-scope** — real finding, outside the plan's scope. Dismiss with "out of scope, filed as follow-up" (or equivalent specific reason).

Verification always uses Julie:

- `julie:deep_dive(symbol=<referenced symbol>)` — check the symbol's callers, callees, types.
- `julie:fast_refs(symbol=<referenced symbol>)` — check the full impact if the finding touches a public API.
- `julie:get_symbols(file_path=<file>)` — see the file structure without reading the whole file.

Dismissal rule: no finding is dismissed without a written reason that ends up in the morning report. The user will read those reasons on PR review and can override any of them.

Flagging rule: if a finding is real AND the lead cannot determine the right fix without human input (architectural question, priority trade-off, security-boundary call), do **not** fix. Flag it in the morning report's "Flagged for your review" block with a short "why uncertain" note.

## Step 5: Dispatch fresh implementer subagents for verified fixes

For each verified fix (real-bug or accepted real-improvement), dispatch a fresh `general-purpose` implementer subagent via the Agent tool. One Agent call per finding, or **grouped by file if multiple findings cluster on the same file** — see the edge-case note in [`fix-dispatch-prompt.md`](fix-dispatch-prompt.md).

Use the template at [`fix-dispatch-prompt.md`](fix-dispatch-prompt.md). File ownership must be stated so parallel fixers do not collide — two subagents editing the same file overwrite each other's work. If findings span disjoint files, you can dispatch in parallel (one message, multiple Agent calls). If they cluster on the same file, either serialize the fixes or batch them into one dispatch.

Why fresh subagents (not the existing team / not messaging an existing teammate)? The review runs after the team has been disbanded or the subagent run has ended. Fresh subagents work at any point in the timeline regardless of team state, and they come with no implementation-phase bias that might rationalize around a finding.

## Step 6: Re-run tests

After all fix subagents report DONE and commit their changes, re-run the full test suite (or the targeted subset that covers the changed files, if the project has a fast-path test selector).

If tests fail after fixes:

1. If the failure is a straightforward issue introduced by the fix and the implementer missed it, dispatch one more fix subagent with the failure context. One retry, not a loop.
2. If the retry fails or the failure looks structural, this is **blocker taxonomy #5** (unresolvable test failures) — see `skills/using-razorback/references/blocker-taxonomy.md`. Stop and write the blocker into the morning report. Do not push a red branch.

If tests pass, proceed to Step 7.

## Step 7: Emit summary for morning report

Produce a structured block that slots into the External review section of `skills/finishing-a-development-branch/morning-report-template.md`. The template's External review section already defines these placeholders — fill them:

- `{{reviewer}}` — one of `codex`, `gemini`, `claude`.
- `{{findings_total}}` — count of findings returned by the reviewer (before classification).
- `{{findings_fixed_count}}` — count of verified findings that were fixed.
- `{{fix_commit_shas}}` — comma-separated short SHAs of the fix commits.
  - Per-fixed-finding sub-block: short title + short summary of the fix.
- `{{findings_dismissed_count}}` — count of dismissed findings (false-positive or out-of-scope).
  - Per-dismissed-finding sub-block: short title + **dismissal reason** (required, no silent dismissals).
- `{{findings_flagged_count}}` — count of real findings left for human judgment.
  - Per-flagged-finding sub-block: short title + **why uncertain** (required).

If the reviewer was gemini, also capture `stats.models.*.tokens` from the envelope and append a one-line cost note ("gemini used N prompt / M completion tokens"). Codex and claude do not surface per-request token counts — note the absence rather than faking a number.

The caller (`team-driven-development` Step 5a or `subagent-driven-development` Step 4a) takes this block and hands it forward to `finishing-a-development-branch`, which renders it into the PR description (summary form) and the full worktree report.

## Red flags

**Never:**

- **Loop external review.** Single pass only. No "review, fix, re-review" cycle. Leftover real findings that the lead cannot fix get flagged for human judgment and the PR proceeds.
- **Let the reviewer edit code.** Reviewers are read-only: codex and claude pin `--tools "Read,Bash"`; gemini uses `--yolo` only to auto-approve its own Read calls and is instructed by prompt to be read-only. All fixes route through fresh implementer subagents in razorback's own flow.
- **Silently dismiss findings.** Every dismissal requires a written reason in the morning report so the user can override on PR review. Silent dismissals defeat the whole point of running an external reviewer.
- **Skip re-running tests after fixes.** Every fix invalidates the prior test run. Re-run the full suite (or a targeted subset that covers the changed files). Never push a branch whose most recent test run did not include the fix commits.

## Integration

**Called by:**

- `team-driven-development` — at Step 5a, between final verification and `finishing-a-development-branch`
- `subagent-driven-development` — at Step 4a, same position

**Calls:**

- `codex-cli` skill (when reviewer = codex) — see `reviewer-prompts/codex.md`
- `gemini-cli` skill (when reviewer = gemini) — see `reviewer-prompts/gemini.md`
- `claude-cli` skill (when reviewer = claude) — see `reviewer-prompts/claude.md`

**References:**

- `skills/using-razorback/references/blocker-taxonomy.md` — stop-versus-proceed rules
- `skills/finishing-a-development-branch/morning-report-template.md` — shape of the summary block emitted in Step 7
- `~/.claude/skills/codex-cli/schemas/review-output.schema.json` — the shared finding shape all three reviewers target
