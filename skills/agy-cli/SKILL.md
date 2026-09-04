---
name: agy-cli
description: >-
  Use when the user says "ask agy", "get agy's take", "agy review", "have agy look at this", "delegate to agy", or any variation naming Antigravity, AGY, or Google/Gemini as the perspective they want.
---

# Antigravity CLI Assistant

Use the Antigravity CLI (`agy -p`) to get a second opinion, review code
changes, run adversarial security/correctness reviews, or delegate tasks to
Google / Gemini models.

## Overview

Antigravity CLI (`agy`) runs Google's Gemini models with native tool use and
MCP server support. Two constraints shape every recipe here. First, Gemini API's
structured output rejects `$schema` and rejects `enum: [true]` on boolean
properties; sanitize the canonical schema with `jq` before passing it to
`--json-schema`. Second, every outbound payload passes the Outbound Payload
Redaction guard exactly once; recipes use only the redacted output.

Use this skill when the user names Antigravity, AGY, or Google/Gemini. For a
generic second opinion with no model named, razorback:codex-cli is the default.
When the user names Claude as the fresh perspective, use razorback:claude-cli;
for Grok, razorback:grok-cli.

## Defaults

- **Model**: inherit the current Antigravity default (`gemini-3.8-flash-high` at
  time of writing) unless the user or environment explicitly selects one with
  `--model <MODEL>`. `agy models` lists the available models.
- **Reasoning effort**: `--effort <EFFORT>` accepts `low | medium | high`. Omit
  it unless the user or environment explicitly selects one.
- **Headless single-turn**: `-p, --print <PROMPT>` (alias `--prompt <PROMPT>`)
  prints the response to stdout and exits. When prompt content comes from a file
  or pipe on stdin, omit `-p` and pipe directly (`agy < FILE`). Do not pass `-p`
  without an argument.
- **Sandbox mode**: `--sandbox` runs in a sandbox with terminal restrictions
  enabled. Use `--sandbox` for read-only review and second opinion to ensure
  safe execution.
- **Non-interactive approvals**: pass `--dangerously-skip-permissions` on
  headless tool-using runs. In headless mode, `agy` cannot prompt the user for
  tool approvals; without this flag, tool calls (such as file reads or terminal
  commands) are auto-denied.
- **Disable slash commands**: pass `--disable-slash-commands` in print mode so
  the prompt text is never parsed for slash commands or skill expansions.
- **Working directory**: `agy` operates in the shell's current working
  directory. `cd` to the project root before invoking. Use `--add-dir <DIR>` if
  additional directories must be visible to the session.
- **Structured output**: `--json-schema '<SCHEMA JSON STRING>'` constrains the
  model to JSON matching the schema and populates `.structured_output` in the
  JSON envelope. Google Gemini API rejects `$schema` and rejects `enum: [true]`
  on boolean properties. Sanitize the canonical schema with
  `jq -c 'del(."$schema") | .properties.review_completed = {"type": "boolean"}'`.
- **Output format**: `--output-format json` returns a result envelope containing
  `.structured_output`, `.response`, `.usage`, `.duration_seconds`, `.num_turns`,
  and `.conversation_id`.
- **Stderr**: Keep stderr available for diagnostics.
- **stdin**: In print mode with `-p`, append `< /dev/null` (bash) / `< NUL`
  (Windows cmd/PowerShell) to every invocation that doesn't intentionally pipe
  input, as cheap insurance against a held-open pipe. When piping prompt text,
  redirect stdin directly (`< "$REVIEW_PROMPT_FILE"`).
- **No per-invocation turn/spend caps**: razorback does not pass `--max-turns`,
  and it passes no other mechanical ceiling to a reviewer. Any such cap
  truncates a review mid-flight and trades finding quality for a few cents.
  Review depth is the point; do not add the flag back. These uncapped settings
  apply inside one CLI invocation only. Every CLI call counts once against the
  caller's campaign `external_invocation_budget`; one internally uncapped
  invocation does not waive the campaign budget. Before a second review call
  or any multi-reviewer dispatch, load and follow
  `razorback:managing-review-campaigns`. A user who wants a hard per-invocation
  ceiling sets it themselves.
- **Timeout is a failsafe, not a budget**: set 1800000ms (30 min) on every
  review invocation. Pass `--print-timeout 30m` to `agy` because its default
  print-mode wait is 5 minutes (`5m0s`). It exists to catch a process that hung
  or died and will never return — nothing else. It is not a bound on how long a
  review may take, and it is not a cost dial. Scope the review in the prompt and
  let the reviewer finish the job. Never tune it down to make a run cheaper.
- **Auth**: Authenticated session managed by Antigravity CLI in
  `~/.gemini/antigravity-cli/`. Run `agy models` to confirm readiness.

## Policy Gate

Before sending any diff or repo content to Google, apply the external-model
policy check in razorback:security-review. Provider for this skill: `google`.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies `google` → refuse the dispatch
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

Immediately before every Antigravity dispatch, write the fully constructed payload to
`PAYLOAD_FILE` and pass it through `$SKILL_DIR/../security-review/scripts/redact-outbound`.
Use only `REDACTED_PAYLOAD_FILE` for the invocation; never log matched material.
If redaction fails, remove both files, emit only a generic error, and stop before
Antigravity receives any input. Review and adversarial bundles use the shared
`prepare-review-artifact` helper: small bundles stay in the redacted prompt file,
while large bundles are kept in the reviewer-root-local artifact and the CLI
receives only a concise prompt file.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "$PROMPT" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

## Pre-flight Check

Verify that `agy` is installed and authenticated by listing available models.
Keep stderr for startup diagnostics.

```bash
agy models
```

| stdout / result | Meaning | What to do |
|---|---|---|
| Model list printed (exits 0) | Ready | Proceed |
| `command not found` / exit 127 | Binary missing or not on `PATH` | Ensure `agy` is installed and in `PATH`. |
| Network error or exit non-zero | Authentication or backend failure | Verify internet connection and run `agy` interactively to refresh credentials. |

## Review Targeting

Scope selection (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing heuristic are shared across razorback's reviewer
skills: load `review-targeting.md` from razorback's using-razorback references
when selecting scope. It resolves `$DIFF`, `$TARGET`, and `$RANGE`; read
"the reviewer" there as `agy -p`.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants Antigravity's take on an approach, design decision, or piece of code.
No file changes needed.

```bash
PROMPT="Your prompt here"
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "$PROMPT" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true

cd /path/to/project && agy -p "$REDACTED_PROMPT" \
  --sandbox \
  --disable-slash-commands \
  ${AGY_MODEL:+--model "$AGY_MODEL"} \
  ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

`--sandbox` restricts shell actions to terminal boundaries. Antigravity runs in the
project directory and inspects files.

**After**: Show Antigravity's response, then add your own analysis. Where you agree,
say so. Where you disagree, explain why with evidence. The user gets two
perspectives.

### Code Review (read-only)

The user wants a review of current changes. Inherit the current default model
unless the user or environment explicitly selects one.

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above.

**Step 2: Build the prompt**

Use the shared `review-payload.md` (in the `razorback:security-review` skill)
contract. For a standalone review, export the reviewed `HEAD` tree first so a
large bundle has a readable, `.git`-free workspace:

```bash
PROJECT_DIR=$(git rev-parse --show-toplevel)
REVIEW_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/razorback-review-tree.XXXXXX")
if ! "$SKILL_DIR/../pre-merge-review/scripts/prepare-review-tree" \
  "$PROJECT_DIR" HEAD "$REVIEW_ROOT" >/dev/null; then
  rm -rf -- "$REVIEW_ROOT"
  exit 1
fi

if [ -n "${RANGE:-}" ]; then
  FILE_STAT=$(git -C "$PROJECT_DIR" diff --stat "$RANGE")
  COMMIT_LOG=$(git -C "$PROJECT_DIR" log --oneline "$RANGE")
else
  FILE_STAT=$(git -C "$PROJECT_DIR" diff --stat --cached; git -C "$PROJECT_DIR" diff --stat)
  COMMIT_LOG=$(git -C "$PROJECT_DIR" log -1 --oneline HEAD)
fi

REVIEW_INSTRUCTION="Review the complete code-change bundle for bugs, security issues, correctness problems, and material improvements. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence."

PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
{
  printf '%s\n\n' "$REVIEW_INSTRUCTION"
  if [ -n "${FOCUS:-}" ]; then
    printf 'Focus area: %s\n\n' "$FOCUS"
  fi
  printf 'Target: %s\n' "$TARGET"
  printf 'File stat:\n%s\n' "$FILE_STAT"
  printf 'Commit log:\n%s\n' "$COMMIT_LOG"
  printf 'Diff:\n%s' "$DIFF"
} > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" \
  < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "outbound redaction failed" >&2
  exit 1
fi
rm -f -- "$PAYLOAD_FILE"

if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" \
  "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "review artifact preparation failed" >&2
  exit 1
fi
REVIEW_PROMPT_FILE="$REDACTED_PAYLOAD_FILE"
if [ "$REVIEW_ARTIFACT" != inline ]; then
  REVIEW_PROMPT_FILE=$(mktemp)
  printf '%s\n\n%s\n%s\n%s\n\n%s\n' \
    'Read and follow the complete redacted review bundle at:' \
    "$REVIEW_ARTIFACT" \
    'The bundle contains the complete review instructions; follow them.' \
    'Use the available read-only tools to inspect that file.' \
    'Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence.' \
    > "$REVIEW_PROMPT_FILE"
fi
```

The complete redacted bundle contains the target, file stat, commit log, and
resolved diff. A payload over 128 KiB is written by
`prepare-review-artifact` to `.razorback-review/review-input.md` inside
`$REVIEW_ROOT`; the CLI prompt contains only the concise instruction and
artifact path. Do not reload the artifact into an argument or stdin: the
artifact path points the reviewer to the file inside `$REVIEW_ROOT`. Payloads
at or below the threshold remain the normal prompt file.

**Step 3: Send to Antigravity with schema enforcement**

Sanitize the canonical schema with `jq` to remove `$schema` and convert
`review_completed` to a standard boolean:

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema") | .properties.review_completed = {"type": "boolean"}' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
RESULT_FILE=$(mktemp)
NORMALIZED_RESULT_FILE=$(mktemp)
STDERR_FILE=$(mktemp)
trap 'rm -f "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$NORMALIZED_RESULT_FILE" "$STDERR_FILE"; rm -rf "$REVIEW_ROOT"' EXIT

AGY_STATUS=0
cd "$REVIEW_ROOT" && agy \
  --json-schema "$SCHEMA_JSON" \
  --output-format json \
  --sandbox \
  --dangerously-skip-permissions \
  --disable-slash-commands \
  --print-timeout 30m \
  ${AGY_MODEL:+--model "$AGY_MODEL"} \
  ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < "$REVIEW_PROMPT_FILE" > "$RESULT_FILE" 2> "$STDERR_FILE" || AGY_STATUS=$?
cat "$STDERR_FILE" >&2

if [ "${AGY_STATUS:-0}" -ne 0 ]; then
  echo "Antigravity review invocation failed" >&2
  exit 1
fi

if ! "$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE"; then
  echo "Antigravity did not return a completed review" >&2
  exit 1
fi
cat "$NORMALIZED_RESULT_FILE"
```

Notice that prompt input is piped via `< "$REVIEW_PROMPT_FILE"` without `-p`.
`--dangerously-skip-permissions` allows the agent to inspect files in the review
root non-interactively, while `--sandbox` keeps terminal execution confined.

**After**: `--output-format json` returns a result envelope with `.structured_output`.
`validate-review-output` normalizes the output, verifies that `review_completed: true`
is present, verifies that inspected files and concrete evidence exist, and rejects
reviews citing only the review bundle.

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" RESULT_FILE > normalized.json
jq '.findings[]?' < normalized.json
```

Present findings, add your own assessment. Highlight agreements and
disagreements. Call out anything Antigravity missed.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured prompt that tells Antigravity to actively try to break confidence in
the change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the adversarial prompt.** Run Code Review Step 2 unchanged up
to its `REVIEW_INSTRUCTION=` line. In its place, render the instruction from
the canonical template (after `$TARGET` resolves), then finish Step 2's
payload build with `$ADVERSARIAL_INSTRUCTION` substituted for
`$REVIEW_INSTRUCTION` and the `Focus area:` lines dropped (already rendered in
template):

```bash
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
ADVERSARIAL_INSTRUCTION="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}"
```

**Step 3: Run the review with schema enforcement.** Run Code Review Step 3
identically. Validate with `validate-review-output`.

**After**: Parse the normalized output from `validate-review-output`. Present
findings grouped by severity (critical first). For each finding, show the file,
lines, and recommendation. Add your own assessment of each finding.

### Delegate a Task

The user wants Antigravity to actually perform implementation work: write code,
refactor, or fix a bug. Antigravity needs tool and write access.

```bash
PROMPT="Your task instructions here. Apply changes directly."
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "$PROMPT" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true

cd /path/to/project && agy -p "$REDACTED_PROMPT" \
  --dangerously-skip-permissions \
  --disable-slash-commands \
  ${AGY_MODEL:+--model "$AGY_MODEL"} \
  ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

Omit `--sandbox` so Antigravity can write files and run build/test commands.
`--dangerously-skip-permissions` allows headless execution without waiting for
approval prompts.

**After**: Summarize what Antigravity changed. Run `git diff --stat` in the project
to inspect the scope, then review the changes yourself. Flag anything wrong or
improvable.

## Adversarial Prompt Template

The canonical adversarial prompt lives in this skill at
`./adversarial-prompt.txt` (version-controlled). Read it and replace the
`{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` placeholders at
runtime, as the Adversarial Review invocation above does.

It is the Antigravity variant of a deliberate quartet:
`../codex-cli/adversarial-prompt.txt`, `../claude-cli/adversarial-prompt.txt`,
and `../grok-cli/adversarial-prompt.txt` are identical across their shared
sections (`OPERATING STANCE`, `ATTACK SURFACE`, `FINDING BAR`, `CALIBRATION`,
`GROUNDING`, `INPUT TRUST`). Keep the four in sync when editing any.

## Resuming a Session

`agy` saves conversations by default and supports resuming by ID or continuing
the latest session:

```bash
# Continue the most recent conversation in this workspace
agy -c -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null

# Resume a specific conversation by ID
agy --conversation <CONVERSATION_ID> -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null
```

Every follow-up prompt must pass through the Outbound Payload Redaction guard
before dispatch.

## Cross-Project Usage

`agy` discovers project instructions (`AGENTS.md` / `GEMINI.md`) and workspace
customizations from the current working directory up to the repository root.
To target a different project, `cd` into it:

```bash
cd ~/source/other-project && agy -p "$REDACTED_PROMPT" \
  --sandbox \
  --disable-slash-commands \
  < /dev/null
```

If multiple directories need to be accessible within the same session, supply
`--add-dir <DIR>` for each additional directory.

## Critical Evaluation

Antigravity is a peer, not an authority. It runs on Google's Gemini models with
their own strengths and blind spots.

- **Trust your own knowledge** when confident. If Antigravity says something you
  know is wrong, say so directly with evidence.
- **Research disagreements.** Different models reason differently. Check the
  code rather than deferring.
- **Don't defer.** Evaluate suggestions critically. The point of a second
  opinion is two independent perspectives.
- **Adversarial review findings need validation.** Antigravity in adversarial
  mode actively hunts for vulnerabilities and weaknesses. Filter out speculative
  or unsupported findings.

When you disagree, tell the user clearly: what Antigravity said, why you think
it is wrong, and your evidence.

## Error Handling

- **Auto-denied permissions in headless mode**: if stdout outputs `jetski: no output produced — a tool required the ... permission that headless mode cannot prompt for`, pass `--dangerously-skip-permissions` to auto-approve tool use in non-interactive sessions.
- **Schema 400 error (`review_completed.enum[0]: cannot be empty`)**: Gemini API's JSON-schema converter rejects `enum: [true]` on boolean properties. Sanitize the canonical schema with `jq -c 'del(."$schema") | .properties.review_completed = {"type": "boolean"}'`.
- **`flag needs an argument: -p`**: you passed `-p` with no argument or redirected stdin with `-p`. When piping or redirecting input from a file, omit `-p` (`agy < FILE`). Use `-p` only with an explicit string argument (`agy -p "$PROMPT" < /dev/null`).
- **Rate limits / quotas**: Google Cloud or API quotas may apply. If a rate limit is reached, inform the user. Do NOT shrink the prompt or downgrade model effort to squeeze the review through.
- **Timeout tripped**: a review that runs 10-20+ minutes is working, not stuck — that is why the failsafe sits at 30 min. If the failsafe trips, the process hung or died; the diff was not "too big". Do NOT raise the timeout and re-run, and do NOT split the diff into smaller chunks. Check stderr, then treat it as reviewer unavailability.
- **Empty output**: if stdout is empty, check stderr for diagnostic output and check `~/.gemini/antigravity-cli/cli.log`.
- **Antigravity CLI not installed**: `command -v agy` fails and `~/.local/bin/agy` is missing. Install per Antigravity CLI documentation.

## Quick Reference

Inherit the current Antigravity default. Only override with `--model` or
`--effort` when the user or environment gives a concrete value.

All non-piped patterns include `< /dev/null` (bash) / `< NUL` (Windows) to
prevent held-open stdin hangs.

Every structured result must pass `validate-review-output RESULT_FILE` before it
is accepted.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `cd dir && agy -p "$REDACTED_PROMPT" --sandbox --disable-slash-commands ${AGY_MODEL:+--model "$AGY_MODEL"} < /dev/null` |
| Code review | read-only + schema | `SCHEMA_JSON=$(jq -c 'del(."$schema") \| .properties.review_completed = {"type": "boolean"}' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")` then `cd "$REVIEW_ROOT" && agy --json-schema "$SCHEMA_JSON" --output-format json --sandbox --dangerously-skip-permissions --disable-slash-commands < "$REVIEW_PROMPT_FILE"`. Normalize with `validate-review-output RESULT_FILE`. |
| Adversarial review | read-only + schema | Build prompt from `$SKILL_DIR/adversarial-prompt.txt` (see Adversarial Review), then code review command. |
| Delegate (complex) | workspace-write | `cd dir && agy -p "$REDACTED_PROMPT" --dangerously-skip-permissions --disable-slash-commands < /dev/null` |
| Pre-flight / auth check | any | `"$AGY_BIN" models` with stderr kept. Exits 0 and lists models when authenticated. |
| Apply explicit model/effort | any | Add `--model "$AGY_MODEL"` / `--effort "$AGY_EFFORT"` when set |
| Resume session | persistent | `agy -c -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null` or `agy --conversation <ID> -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null` |
| Structured output shape | any | Envelope contains `.structured_output`, `.response`, `.usage`; normalize and validate with `validate-review-output RESULT_FILE`. |

## It's working if

- The dispatch used only the redacted payload file, and the temp files are gone afterward.
- A structured review passed `validate-review-output` with `review_completed: true`.
- The user got Antigravity's view AND your own agree/disagree assessment, not a relay.
