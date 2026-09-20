---
name: codex-cli
description: Use when the user says "ask codex", "get codex's take", "codex review", "have codex look at this", "delegate to codex", or any variation naming Codex/OpenAI as the perspective they want. Also use for a generic "second opinion from a different model" when no other model is named.
---

# Codex CLI

Second opinions, code review, adversarial review, and delegation through
`codex exec`. Read `skills/codex-cli/references/shared-cli-review.md` before
the first call: policy gate, redaction, payload transport, completion
contract, and evaluation rules live there. Provider for this skill: `openai`
(policy check in razorback:security-review). Other models: razorback:claude-cli,
razorback:grok-cli, razorback:agy-cli.

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

- **Model / reasoning**: inherit Codex defaults; add `-m` only when the user or
  environment names a model. `-p <profile>` selects a `~/.codex/config.toml`
  profile.
- **Wrapper**: every call goes through `"$SKILL_DIR/scripts/codex-exec"`, which
  forwards its arguments to `codex exec`. On Windows it first replaces the
  Microsoft Store `pwsh` (under `WindowsApps`, whose ACL rejects codex's
  restricted sandbox token: `CreateProcessAsUserW failed: 5`) with the MSI
  build (`C:/Program Files/PowerShell/7`, override `RAZORBACK_PWSH_DIR`) and
  probes `codex sandbox`. A failed preflight exits 2, consumes no invocation,
  and prints the fix. Off Windows it is a pass-through.
- **Sandbox**: `-s read-only` for review and second opinion;
  `--sandbox workspace-write` for delegation (`--full-auto` is deprecated).
  Never pass `-a`/`--ask-for-approval` to `exec`: codex 0.143 removed it
  (`unexpected argument '-a'`). `--dangerously-bypass-approvals-and-sandbox`
  only on explicit user request inside an external sandbox.
- **Always**: `--ephemeral --color never`, `2>/dev/null`, and `< /dev/null`
  (`< NUL` on Windows cmd/PowerShell) on every call that does not pipe a
  prompt. `codex exec` reads stdin to EOF; an open stdin on Windows hangs it
  forever.
- **Working directory**: `-C <dir>`. **Clean capture**: `-o <file>` writes the
  final message to a file.
- **No per-invocation turn/spend caps**: pass no turn cap, spend cap, or other
  ceiling. Every CLI call counts once against the caller's campaign
  `external_invocation_budget`; one internally uncapped invocation does not
  waive the campaign budget. Before a second review call or any multi-reviewer
  dispatch, load `razorback:managing-review-campaigns`.
- **Timeout is a failsafe, not a budget**: 1800000ms (30 min) on every review
  call. Never lower it.
- **Auth**: ChatGPT OAuth. If `codex login status` fails, the user runs
  `codex login`.

## Second Opinion (read-only)

```bash
PROMPT="Your prompt here"
# Redact per shared-cli-review.md (sets REDACTED_PROMPT), then:
"$SKILL_DIR/scripts/codex-exec" --ephemeral --color never -s read-only -C /path/to/project \
  "$REDACTED_PROMPT" < /dev/null 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

Codex reads files itself; name paths in the prompt (no `@file` syntax).

## Code Review

**Native scoped review** (quick codex-flavored pass, no cross-reviewer prompt
parity): `codex exec review --uncommitted | --base <branch> | --commit <sha>`,
optional `--title`, `--output-schema`, `-o`. Exec-level flags (`-C`, `-s`,
`--color`) go BEFORE `review`:

```bash
"$SKILL_DIR/scripts/codex-exec" --color never -C /path/to/project -s read-only \
  review --uncommitted --ephemeral -o /tmp/review.txt "$REDACTED_PROMPT" < /dev/null 2>/dev/null
```

**Unified prompt** (parity with the other reviewer skills):

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
an argument, stdin, or `--prompt-file`.

**Step 3: Send**

```bash
cat "$REVIEW_PROMPT_FILE" | "$SKILL_DIR/scripts/codex-exec" --ephemeral --color never \
  -s read-only --skip-git-repo-check -C "$REVIEW_ROOT" - 2>/dev/null
rm -f -- "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE"; rm -rf -- "$REVIEW_ROOT"
```

## Adversarial Review

**Step 2**: run Code Review Step 2 with the instruction rendered from the
template (see shared-cli-review.md; the block below is the canonical form):

```bash
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
ADVERSARIAL_INSTRUCTION="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}"
```

**Step 3**: OpenAI structured outputs reject `uniqueItems`, `minItems`,
`minLength`, and `minimum` (HTTP 400 `invalid_json_schema`), so sanitize the
canonical schema with `scripts/openai-schema`; `validate-review-output`
enforces the stripped constraints afterwards.

```bash
SCHEMA_FILE=$(mktemp); RESULT_FILE=$(mktemp)
"$SKILL_DIR/scripts/openai-schema" > "$SCHEMA_FILE" || { echo "schema preparation failed" >&2; exit 1; }
trap 'rm -f "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$SCHEMA_FILE"; rm -rf "$REVIEW_ROOT"' EXIT
cat "$REVIEW_PROMPT_FILE" | "$SKILL_DIR/scripts/codex-exec" --ephemeral --color never \
  -s read-only --skip-git-repo-check -C "$REVIEW_ROOT" --output-schema "$SCHEMA_FILE" -o "$RESULT_FILE" - 2>/dev/null
"$SKILL_DIR/scripts/validate-review-output" "$RESULT_FILE"
```

## Delegate a Task

```bash
PROMPT="Task instructions. Apply changes directly."
# Redact per shared-cli-review.md, then:
"$SKILL_DIR/scripts/codex-exec" --ephemeral --color never --sandbox workspace-write -C /path/to/project \
  "$REDACTED_PROMPT" < /dev/null 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

`--add-dir <DIR>` per extra writable directory; `--skip-git-repo-check`
outside a git repo. The exported `$REVIEW_ROOT` has no `.git`, so every
review dispatch against it carries `--skip-git-repo-check`; without it codex
rejects the arguments before any model turn.

## Sessions and Other Projects

- Persistent session: drop `--ephemeral`; follow up with
  `"$SKILL_DIR/scripts/codex-exec" resume --last "$REDACTED_PROMPT" < /dev/null 2>/dev/null`.
- Other project: `-C ~/source/other-project`. Codex follows that project's
  `AGENTS.md` (32KB max).
- Truly fresh reviewer: add `--ignore-user-config --ignore-rules` (auth still
  reads `CODEX_HOME`).
- `/goal` (interactive only): see `references/follow-goals.md`.

## Error Handling

- **Not installed**: `codex --version`; install with `npm install -g @openai/codex`.
- **Windows hang, no output**: stdin stayed open. Kill the process; re-run with
  `< /dev/null` / `< NUL`.
- **Windows `CreateProcessAsUserW failed: 5` / `windows sandbox failed: spawn setup`**:
  the wrapper preflight failed (exit 2, nothing consumed). Install MSI
  PowerShell 7 or set `RAZORBACK_PWSH_DIR`, then dispatch again. Not a finding
  about the code. Do not inline file contents and do not drop to
  `-s danger-full-access` without explicit approval.
- **`--full-auto is deprecated`**: use `--sandbox workspace-write`.
- **`unexpected argument '-a'`**: drop `-a never`; `exec` never prompts.
- **Rate limit** (5-hour rolling window), **timeout tripped**, **empty output**:
  see shared-cli-review.md. Do not re-run a burned attempt.
