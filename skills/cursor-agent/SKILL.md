---
name: cursor-agent
description: Use when the user explicitly asks to use Cursor Agent, Cursor CLI, Composer, Composer 2.5, or to delegate implementation work to Cursor from another harness.
---

# Cursor Agent

Use Cursor Agent CLI (`cursor-agent`) as a bounded implementation worker when
the user explicitly wants Composer involved. Codex stays the lead: it plans,
scopes ownership, reviews the diff, routes fixes, and owns final verification.
Cursor Agent is the implementer.

## Defaults

- **Model**: `composer-2.5-fast` unless the user asks for another Cursor model.
- **Mode**: non-interactive print mode with `cursor-agent -p`.
- **Workspace**: always pass `--workspace "$WORKSPACE"` so Cursor edits the
  intended repo.
- **Permissions**: use `--trust --force` only for bounded implementation tasks
  with explicit file ownership. Do not use them for read-only review.
- **Output**: prefer `--output-format json` for resumable runs and `text` for
  short ad-hoc output.
- **Safety**: tell Cursor no push, no release, no deploy, no destructive git,
  and no edits outside assigned files.

## When To Use

Use this skill only when the user asks for Cursor/Composer specifically.
Otherwise use the normal harness-native execution path from
`subagent-driven-development`.

Good fit:
- Codex makes the plan and hands a narrow implementation task to Composer.
- Composer does a fast first pass while Codex reviews quality and correctness.
- A fix loop sends concrete review findings back to Cursor.

Poor fit:
- Security, billing, auth, data loss, or weak-test changes without a tight plan.
- Broad shared lifecycle refactors where the worker must infer architecture.
- Any task where Cursor would need to choose product intent.

## Implementation Prompt Contract

Before invoking Cursor, Codex must prepare a complete prompt with:

1. The approved plan or task text.
2. File ownership: exact files Cursor may edit.
3. Explicit non-goals and forbidden actions.
4. Required verification commands.
5. Miller-first expectations if Miller MCP is available in the target workspace.
6. A required final report: files changed, tests run, failures, and decisions.

Include this safety block in every implementation prompt:

```markdown
You are an implementation worker. Codex is the lead and reviewer.

Constraints:
- Edit only the assigned files.
- Do not push, release, deploy, publish, rewrite history, or run destructive git.
- Do not broaden the task or redesign the architecture.
- If requirements conflict with the codebase, stop and report the mismatch.
- Run the assigned verification commands and report exact results.
```

## One-Shot Implementation

Use this when a task is narrow enough that Cursor can complete and report in one
run.

```bash
WORKSPACE="/path/to/project"
PROMPT_FILE="/tmp/cursor-task.md"

cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  "$(cat "$PROMPT_FILE")"
```

After the command returns:

1. Run `git -C "$WORKSPACE" diff --stat` and inspect the diff.
2. Codex reviews spec compliance and code quality.
3. Codex runs or reuses the required verification scope.
4. If issues remain, use the fix loop below.

## Resumable Fix Loop

For multi-round work, create or capture a Cursor chat id. If the first response
does not expose one clearly, use `cursor-agent ls` to identify the latest
session for this workspace.

```bash
WORKSPACE="/path/to/project"
CHAT_ID="$(cursor-agent create-chat)"

cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  --resume "$CHAT_ID" \
  "$(cat /tmp/cursor-task.md)"
```

Codex then reviews the result. When review finds issues, send only concrete
findings and the expected end state:

```bash
cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  --resume "$CHAT_ID" \
  "$(cat /tmp/cursor-fix.md)"
```

Review cap: 3 iterations. Re-review after every fix. If the third fix still
fails, stop using that Cursor session and start a fresh Cursor run with a
smaller task, prior diff summary, and explicit reviewer findings.

## Codex Review Checklist

Codex reviews every Cursor implementation before accepting it:

- Does the diff match the approved task and file ownership?
- Did Cursor add anything not requested?
- Are tests meaningful and run through caller-facing behavior?
- Did verification pass, and what invariant did each command prove?
- Are there architecture or API changes that need Miller `inspect`, `trace`, or
  `impact` before acceptance?

Never accept Cursor's final report as proof. The lead verifies the diff and the
gates.

## Failure Handling

- **Cursor asks for permission or stalls**: retry once with more directive
  wording and `--force` if the task is already authorized.
- **Cursor changes unassigned files**: revert only Cursor's unapproved edits,
  then send a narrowed fix prompt. Do not revert unrelated user work.
- **Cursor cannot use required MCP tools**: provide enough lead-gathered context
  in the prompt, and require Cursor to report what it inspected manually.
- **Verification fails**: Codex classifies the failure. Send a fix only when the
  failure is inside Cursor's assigned scope; otherwise handle it as lead work.

## Quick Reference

| Use case | Command |
|---|---|
| Implement bounded task | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --trust --force "$(cat "$PROMPT_FILE")"` |
| Resume fix loop | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --trust --force --resume "$CHAT_ID" "$(cat "$FIX_FILE")"` |
| Read-only analysis | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --mode ask "$PROMPT"` |
| List models | `cursor-agent models` |
| List sessions | `cursor-agent ls` |
