---
name: requesting-code-review
description: Use when the lead needs inline-review criteria during plan execution, or when reviewing work done outside an approved plan - ad-hoc features, baseline checks before a refactor, or when stuck. Not for planned pre-merge external review — that's razorback:pre-merge-review.
---

# Requesting Code Review

Two review modes, depending on context.

**Core principle:** Review early, review often.

## Mode 1: Inline Review (Plan Execution)

When using `razorback:subagent-driven-development`, the **lead does inline review** after each implementer reports DONE. No separate reviewer agent needed.

**The lead checks two things:**

**Spec compliance:** Did the implementer build what was requested? Nothing missing, nothing extra?
- **List a file's symbols** to scan changed files quickly with Miller `inspect`
- Compare actual code to task requirements line by line

**Code quality:** Is the code clean, tested, and maintainable?
- **Inspect** key modified symbols with Miller `inspect(target, depth=overview)` — escalate to `depth=full` for symbols the change centers on
- **Find references** to verify changes don't break dependents with Miller `trace`
- Check tests verify behavior, not just that code runs
- Reject the report if the implementer cannot show Miller-first orientation and
  the Miller calls they used
- Reject the report if it relies on symbol names, function signatures, config
  shapes, route names, CLI flags, or public contracts without Miller-backed
  API-shape evidence
- Compare the diff against the approved architecture, not just the symptom
- If the same structural issue keeps recurring, route it through
  `razorback:architecture-quality` Candidate Mode instead of looping more patches

**If issues found:** Route the fix back to an implementer using the harness-native follow-up path. Resume the existing implementer on Claude Code or Codex when possible, or dispatch a fresh implementer with fix context where resume is unavailable. They fix and re-report. Review cap: 3 iterations.

## Mode 2: Standalone Review (Ad-Hoc / Baseline)

For work done outside plan execution, dispatch the `razorback:code-reviewer` agent.
Standalone review is for ad-hoc or baseline review: when stuck, before a
refactor, after a major feature outside an approved plan, or before merging
ad-hoc work.

For planned pre-merge external review in an approved execution flow, use
`razorback:pre-merge-review` instead. That skill owns the stricter
branch-gate, chosen-reviewer, finding-classification, fix, and report flow.

Before Mode 2 sends the constructed reviewer prompt to any external CLI, write it to `PAYLOAD_FILE` and pass it through `skills/security-review/scripts/redact-outbound`. Dispatch only the resulting `REDACTED_PAYLOAD_FILE`; if redaction fails, remove both files, emit only a generic error, and stop before dispatch.

After filling the two-file reviewer template, treat the completed dispatch message as the payload. The harness-native `spawn_agent` or `Task` call must receive the contents of `REDACTED_PAYLOAD_FILE`; never interpolate the unredacted template, diff, or target description into the message.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

**1. Get git SHAs:**
```bash
# Prefer the branch merge base so review covers the whole feature branch.
BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)
HEAD_SHA=$(git rev-parse HEAD)
# If the target branch is neither main nor master, compute BASE_SHA against the correct base explicitly.
```

**2. Dispatch code-reviewer agent:**

| Harness | How to invoke |
|---------|---------------|
| Claude Code | Dispatch the `razorback:code-reviewer` plugin agent with the filled template as its prompt |
| Cursor | Same as Claude Code (plugin agents exposed through the Skill tool's agent discovery) |
| Codex | `spawn_agent(task_name="code-review", message=<see two-file note below>)` |
| OpenCode | `Task` tool with `general` subagent (message built as in the two-file note below) |

**Two-file note (Codex / OpenCode inline-prompt harnesses):** The reviewer uses two files. `agents/code-reviewer.md` holds the reviewer's system-prompt body (its behavioral spec). `requesting-code-review/code-reviewer.md` is the task template with placeholders (`{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`). On Claude Code / Cursor the agent discovery wires these together automatically. On Codex and OpenCode, build the dispatch message by concatenating: (1) `agents/code-reviewer.md` body (strip the frontmatter), then (2) the filled-in `requesting-code-review/code-reviewer.md` template. Send that as the subagent's task message (Codex `spawn_agent` `message` or OpenCode `Task` prompt).

### Policy Gate

Before any dispatch from the table above sends the diff or repo content to an
external CLI, apply the external-model policy check in
razorback:security-review, using that CLI's provider from the mapping there.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies the provider → refuse the
dispatch and name an allowed alternative; on an autonomous run where the user
chose that provider, stop per blocker taxonomy #4.

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
Route the findings through `razorback:receiving-code-review` — verify each item against the code before implementing, push back with reasoning where the reviewer is wrong, and fix what survives verification.

## When to Request Review

**Mandatory:**
- After each task during plan execution: inline review by the lead (Mode 1). Plan-execution work never dispatches a reviewer subagent.
- Before merging ad-hoc work done outside an approved plan: standalone (Mode 2). Planned pre-merge external review uses `razorback:pre-merge-review` instead.

**Optional but valuable (standalone, ad-hoc work only):**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## Integration with Workflows

**Plan Execution (`subagent-driven-development` or `executing-plans`):**
- Lead does inline review (Mode 1) after each implementer reports DONE (subagent-driven) or applies the same criteria to its own work (executing-plans)
- No standalone reviewer dispatch and no per-batch review stops — the flow is: execute all tasks → optional `razorback:pre-merge-review` (if a reviewer was chosen at plan approval) → `razorback:finishing-a-development-branch`

**Ad-Hoc Development:**
- Standalone review before merge
- Standalone review when stuck
- When repeated findings keep surfacing the same structural issue, stop the
  patch loop, invoke `razorback:architecture-quality` Candidate Mode, and review against
  the approved architecture before asking for another change

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md
