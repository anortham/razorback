---
name: cursor-agent
description: Use when the user explicitly asks to use Cursor Agent, Cursor CLI, Composer, Composer 2.5, or to delegate implementation work to Cursor from another harness.
---

# Cursor Agent

Use Cursor Agent CLI (`cursor-agent`) as a bounded implementation worker when
the user explicitly wants Composer involved. The dispatching agent — whichever
harness you are running in — stays the lead: it plans, scopes ownership,
reviews the diff, routes fixes, and owns final verification.
Cursor Agent is the implementer.

## Defaults

- **Execution**: always local. `cursor-agent -p` runs on this machine — there
  is no cloud flag on headless runs. Never start the prompt *text* with `&`
  (that is Cursor's Cloud Agent handoff; PowerShell's `&` call operator before
  an exe path is fine), never run `cursor-agent worker`, and never dispatch
  via cursor.com/agents. Cloud Agents are out of scope for this skill.
- **Model**: `composer-2.5-fast` unless the user asks for another Cursor model.
- **Mode**: non-interactive print mode with `cursor-agent -p`.
- **Workspace**: always pass `--workspace "$WORKSPACE"` so Cursor edits the
  intended repo.
- **Permissions**: `--trust` only suppresses the workspace-trust prompt and is
  needed on every headless `-p` run, including read-only ones. `--force` allows
  commands without per-command approval — use it only for bounded
  implementation tasks with explicit file ownership, never for read-only
  review.
- **Output**: prefer `--output-format json` for resumable runs and `text` for
  short ad-hoc output.
- **Safety**: tell Cursor no push, no release, no deploy, no destructive git,
  and no edits outside assigned files.

## Policy Gate

Before sending any diff or repo content to Cursor, apply the external-model
policy check in razorback:security-review. Provider for this skill: `cursor`.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies `cursor` → refuse the dispatch
and name an allowed alternative; on an autonomous run where the user chose this
provider, stop per blocker taxonomy #4.

## Running These Recipes

Every recipe below is one shell script, split into numbered steps for reading.
Run all steps of a recipe in ONE shell invocation. Shell variables do not
survive between harness tool calls, so a step run on its own sees an empty
`$SKILL_DIR`, `$REVIEW_ROOT`, `$DIFF`, and `$TARGET`. That sends an empty or
truncated payload, or fails on a helper path that starts with `/../`.
Concatenate the step blocks into a single command and run it once.

Make these two lines the start of that command, ahead of every step:

```bash
SKILL_DIR=<absolute path to this skill's own directory>
set -u
```

`$SKILL_DIR` is the directory that holds this SKILL.md — the skill's base
directory, announced when the skill loads. Substitute the literal path before
you run anything; the recipes reach shared helpers through `$SKILL_DIR/..`.
`set -u` stops the run on an unset recipe variable instead of dispatching a
payload with a hole in it.

## Outbound Payload Redaction

Immediately before every `cursor-agent -p` dispatch, write the fully constructed prompt to `PAYLOAD_FILE` and pass it through `skills/security-review/scripts/redact-outbound`. Use only `REDACTED_PAYLOAD_FILE` for the invocation. If redaction fails, remove both files, emit only a generic error, and stop before Cursor receives any input.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

## Preflight

Before the first run, verify the CLI exists: `cursor-agent --version`
(the installer also creates an `agent` alias).

If it is missing, STOP and give the user the install command for their
platform. Do not run the installer yourself, and never retry it in a loop.

| Platform | Install (user runs it) | Binary location |
|---|---|---|
| macOS / Linux / WSL | `curl https://cursor.com/install -fsS \| bash` | `~/.local/bin/cursor-agent` |
| Windows (native) | `irm 'https://cursor.com/install?win32=true' \| iex` | `%LOCALAPPDATA%\cursor-agent\cursor-agent.exe` (alias `agent.exe`) |

**Windows trap:** the installer adds `%LOCALAPPDATA%\cursor-agent` to the
*user* PATH, which already-running shells and agent sessions do not see. If
`cursor-agent` is "not found" immediately after an install, call it by
absolute path — PowerShell: `& "$env:LOCALAPPDATA\cursor-agent\cursor-agent.exe"`,
Git Bash: `"$LOCALAPPDATA/cursor-agent/cursor-agent.exe"` — instead of
reinstalling. Repeated `irm … | iex` / `Invoke-WebRequest` runs to "fix" a
missing cursor-agent are a red flag: install at most once, then use the full
path.

## When To Use

Use this skill only when the user asks for Cursor/Composer specifically.
Otherwise use the normal harness-native execution path from
`subagent-driven-development`.

Good fit:
- The lead makes the plan and hands a narrow implementation task to Composer.
- Composer does a fast first pass while the lead reviews quality and
  correctness.
- A fix loop sends concrete review findings back to Cursor.

Poor fit:
- Security, billing, auth, data loss, or weak-test changes without a tight plan.
- Broad shared lifecycle refactors where the worker must infer architecture.
- Any task where Cursor would need to choose product intent.

## Implementation Prompt Contract

Before invoking Cursor, the lead must prepare a complete prompt with:

1. The approved plan or task text.
2. File ownership: exact files Cursor may edit.
3. Explicit non-goals and forbidden actions.
4. Required verification commands.
5. Miller-first expectations if Miller MCP is available in the target workspace.
6. A required final report: files changed, tests run, failures, and decisions.

Include this safety block in every implementation prompt:

```markdown
You are an implementation worker. The agent that dispatched you is the lead
and reviewer.

Constraints:
- Edit only the assigned files.
- Do not push, release, deploy, publish, rewrite history, or run destructive git.
- Do not fetch URLs or run web requests (curl, wget, irm, Invoke-WebRequest);
  work only from the local repo and this prompt.
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
REDACTED_PROMPT_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PROMPT_FILE" > "$REDACTED_PROMPT_FILE"; then
  rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' PROMPT < "$REDACTED_PROMPT_FILE" || true

cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  "$PROMPT"
rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
```

### Windows

Do not run the bash blocks above on Windows — run in PowerShell. Two failures
are confirmed on Windows:

1. **Bare `cursor-agent` is not on the Git Bash PATH.** Cursor ships only
   `cursor-agent.cmd` and `cursor-agent.ps1` (no extensionless shim), so the
   harness Bash tool (Git Bash) resolves it only with an explicit `.cmd`, never
   the bare name.
2. **Multi-line prompts are truncated to the first line** when passed as a CLI
   argument through the `.cmd`→`powershell` shim — the worker silently receives
   only line 1 of the plan.

So on Windows, run in PowerShell with the bare `cursor-agent` name (PowerShell's
command discovery resolves the `.ps1`/`.cmd` shim) and build the prompt with
`Get-Content -Raw` into a variable, which preserves newlines. `$(cat file)` and `/tmp` are bash-isms — substitute
`Get-Content -Raw` and `$env:TEMP`:

```powershell
$Workspace = "C:\path\to\project"
$PromptFile = "$env:TEMP\cursor-task.md"
$RedactedPromptFile = [IO.Path]::GetTempFileName()
& node "$SKILL_DIR/../security-review/scripts/redact-outbound" < $PromptFile > $RedactedPromptFile
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force $PromptFile, $RedactedPromptFile
  throw "outbound redaction failed"
}
$Prompt = Get-Content -Raw $RedactedPromptFile

cursor-agent -p --workspace $Workspace --model composer-2.5-fast `
  --trust --force --output-format json $Prompt
Remove-Item -Force $PromptFile, $RedactedPromptFile
```

After the command returns:

1. Run `git -C "$WORKSPACE" diff --stat` and inspect the diff.
2. The lead reviews spec compliance and code quality.
3. The lead runs or reuses the required verification scope.
4. If issues remain, use the fix loop below.

## Resumable Fix Loop

For multi-round work, create the chat id up front with `cursor-agent
create-chat` and pass it to every round. Do not try to discover the session
afterwards: `cursor-agent ls` and `cursor-agent resume` are interactive TUI
pickers and error out in non-interactive shells.

```bash
WORKSPACE="/path/to/project"
CHAT_ID="$(cursor-agent create-chat)"
PROMPT_FILE="/tmp/cursor-task.md"
REDACTED_PROMPT_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PROMPT_FILE" > "$REDACTED_PROMPT_FILE"; then
  rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' PROMPT < "$REDACTED_PROMPT_FILE" || true

cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  --resume "$CHAT_ID" \
  "$PROMPT"
rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
```

The lead then reviews the result. When review finds issues, send only concrete
findings and the expected end state:

```bash
PROMPT_FILE="/tmp/cursor-fix.md"
REDACTED_PROMPT_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PROMPT_FILE" > "$REDACTED_PROMPT_FILE"; then
  rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' PROMPT < "$REDACTED_PROMPT_FILE" || true

cursor-agent -p \
  --workspace "$WORKSPACE" \
  --model composer-2.5-fast \
  --trust \
  --force \
  --output-format json \
  --resume "$CHAT_ID" \
  "$PROMPT"
rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
```

Review cap: 3 iterations. Re-review after every fix. If the third fix still
fails, stop using that Cursor session and start a fresh Cursor run with a
smaller task, prior diff summary, and explicit reviewer findings.

The canonical three-way cap contract is in `razorback:subagent-driven-development` Step 3 ("Cap adjudication").

## Lead Review Checklist

The lead reviews every Cursor implementation before accepting it:

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
- **Cursor (or the lead) loops on the same command — e.g. repeated PowerShell
  web requests**: kill the run. If the loop was installing cursor-agent, apply
  the Preflight rule (absolute path, no reinstall). If the loop was inside
  Cursor's run, re-dispatch with the web-request ban restated and a narrower
  task.
- **Cursor changes unassigned files**: revert only Cursor's unapproved edits,
  then send a narrowed fix prompt. Do not revert unrelated user work.
- **Cursor cannot use required MCP tools**: provide enough lead-gathered context
  in the prompt, and require Cursor to report what it inspected manually.
- **Verification fails**: the lead classifies the failure. Send a fix only when
  the failure is inside Cursor's assigned scope; otherwise handle it as lead
  work.
- **Windows: "command not found" or a truncated/single-line prompt**: you ran
  the bash form. Use the PowerShell flow in the Windows section under One-Shot
  Implementation (bare `cursor-agent` via PATHEXT, `Get-Content -Raw` prompt).

## Quick Reference

| Use case | Command |
|---|---|
| Preflight (always first) | `cursor-agent --version` |
| Implement bounded task | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --trust --force "$(cat "$PROMPT_FILE")"` |
| Resume fix loop | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --trust --force --resume "$CHAT_ID" "$(cat "$FIX_FILE")"` |
| Read-only analysis | `cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast --trust --mode ask "$PROMPT"` |
| List models | `cursor-agent models` |
| Create chat id | `cursor-agent create-chat` |
