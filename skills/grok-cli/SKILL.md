---
name: grok-cli
description: Use when the user says "ask grok", "get grok's take", "grok review", "have grok look at this", "delegate to grok", or any variation naming Grok/xAI as the perspective they want.
---

# Grok CLI

Second opinions, code review, adversarial review, and delegation to xAI
models through `grok -p`. Read
`skills/codex-cli/references/shared-cli-review.md` before the first call:
policy gate, redaction, payload transport, completion contract, and evaluation
rules live there. Provider for this skill: `xai` (policy check in
razorback:security-review). Other models: razorback:codex-cli (default when
none is named), razorback:claude-cli, razorback:agy-cli.

Two Grok-specific rules: never pass `--json-schema` on the review pass (a
schema-constrained call ends after one turn with no tool use and no findings;
structure the result in a second pass on the same session), and never discard
stderr.

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

## Pre-flight Check

`grok models` is a full CLI start, not an auth status command. When the binary
runs it always prints a model list and exits 0; the login line on stdout is
the only auth signal. Keep stderr.

```bash
GROK_BIN=$(command -v grok || true)
: "${GROK_BIN:=$HOME/.local/bin/grok}"
[ -x "$GROK_BIN" ] || GROK_BIN="$HOME/.grok/bin/grok"
"$GROK_BIN" models
```

| stdout / result | Meaning | What to do |
|---|---|---|
| `You are logged in with grok.com.` | Ready | Proceed |
| `You are not authenticated.` and `~/.grok/auth.json` exists | This process cannot see credentials (sandbox, wrong `HOME`) | Do **not** run `grok login`. Re-run from a shell that can read `~/.grok/auth.json`. |
| `You are not authenticated.` and `~/.grok/auth.json` is missing | No session on disk | Run `grok login` (`--device-auth` on a headless host). |
| `command not found` / exit 127 | Binary missing or not on `PATH` | Try `~/.local/bin/grok` and `~/.grok/bin/grok`. Do **not** run `grok login`. |
| empty stdout, timeout, or a network/settings error | Probe failed | Keep stderr. Retry once. Do **not** run `grok login`. |

## Defaults

- **Model / reasoning**: inherit (`grok-4.5` at time of writing); `-m, --model`
  and `--reasoning-effort` (alias `--effort`) only on explicit choice. Set
  `GROK_MODEL` / `GROK_EFFORT` and let `${VAR:+--flag "$VAR"}` add the flag.
- **Sandbox**: `--sandbox <PROFILE>`. On Grok 1.0.13 built-in profiles are
  `off`, `workspace`, `devbox`, `read-only`, and `strict`. There is no
  built-in `none` or `danger-full-access` profile. `read-only` for second
  opinion; `workspace` for delegation; `workspace` plus the read-only tool
  allowlist `--tools "Read,Grep,Glob"` for review (see Step 3).
- **Headless prompt**: `-p, --single <PROMPT>` or `--prompt-file <PATH>`,
  never both (`grok -p --prompt-file FILE` exits 2 with
  `a value is required for '--single <PROMPT>'`).
- **`--always-approve`** (alias `--yolo`, `--permission-mode bypassPermissions`)
  on every headless run, including read-only ones. Without it any shell form
  outside Grok's small allowlist resolves as `permission_cancelled`: the whole
  turn is cancelled, the process often exits 0, and stdout is empty. Sandbox
  and approvals are orthogonal; `--sandbox read-only` still blocks writes.
- **Working directory**: `--cwd <CWD>`.
- **Structured output**: `--json-schema '<JSON>'` implies `--output-format
  json`; use it only on the structuring pass.
- **Stderr**: Grok 1.0.13 puts banners and startup failures on stderr, so
  stdout/JSON remains clean while stderr must remain available. Never send
  stderr to the null device on any recipe.
- **stdin**: `grok -p` does not block on stdin, but keep `< /dev/null`
  (`< NUL` on Windows) on non-piped calls.
- **No per-invocation turn/spend caps**: pass no `--max-turns` or other
  ceiling. Every CLI call counts once against the caller's campaign
  `external_invocation_budget`; one internally uncapped invocation does not
  waive the campaign budget. Before a second review call or any multi-reviewer
  dispatch, load `razorback:managing-review-campaigns`.
- **Timeout is a failsafe, not a budget**: 1800000ms (30 min) on every review
  call. Never lower it.
- **Auth**: `grok login` (`--oauth` default, `--device-auth` headless). There
  is no `grok auth status`; classify `grok models` per Pre-flight Check.

## Recipes

### Second Opinion (read-only)

```bash
PROMPT="Your prompt here"
# Redact per shared-cli-review.md (sets REDACTED_PROMPT), then:
grok -p "$REDACTED_PROMPT" --sandbox read-only --always-approve --cwd /path/to/project < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

### Code Review (read-only)

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

The complete redacted bundle holds target, file stat, commit log, and diff. A
payload over 128 KiB is written by `prepare-review-artifact` to
`.razorback-review/review-input.md` inside `$REVIEW_ROOT`; the prompt is then
the concise wrapper naming the artifact path. Do not reload the artifact into
an argument, stdin, or `--prompt-file`: `--prompt-file` is prompt transport,
not a review-artifact mechanism. Tool use is not completion proof; the
validator in Step 4 decides.

**Step 3: Review pass (no `--json-schema`)**

With a schema, Grok answers in one turn (`num_turns: 1`, zero tool calls, a
future-tense summary, `findings: []`, the bundle as its only evidence),
regardless of payload size. Use `--sandbox workspace` with
`--tools "Read,Grep,Glob"`: `read-only` and `strict` carry a container-runtime
deny list and refuse to start on hosts where a denied socket path cannot be
resolved, and the reviewer holds no write tool inside a throwaway export
anyway.

```bash
REVIEW_SESSION_ID=$(uuidgen)
RESULT_FILE=$(mktemp); NORMALIZED_RESULT_FILE=$(mktemp); STDERR_FILE=$(mktemp)
trap 'rm -f "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$NORMALIZED_RESULT_FILE" "$STDERR_FILE"; rm -rf "$REVIEW_ROOT"' EXIT

GROK_STATUS=0
grok --prompt-file "$REVIEW_PROMPT_FILE" \
  --session-id "$REVIEW_SESSION_ID" \
  --sandbox workspace --tools "Read,Grep,Glob" --always-approve \
  --cwd "$REVIEW_ROOT" --output-format json \
  ${GROK_MODEL:+--model "$GROK_MODEL"} ${GROK_EFFORT:+--effort "$GROK_EFFORT"} \
  < /dev/null > "$RESULT_FILE" 2> "$STDERR_FILE" || GROK_STATUS=$?
cat "$STDERR_FILE" >&2
if grep -Eiq 'sandbox profile resolve failed|runtime-socket|denied paths unprotected|missing or unusable .?bwrap.?' "$STDERR_FILE"; then
  echo "Grok sandbox startup failed before a session was created" >&2; exit 1
fi
[ "${GROK_STATUS:-0}" -eq 0 ] || { echo "Grok review invocation failed before completion validation" >&2; exit 1; }
if [ "$(jq -r '.num_turns // 0' < "$RESULT_FILE")" -lt 2 ]; then
  echo "Grok answered in one turn without inspecting anything — not a review" >&2; exit 1
fi
```

**Step 4: Structuring pass** (resume the same session; one turn is correct
here). Omit `--sandbox` on resume: Grok reuses the session's profile and
refuses a different one.

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
STRUCTURE_FILE=$(mktemp); REDACTED_STRUCTURE_FILE=$(mktemp)
printf '%s' "Return your completed review as JSON matching the required schema. Use only the findings you already established. Set review_completed=true, list the repository files you inspected in files_inspected, and give concrete file/line evidence. Do not start a new review." > "$STRUCTURE_FILE"
"$SKILL_DIR/../security-review/scripts/redact-outbound" < "$STRUCTURE_FILE" > "$REDACTED_STRUCTURE_FILE" \
  || { rm -f -- "$STRUCTURE_FILE" "$REDACTED_STRUCTURE_FILE"; echo "outbound redaction failed" >&2; exit 1; }

STRUCTURE_STATUS=0
grok -r "$REVIEW_SESSION_ID" --prompt-file "$REDACTED_STRUCTURE_FILE" \
  --always-approve --cwd "$REVIEW_ROOT" --json-schema "$SCHEMA_JSON" \
  < /dev/null > "$RESULT_FILE" 2> "$STDERR_FILE" || STRUCTURE_STATUS=$?
cat "$STDERR_FILE" >&2
rm -f -- "$STRUCTURE_FILE" "$REDACTED_STRUCTURE_FILE"
[ "${STRUCTURE_STATUS:-0}" -eq 0 ] || { echo "Grok structuring pass failed: no resumable session, or the resume errored" >&2; exit 1; }
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE" \
  || { echo "Grok did not return a completed review" >&2; exit 1; }
cat "$NORMALIZED_RESULT_FILE"
```

Envelope: `.structuredOutput`, `.text`, `.usage`, `.total_cost_usd`. Accept
only the output of `validate-review-output RESULT_FILE`.

### Standalone Review Completion

A standalone review predeclares in `razorback:managing-review-campaigns`:
`evidence_target: external-reviewed`, `external_invocation_budget: 2`,
`max_rounds: 2`. The free-form pass is 1/2 and the structuring pass is 2/2;
the structuring pass is not a retry and buys no discovery. The first call
names the session with `--session-id`; the second call resumes that exact session
with `-r`. A successful exit does not prove a session exists; let the resume
fail loudly. A rejected result closes the campaign `blocked` or
`capped` at 2/2. No third call, and a fresh sweep is never the answer.

A sandbox startup failure creates no session, so the campaign is terminal there
and the same-session continuation cannot be used. Recover with `--sandbox
workspace` plus the `--tools "Read,Grep,Glob"` allowlist; drop to
`--sandbox off` only in a new explicit user-approved campaign, when
`workspace` also refuses to start. `grok inspect` reports configuration; it is
not a sandbox capability probe.

### Adversarial Review

Run Code Review with `$ADVERSARIAL_INSTRUCTION` (rendered from
`$SKILL_DIR/adversarial-prompt.txt` per shared-cli-review.md) in place of
`$REVIEW_INSTRUCTION` in Step 2. Steps 3-4 unchanged, except the structuring
prompt says "Return your completed adversarial review as JSON ...".

### Delegate a Task

```bash
PROMPT="Task instructions. Apply changes directly."
# Redact per shared-cli-review.md, then:
grok -p "$REDACTED_PROMPT" --sandbox workspace --always-approve --cwd /path/to/project < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

Add `-w, --worktree [<NAME>]` (`--worktree-ref <REF>`) for an isolated worktree.

## Sessions and Other Projects

Sessions persist by default (no ephemeral flag). Conversation follow-ups
(never extra campaign calls) resume with `-c` (boolean) or `-r [<ID>]`; neither
takes the prompt, so always pair with `-p` or `--prompt-file`, else Grok opens
the interactive TUI (`Device not configured (os error 6)` or a hang):

```bash
grok -r <SESSION_ID> -p "$REDACTED_PROMPT" --always-approve < /dev/null
grok -c --prompt-file "$REDACTED_PAYLOAD_FILE" --always-approve < /dev/null
```

`--fork-session` forks instead of reusing the id. Omit `--sandbox` on resume
(`cannot resume this session under sandbox profile 'X'`). `grok sessions list`
/ `grok sessions search <q>` find sessions; `grok export` dumps a transcript.
Other project: `--cwd ~/source/other-project`; Grok inherits that project's
`AGENTS.md`/`CLAUDE.md`, skills, and MCP servers (no isolation flag).

## Error Handling

- **Not logged in**: only `You are not authenticated.` plus a missing
  `~/.grok/auth.json`. Classify every other `grok models` result per
  Pre-flight Check; a missing binary (`~/.local/bin/grok`, `~/.grok/bin/grok`)
  is not logout.
- **`Custom sandbox profile '<name>' not found`**: not a built-in and not in
  `~/.grok/sandbox.toml`; Grok refuses to start rather than run unsandboxed.
- **Sandbox startup failure before a session**: `sandbox profile resolve
  failed`, `runtime-socket`, an unreadable `/run/podman/podman.sock` or other
  runtime sockets, `denied paths unprotected`, or missing or unusable `bwrap`
  are pre-session host/sandbox failures, not a model crash and not
  `permission_cancelled`. Do not auto-retry in the same review campaign: the
  failed CLI call consumes the campaign invocation, so close the campaign as
  blocked. Only a new explicit user-approved campaign may use `--sandbox off`;
  warn that kernel filesystem and child-network enforcement are disabled, and
  keep the read-only tool allowlist `--tools "Read,Grep,Glob"`.
- **`a value is required for '--single <PROMPT>'`**: drop `-p`;
  `--prompt-file` is complete on its own.
- **`Error: max turns reached`**: a `--max-turns` value was set; remove it.
- **Permission cancellation** (session `events.jsonl` shows
  `permission_resolved` → `decision: cancelled`, `turn_ended` with
  `cancellation_category: permission_cancelled`): missing `--always-approve`.
  Fix the invocation before starting a campaign; do not spend a continuation
  on it.
- **Empty / placeholder output**: exit status, tool use, and future-tense
  plans are not completion evidence; only `validate-review-output RESULT_FILE`
  is. A standalone campaign gets the one same-session continuation only when
  a session was created.
- **Rate limit**, **timeout tripped**: see shared-cli-review.md. Do not re-run
  a burned attempt.
