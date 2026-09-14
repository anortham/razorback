---
name: cursor-agent
description: Use when the user explicitly asks to use Cursor Agent, Cursor CLI, Composer, Composer 2.5, or to delegate implementation work to Cursor from another harness.
---

# Cursor Agent

Use `cursor-agent` as a bounded implementation worker only when the user asks
for Cursor/Composer by name; otherwise use
`razorback:subagent-driven-development`. The dispatching agent stays the lead:
it plans, scopes ownership, reviews the diff, routes fixes, and owns final
verification. Cursor Agent is the implementer. Read
`skills/codex-cli/references/shared-cli-review.md` for the policy gate and
redaction rules. Provider for this skill: `cursor` (policy check in
razorback:security-review).

Good fit: a narrow task from an approved plan; a fast first pass the lead
reviews; a fix loop fed concrete findings. Poor fit: security, billing, auth,
data-loss, or weak-test changes without a tight plan; broad refactors where
the worker must infer architecture; anything requiring product intent.

## Running These Recipes

Run every step of a recipe in ONE shell invocation. Shell variables do not
survive between harness tool calls, so a step run alone sees an empty
`$SKILL_DIR`, `$REVIEW_ROOT`, `$DIFF`, and `$TARGET`. Start the command with:

```bash
SKILL_DIR=<absolute path to this skill's own directory>
set -u
```

`$SKILL_DIR` is the directory that holds this SKILL.md; substitute the literal
path. Recipes reach shared helpers through `$SKILL_DIR/..`.

## Defaults

- **Local only**: `cursor-agent -p` runs on this machine. Never start prompt
  text with `&` (Cloud Agent handoff), never run `cursor-agent worker`, never
  dispatch via cursor.com/agents.
- **Model**: `composer-2.5-fast` unless the user names another Cursor model.
- **Workspace**: always `--workspace "$WORKSPACE"`.
- **Permissions**: `--trust` on every headless run (suppresses the
  workspace-trust prompt). `--force` skips per-command approval; use it only
  for bounded implementation with explicit file ownership, never for
  read-only review (`--mode ask`).
- **Output**: `--output-format json` for resumable runs, `text` for short
  ad-hoc output.
- **Safety**: tell Cursor no push, no release, no deploy, no destructive git,
  no edits outside assigned files.

## Preflight

`cursor-agent --version` (the installer also creates an `agent` alias). If
missing, STOP and give the user the install command; never run the installer
yourself or retry it in a loop.

| Platform | Install (user runs it) | Binary |
|---|---|---|
| macOS / Linux / WSL | `curl https://cursor.com/install -fsS \| bash` | `~/.local/bin/cursor-agent` |
| Windows (native) | `irm 'https://cursor.com/install?win32=true' \| iex` | `%LOCALAPPDATA%\cursor-agent\cursor-agent.exe` (alias `agent.exe`) |

Windows trap: the installer edits the *user* PATH, which running shells do not
see. If `cursor-agent` is "not found" right after install, call it by absolute
path (`& "$env:LOCALAPPDATA\cursor-agent\cursor-agent.exe"` in PowerShell,
`"$LOCALAPPDATA/cursor-agent/cursor-agent.exe"` in Git Bash). Repeated
`irm … | iex` runs are a red flag: install at most once.

## Implementation Prompt Contract

Every prompt carries: the approved task text; exact files Cursor may edit;
non-goals and forbidden actions; required verification commands (a fix round reruns only the failing tests first, then the assigned command once); code-kb-first
expectations if code-kb MCP is available in the workspace; a required final
report (files changed, tests run, failures, decisions); and this block:

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

cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast \
  --trust --force --output-format json "$PROMPT"
rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
```

Afterwards: `git -C "$WORKSPACE" diff --stat`, then the lead reviews spec
compliance and code quality, runs the required verification, and routes any
issues through the fix loop.

### Windows

Do not run the bash form on Windows. Git Bash cannot resolve bare
`cursor-agent` (only `.cmd`/`.ps1` shims ship), and a multi-line prompt passed
through the `.cmd` shim is truncated to its first line. Use PowerShell with
the bare name and `Get-Content -Raw`:

```powershell
$Workspace = "C:\path\to\project"
$SkillDir = "C:\path\to\razorback\skills\cursor-agent"
$PromptFile = "$env:TEMP\cursor-task.md"
$RedactedPromptFile = [IO.Path]::GetTempFileName()
$redact = Start-Process node -ArgumentList @("$SkillDir\..\security-review\scripts\redact-outbound") `
  -RedirectStandardInput $PromptFile -RedirectStandardOutput $RedactedPromptFile `
  -NoNewWindow -Wait -PassThru
if ($redact.ExitCode -ne 0) {
  Remove-Item -Force $PromptFile, $RedactedPromptFile
  throw "outbound redaction failed"
}
$Prompt = Get-Content -Raw $RedactedPromptFile

cursor-agent -p --workspace $Workspace --model composer-2.5-fast `
  --trust --force --output-format json $Prompt
Remove-Item -Force $PromptFile, $RedactedPromptFile
```

## Resumable Fix Loop

Create the chat id up front with `cursor-agent create-chat` and pass it to
every round. `cursor-agent ls` and `cursor-agent resume` are interactive TUI
pickers and error out headless, so the id cannot be discovered afterwards.
Each round is the one-shot recipe (redaction included) with `--resume`; the
fix round sends only concrete findings and the expected end state:

```bash
CHAT_ID="$(cursor-agent create-chat)"
cursor-agent -p --workspace "$WORKSPACE" --model composer-2.5-fast \
  --trust --force --output-format json --resume "$CHAT_ID" "$PROMPT"
```

Review cap: 3 iterations. Re-review after every fix. If the third fix still
fails, stop that session and start a fresh Cursor run with a smaller task,
prior diff summary, and explicit reviewer findings.

The canonical three-way cap contract is in `razorback:subagent-driven-development` Step 3 ("Cap adjudication").

## Lead Review Checklist

The lead reviews every Cursor implementation before accepting it: diff matches
the task and file ownership; nothing unrequested; tests are meaningful and run
through caller-facing behavior; verification passed and each command proved a
named invariant; architecture or API changes got code-kb `find_references`, `get_context_slice`, or
`blast_radius`. Cursor's final report is never proof.

## Failure Handling

- **Asks for permission or stalls**: retry once with more directive wording
  and `--force` if already authorized.
- **Loops on a command** (e.g. repeated web requests): kill the run. Installer
  loop: apply Preflight (absolute path, no reinstall). Inside Cursor's run:
  re-dispatch with the web-request ban restated and a narrower task.
- **Edits unassigned files**: revert only Cursor's unapproved edits, then send
  a narrowed fix prompt.
- **Cannot use required MCP tools**: supply lead-gathered context and require
  Cursor to report what it inspected manually.
- **Verification fails**: the lead classifies. Fix prompt only when the
  failure is inside Cursor's scope.
- **Windows "command not found" or single-line prompt**: you ran the bash
  form; use the PowerShell flow.
