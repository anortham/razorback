---
name: agy-cli
description: >-
  Use when the user says "ask agy", "get agy's take", "agy review", "have agy look at this", "delegate to agy", or any variation naming Antigravity, AGY, or Google/Gemini as the perspective they want.
---

# Antigravity CLI

Second opinions, code review, adversarial review, and delegation to Google
Gemini models through `agy`. Read
`skills/codex-cli/references/shared-cli-review.md` before the first call:
policy gate, redaction, payload transport, completion contract, and evaluation
rules live there. Provider for this skill: `google` (policy check in
razorback:security-review). Other models: razorback:codex-cli (default when
none is named), razorback:claude-cli, razorback:grok-cli.

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

## Pre-flight

`agy models` (keep stderr). Model list and exit 0: ready. Exit 127: install
`agy` on `PATH`. Other non-zero or network error: run `agy` interactively to
refresh credentials (session lives in `~/.gemini/antigravity-cli/`).

## Defaults

- **Model / effort**: inherit (`gemini-3.8-flash-high` at time of writing);
  `--model <MODEL>` and `--effort low|medium|high` only on explicit choice.
  Set `AGY_MODEL` / `AGY_EFFORT` and let `${VAR:+--flag "$VAR"}` add the flag.
- **Prompt**: `-p, --print <PROMPT>` (alias `--prompt`) for a string argument.
  For a file or pipe, omit `-p` and redirect stdin (`agy < FILE`); `-p` with
  no value fails with `flag needs an argument: -p`.
- **Sandbox**: `--sandbox` runs with terminal restrictions enabled; use it for
  second opinion and review. Omit it for delegation.
- **`--dangerously-skip-permissions`** on every headless tool-using run:
  headless mode cannot prompt, so tool calls are auto-denied without it (this
  flag makes them auto-approve).
- **`--disable-slash-commands`** in print mode so prompt text is never parsed
  as a slash command or skill expansion.
- **Structured output**: `--json-schema '<JSON>'` plus `--output-format json`
  returns an envelope with `.structured_output`, `.response`, `.usage`,
  `.num_turns`, `.conversation_id`. Gemini rejects `$schema` and
  `enum: [true]` on booleans; sanitize with
  `jq -c 'del(."$schema") | .properties.review_completed = {"type": "boolean"}'`.
- **Working directory**: shell cwd; `cd` first. `--add-dir <DIR>` exposes
  extra directories.
- **Stderr**: keep it. **stdin**: `< /dev/null` (`< NUL` on Windows) on `-p`
  calls; `< "$REVIEW_PROMPT_FILE"` when piping.
- **No per-invocation turn/spend caps**: pass no `--max-turns` or other
  ceiling. Every CLI call counts once against the caller's campaign
  `external_invocation_budget`; one internally uncapped invocation does not
  waive the campaign budget. Before a second review call or any multi-reviewer
  dispatch, load `razorback:managing-review-campaigns`.
- **Timeout is a failsafe, not a budget**: 1800000ms (30 min) on every review
  call, plus `--print-timeout 30m` because agy's default print wait is 5
  minutes (`5m0s`). Never lower either.

## Second Opinion (read-only)

```bash
PROMPT="Your prompt here"
# Redact per shared-cli-review.md (sets REDACTED_PROMPT), then:
cd /path/to/project && agy -p "$REDACTED_PROMPT" \
  --sandbox --disable-slash-commands \
  ${AGY_MODEL:+--model "$AGY_MODEL"} ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

## Code Review (read-only)

**Step 1**: resolve `$DIFF`, `$TARGET`, `$RANGE`, and foreground/background per
Review Targeting.

**Step 2: Build the prompt**

```bash
PROJECT_DIR=$(git rev-parse --show-toplevel)
REVIEW_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/razorback-review-tree.XXXXXX")
if ! "$SKILL_DIR/../pre-merge-review/scripts/prepare-review-tree" \
  "$PROJECT_DIR" HEAD "$REVIEW_ROOT" >/dev/null; then
  rm -rf -- "$REVIEW_ROOT"; exit 1
fi
if [ -n "${RANGE:-}" ]; then
  FILE_STAT=$(git -C "$PROJECT_DIR" diff --stat "$RANGE")
  COMMIT_LOG=$(git -C "$PROJECT_DIR" log --oneline "$RANGE")
else
  FILE_STAT=$(git -C "$PROJECT_DIR" diff --stat --cached; git -C "$PROJECT_DIR" diff --stat)
  COMMIT_LOG=$(git -C "$PROJECT_DIR" log -1 --oneline HEAD)
fi
REVIEW_INSTRUCTION="Review the complete code-change bundle for bugs, security issues, correctness problems, and material improvements. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence."

PAYLOAD_FILE=$(mktemp); REDACTED_PAYLOAD_FILE=$(mktemp)
{
  printf '%s\n\n' "$REVIEW_INSTRUCTION"
  if [ -n "${FOCUS:-}" ]; then printf 'Focus area: %s\n\n' "$FOCUS"; fi
  printf 'Target: %s\nFile stat:\n%s\nCommit log:\n%s\nDiff:\n%s' "$TARGET" "$FILE_STAT" "$COMMIT_LOG" "$DIFF"
} > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"; rm -rf -- "$REVIEW_ROOT"
  echo "outbound redaction failed" >&2
  exit 1
fi
rm -f -- "$PAYLOAD_FILE"
if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$REDACTED_PAYLOAD_FILE"; rm -rf -- "$REVIEW_ROOT"
  echo "review artifact preparation failed" >&2
  exit 1
fi
REVIEW_PROMPT_FILE="$REDACTED_PAYLOAD_FILE"
if [ "$REVIEW_ARTIFACT" != inline ]; then
  REVIEW_PROMPT_FILE=$(mktemp)
  printf '%s\n\n%s\n%s\n%s\n\n%s\n' \
    'Read and follow the complete redacted review bundle at:' "$REVIEW_ARTIFACT" \
    'The bundle contains the complete review instructions; follow them.' \
    'Use the available read-only tools to inspect that file.' \
    'Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence.' \
    > "$REVIEW_PROMPT_FILE"
fi
```

A payload over 128 KiB is written by `prepare-review-artifact` to
`.razorback-review/review-input.md` inside `$REVIEW_ROOT`; the prompt is then
the concise wrapper naming the artifact path. Do not reload the artifact into
an argument or stdin.

**Step 3: Send with schema** (prompt on stdin, no `-p`)

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema") | .properties.review_completed = {"type": "boolean"}' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
RESULT_FILE=$(mktemp); NORMALIZED_RESULT_FILE=$(mktemp); STDERR_FILE=$(mktemp)
trap 'rm -f "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$NORMALIZED_RESULT_FILE" "$STDERR_FILE"; rm -rf "$REVIEW_ROOT"' EXIT

AGY_STATUS=0
cd "$REVIEW_ROOT" && agy \
  --json-schema "$SCHEMA_JSON" --output-format json \
  --sandbox --dangerously-skip-permissions --disable-slash-commands \
  --print-timeout 30m \
  ${AGY_MODEL:+--model "$AGY_MODEL"} ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < "$REVIEW_PROMPT_FILE" > "$RESULT_FILE" 2> "$STDERR_FILE" || AGY_STATUS=$?
cat "$STDERR_FILE" >&2
[ "${AGY_STATUS:-0}" -eq 0 ] || { echo "Antigravity review invocation failed" >&2; exit 1; }
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE" \
  || { echo "Antigravity did not return a completed review" >&2; exit 1; }
cat "$NORMALIZED_RESULT_FILE"
```

Accept only the normalized output (`validate-review-output RESULT_FILE`).

## Adversarial Review

Run Code Review with `$ADVERSARIAL_INSTRUCTION` (rendered from
`$SKILL_DIR/adversarial-prompt.txt` per shared-cli-review.md) in place of
`$REVIEW_INSTRUCTION` in Step 2; Step 3 is unchanged.

## Delegate a Task

```bash
PROMPT="Task instructions. Apply changes directly."
# Redact per shared-cli-review.md, then:
cd /path/to/project && agy -p "$REDACTED_PROMPT" \
  --dangerously-skip-permissions --disable-slash-commands \
  ${AGY_MODEL:+--model "$AGY_MODEL"} ${AGY_EFFORT:+--effort "$AGY_EFFORT"} \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

No `--sandbox`, so agy can write files and run build/test commands.

## Sessions and Other Projects

- agy saves conversations by default. Continue the latest:
  `agy -c -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null`;
  by id: `agy --conversation <ID> -p "$REDACTED_PROMPT" --dangerously-skip-permissions < /dev/null`.
- Other project: `cd` into it; agy reads its `AGENTS.md` / `GEMINI.md`.

## Error Handling

- **`jetski: no output produced — a tool required the ... permission that headless mode cannot prompt for`**:
  add `--dangerously-skip-permissions`.
- **Schema 400 `review_completed.enum[0]: cannot be empty`**: sanitize the
  schema with the `jq` filter in Defaults.
- **`flag needs an argument: -p`**: you combined `-p` with redirected stdin.
  Omit `-p` when piping; use `-p "$PROMPT" < /dev/null` for a string.
- **Not installed**: `command -v agy` fails and `~/.local/bin/agy` is missing.
- **Empty output**: check stderr and `~/.gemini/antigravity-cli/cli.log`.
- **Rate limit / quota**, **timeout tripped**: see shared-cli-review.md. Do not
  re-run a burned attempt.
