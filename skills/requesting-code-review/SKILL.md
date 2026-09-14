---
name: requesting-code-review
description: Use when the lead needs inline-review criteria during plan execution, or when reviewing work done outside an approved plan - ad-hoc features, baseline checks before a refactor, or when stuck. Not for planned pre-merge external review — that's razorback:pre-merge-review.
---

# Requesting Code Review

**Core principle:** During plan execution the lead reviews inline; a reviewer subagent is never dispatched for planned work. Standalone reviewer dispatch exists only for work done outside an approved plan.

## Mode 1: Inline Review (Plan Execution)

After each implementer reports DONE in `razorback:subagent-driven-development` (or on its own work in `razorback:executing-plans`), the lead checks two things:

**Spec compliance:** built what was requested, nothing missing, nothing extra. List each changed file's symbols with `code-kb` `file_skeleton`, then compare the code to the task requirements line by line.

**Code quality:**
- Inspect key modified symbols with `code-kb` `get_symbol_context(symbol_name, file_path?)`; `get_symbol_body` for symbols the change centers on.
- Find references with `code-kb` `find_references(symbol_name, direction="callers")` to verify dependents still work.
- Tests verify behavior, not that code runs.
- Reject the report if the implementer cannot show code-kb-first orientation and the code-kb calls used.
- Reject the report if it relies on symbol names, function signatures, config shapes, route names, CLI flags, or public contracts without code-kb-backed API-shape evidence.
- Compare the diff against the approved architecture, not just the symptom. When repeated findings show the same structural issue, route it through `razorback:architecture-quality` Candidate Mode instead of looping patches.

**If issues found:** route the fix back through the harness-native follow-up path (resume the implementer where possible, else dispatch a fresh one with fix context). Review cap: 3 iterations. The canonical three-way cap contract is in `razorback:subagent-driven-development` Step 3 ("Cap adjudication").

## Mode 2: Standalone Review (Ad-Hoc / Baseline)

Standalone review is for ad-hoc or baseline review: when stuck, before a refactor, after a major feature outside an approved plan, or before merging ad-hoc work. Planned pre-merge external review uses `razorback:pre-merge-review`, which owns the branch-gate, chosen-reviewer, classification, fix, and report flow. A standalone external CLI second opinion stays in its provider skill (`razorback:codex-cli` or `razorback:claude-cli`) under the redaction and policy gate below; do not force it through a plan or clean-HEAD gate.

Harness-native reviewer agents use code-kb directly. Restricted external reviewers in a planned pre-merge review get the lead's sanitized code-kb-backed evidence and report missing evidence without MCP.

**1. Redact the payload.** Fill the reviewer template, write the completed dispatch message to `PAYLOAD_FILE`, and dispatch only `REDACTED_PAYLOAD_FILE`. The harness-native `spawn_agent` or `Task` call receives its contents; never interpolate the unredacted template, diff, or description.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

**2. Get git SHAs:**
```bash
BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)
HEAD_SHA=$(git rev-parse HEAD)
```
If the target branch is neither main nor master, compute `BASE_SHA` against the correct base explicitly.

**3. Dispatch the reviewer** with the filled template at `requesting-code-review/code-reviewer.md` (placeholders `{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`):

| Harness | How to invoke |
|---------|---------------|
| Claude Code / Cursor | Dispatch the `razorback:code-reviewer` plugin agent with the filled template as its prompt |
| Codex | `spawn_agent(task_name="code-review", message=<two-file message>)` |
| OpenCode | `Task` tool with `general` subagent (two-file message) |

**Two-file message (Codex / OpenCode):** concatenate the `agents/code-reviewer.md` body (frontmatter stripped) and the filled template; send that as the subagent's task message.

**Policy gate:** before any dispatch sends the diff to an external CLI, apply the external-model policy check (**REQUIRED SUB-SKILL:** razorback:security-review) with that CLI's provider. No policy block → proceed and add the loud morning-report note. Denied provider → refuse and name an allowed alternative; on an autonomous run where the user chose it, stop per blocker taxonomy #4.

**4. Act on feedback:** **REQUIRED SUB-SKILL:** razorback:receiving-code-review — verify each item against the code, push back where the reviewer is wrong, fix what survives.

## When to Request Review

- After each task during plan execution: inline by the lead (Mode 1); never a reviewer subagent.
- Before merging ad-hoc work: standalone (Mode 2). Planned work goes to `razorback:pre-merge-review`.
- Optional (ad-hoc only): when stuck, before refactoring, after a complex bug fix.

Plan execution has no standalone dispatch and no per-batch review stops: execute all tasks → optional `razorback:pre-merge-review` → `razorback:finishing-a-development-branch`.

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:** push back with technical reasoning, show code/tests that prove it works, request clarification.

## It's working if

- Plan-execution reviews happened inline by the lead; no reviewer subagent was dispatched for planned work.
- Every standalone dispatch sent only the redacted payload.
- Findings were routed through razorback:receiving-code-review, never implemented blind.
