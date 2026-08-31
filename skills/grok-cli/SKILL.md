---
name: grok-cli
description: Use when the user says "ask grok", "get grok's take", "grok review", "have grok look at this", "delegate to grok", or any variation naming Grok/xAI as the perspective they want.
---

# Grok Assistant

Use the Grok CLI (`grok -p`) to get a second opinion, review code changes,
run adversarial security/correctness reviews, or delegate tasks to xAI's Grok
models.

## Defaults

- **Model**: inherit the current Grok default (`grok-4.5` at time of writing)
  unless the user or environment explicitly selects one with `-m, --model`.
  `grok models` prints the default and the list you can pick from.
- **Reasoning**: inherit the current Grok default unless the user or environment
  explicitly selects `--reasoning-effort <EFFORT>` (alias `--effort`).
- **Sandbox mode**: `--sandbox <PROFILE>` selects a filesystem/network profile.
  On Grok 1.0.13, `off` is the default; built-in profiles are `off`, `workspace`,
  `devbox`, `read-only`, and `strict`. Use `read-only` for review (the reviewer
  can read and run non-mutating commands but cannot edit). Use `workspace` for
  delegate flows (write access inside the workspace). There is no built-in `none`
  or `danger-full-access` profile.
- **Headless single-turn**: `-p, --single <PROMPT>` prints the response to
  stdout and exits. For large review bundles, use the shared review-artifact
  contract; `--prompt-file <PATH>` transports only the concise prompt wrapper.
  `-p` and `--prompt-file` are **mutually exclusive** — each is a complete way
  to supply the headless prompt. `-p` requires its own value, so
  `grok -p --prompt-file FILE` fails with
  `error: a value is required for '--single <PROMPT>' but none was supplied`
  (exit 2). Use `grok --prompt-file FILE` with no `-p`.
- **Non-interactive approvals (load-bearing)**: headless `-p` / `--prompt-file`
  cannot show a permission prompt. Pass **`--always-approve`** (alias `--yolo`,
  or `--permission-mode bypassPermissions`) on **every** headless tool-using
  run — second opinion, review, adversarial, and delegate — not only on
  delegate. Sandbox and approvals are orthogonal: `--sandbox read-only` still
  kernel-blocks writes/network even with always-approve. Without always-approve,
  any shell command outside Grok's small read-only allowlist (e.g.
  `git worktree`, bare `echo`, compound non-allowlisted segments) is resolved as
  `permission_cancelled`; that **cancels the entire turn** (successful parallel
  reads are discarded), the process often exits **0**, and stdout is empty or
  only the pre-tool sentence — looks like "died on multi-tool".
- **Working directory**: `--cwd <CWD>` sets the root (Grok's equivalent of
  codex's `-C`). Defaults to the shell's cwd.
- **Structured output**: `--json-schema '<SCHEMA JSON STRING>'` constrains the
  model to JSON and implies `--output-format json`. `--output-format` also
  accepts `plain` (default) and `streaming-json`.
- **Stderr**: Grok 1.0.13 puts banners and startup failures on stderr, so
  stdout/JSON remains clean while stderr must remain available. Do not discard
  stderr on any headless recipe, including review, adversarial, delegate, resume,
  and cross-project runs. The `grok models` pre-flight command already keeps it.
- **stdin**: In testing, `grok -p` does **not** block on stdin the way
  `codex exec` and `claude -p` do — it returns without a redirect. Keep
  `< /dev/null` (bash) / `< NUL` (Windows cmd/PowerShell) on non-piped
  invocations anyway as cheap insurance against a harness that holds the pipe
  open.
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
  review invocation. It exists to catch a process that hung or died and will
  never return — nothing else. It is not a bound on how long a review may
  take, and it is not a cost dial. Scope the review in the prompt and let the
  reviewer finish the job. Never tune it down to make a run cheaper.
- **Auth**: session from `grok login` (`--oauth` default, `--device-auth` for
  headless/remote). There is no `grok auth status`. Classify `grok models` per
  Pre-flight Check — a failed probe is not logout. Tell the user to run
  `grok login` only when stdout is `You are not authenticated.` and
  `~/.grok/auth.json` is missing.

## Policy Gate

Before sending any diff or repo content to xAI, apply the external-model
policy check in razorback:security-review. Provider for this skill: `xai`.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies `xai` → refuse the dispatch
and name an allowed alternative; on an autonomous run where the user chose this
provider, stop per blocker taxonomy #4.

## Outbound Payload Redaction

Immediately before every Grok dispatch, write the fully constructed payload to
`PAYLOAD_FILE` and pass it through `skills/security-review/scripts/redact-outbound`.
Use only `REDACTED_PAYLOAD_FILE` for the invocation; never log matched material.
If redaction fails, remove both files, emit only a generic error, and stop before
Grok receives any input. Review and adversarial bundles use the shared
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

`grok models` is a full CLI start, not `auth status`. When the binary runs, it
always prints a model list and exits 0. The login line on stdout is the only
auth signal. Keep stderr.

```bash
GROK_BIN=$(command -v grok || true)
: "${GROK_BIN:=$HOME/.local/bin/grok}"
[ -x "$GROK_BIN" ] || GROK_BIN="$HOME/.grok/bin/grok"
"$GROK_BIN" models
```

| stdout / result | Meaning | What to do |
|---|---|---|
| `You are logged in with grok.com.` | Ready | Proceed |
| `You are not authenticated.` and `~/.grok/auth.json` exists | This process cannot see credentials (sandbox, wrong `HOME`) | Do **not** run `grok login`. Re-run with a shell that can read `~/.grok/auth.json`. |
| `You are not authenticated.` and `~/.grok/auth.json` is missing | No session on disk | Run `grok login` (`--device-auth` on a headless host). |
| `command not found` / exit 127 | Binary missing or not on `PATH` | Try `~/.local/bin/grok` and `~/.grok/bin/grok`. Do **not** run `grok login`. |
| empty stdout, timeout, or a network/settings error | Probe failed | Keep stderr. Retry once. Do **not** run `grok login`. |

## Review Targeting

Scope selection (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing heuristic are shared across razorback's reviewer
skills: load `review-targeting.md` from razorback's using-razorback references
when selecting scope. It resolves `$DIFF`, `$TARGET`, and `$RANGE`; read
"the reviewer" there as `grok -p`.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants Grok's take on an approach, design decision, or piece of code.
No file changes needed.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "Your prompt here" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true

grok -p "$REDACTED_PROMPT" \
  --sandbox read-only \
  --always-approve \
  --cwd /path/to/project \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

`--always-approve` is required even though the sandbox is read-only (see
Defaults). Grok runs in the project directory and reads files on its own. If
you need to point it at specific files, mention them by path in the prompt.

**After**: Show Grok's response, then add your own analysis. Where you agree,
say so. Where you disagree, explain why with evidence. The user gets two
perspectives.

### Code Review (read-only)

The user wants a review of current changes. Inherit the current Grok default
unless the user or environment explicitly selects a model.

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above.

**Step 2: Build the prompt**

Use the shared [`review-payload.md`](../security-review/review-payload.md)
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

if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" \
  "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$REDACTED_PAYLOAD_FILE"
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
artifact path. Do not reload the artifact into an argument, stdin, or
`--prompt-file`: `--prompt-file` is prompt transport, not a review-artifact
mechanism. Payloads at or below the threshold remain the normal prompt file.
The reviewer must report completion evidence from the complete bundle. Tool use
is not completion proof; future-tense planning and a successful CLI exit do not
prove that the review completed.

**Step 3: Send to Grok with structured output**

`--json-schema` takes a JSON string. `$SKILL_DIR` throughout this skill is the
skill's own base directory, announced when the skill loads — substitute it
before running any command. Read the JSON string from the canonical schema file
(`$SKILL_DIR/../codex-cli/schemas/review-output.schema.json` — all razorback
reviewers share it), stripping the `$schema` key defensively (some validators
reject it; the verified working schema had no `$schema` key):

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
RESULT_FILE=$(mktemp)
NORMALIZED_RESULT_FILE=$(mktemp)
STDERR_FILE=$(mktemp)
trap 'rm -f "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$NORMALIZED_RESULT_FILE" "$STDERR_FILE"; rm -rf "$REVIEW_ROOT"' EXIT

GROK_STATUS=0
grok --prompt-file "$REVIEW_PROMPT_FILE" \
  --sandbox read-only \
  --always-approve \
  --cwd "$REVIEW_ROOT" \
  --json-schema "$SCHEMA_JSON" \
  ${GROK_MODEL:+--model "$GROK_MODEL"} \
  ${GROK_EFFORT:+--effort "$GROK_EFFORT"} \
  < /dev/null > "$RESULT_FILE" 2> "$STDERR_FILE" || GROK_STATUS=$?
cat "$STDERR_FILE" >&2

if grep -Eiq 'sandbox profile resolve failed|runtime-socket|denied paths unprotected|missing or unusable .?bwrap.?' "$STDERR_FILE"; then
  echo "Grok sandbox startup failed before a session was created" >&2
  exit 1
fi
if [ "${GROK_STATUS:-0}" -ne 0 ]; then
  echo "Grok review invocation failed before completion validation" >&2
  exit 1
fi
SESSION_CREATED=true

if "$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE"; then
  cat "$NORMALIZED_RESULT_FILE"
else
  if [ "$SESSION_CREATED" != true ]; then
    echo "Grok review did not create a resumable session" >&2
    exit 1
  fi

  FOLLOW_UP_FILE=$(mktemp)
  REDACTED_FOLLOW_UP_FILE=$(mktemp)
  printf '%s' "Complete the existing review. Return only the required schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence. Do not start a new sweep or review a post-fix diff." > "$FOLLOW_UP_FILE"
  if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$FOLLOW_UP_FILE" > "$REDACTED_FOLLOW_UP_FILE"; then
    rm -f -- "$FOLLOW_UP_FILE" "$REDACTED_FOLLOW_UP_FILE"
    echo "outbound redaction failed" >&2
    exit 1
  fi
  CONTINUATION_STATUS=0
  grok -c --prompt-file "$REDACTED_FOLLOW_UP_FILE" \
    --always-approve \
    --cwd "$REVIEW_ROOT" \
    --json-schema "$SCHEMA_JSON" \
    < /dev/null > "$RESULT_FILE" 2> "$STDERR_FILE" || CONTINUATION_STATUS=$?
  cat "$STDERR_FILE" >&2
  rm -f -- "$FOLLOW_UP_FILE" "$REDACTED_FOLLOW_UP_FILE"
  if [ "${CONTINUATION_STATUS:-0}" -ne 0 ]; then
    echo "Grok completion continuation failed" >&2
    exit 1
  fi
  if ! "$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE"; then
    echo "Grok completion continuation did not provide a completed review" >&2
    exit 1
  fi
  cat "$NORMALIZED_RESULT_FILE"
fi
```

No `-p` here — `--prompt-file` supplies the headless prompt on its own.
Always include `--always-approve` with `--sandbox read-only` (see Defaults).

**After**: `--output-format json` (implied by `--json-schema`) returns a
**result envelope**, not the model response directly. Run
`validate-review-output RESULT_FILE` before accepting it. The validator
normalizes `.structuredOutput`, the JSON object encoded in `.text`, and direct
schema objects; it rejects malformed, contradictory, or incomplete output and
writes only the normalized completed review. It never parses Grok's private
transcript format. The schema requires `review_completed: true`, a non-empty
unique `files_inspected` list, a `commands_run` array (which may be empty), and
non-empty file/line/observation `evidence`; `needs-attention` requires a finding.

```bash
# The validator's normalized output is the only accepted review result.
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" RESULT_FILE > normalized.json
jq '.findings[]?' < normalized.json
```

Present findings, add your own assessment. Highlight agreements and
disagreements. Call out anything Grok missed.

### Standalone Review Completion

A standalone external review predeclares two external invocations and two
rounds in `razorback:managing-review-campaigns`:

```text
evidence_target: external-reviewed
external_invocation_budget: 2
max_rounds: 2
round: 0/2
external_invocations: 0/2
```

After the first result is captured, run `validate-review-output RESULT_FILE`.
The first invocation failed completion validation when this check returns
non-zero, and the Code Review `else` branch permits exactly one continuation
when that invocation created a session. It resumes the same current-directory session,
asks only for completion of the existing review, counts as invocation
2/2, and is not a fresh sweep or a post-fix review. A second invalid result
closes the campaign; no third call is allowed.

If a sandbox startup failure occurs before a session exists, no session exists
for continuation and the campaign is terminal. The only supported recovery is a new explicit
user-approved campaign with `--sandbox off`. `grok inspect` reports
configuration, but it is not a sandbox capability probe.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured prompt that tells Grok to actively try to break confidence in the
change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the adversarial prompt** with the shared
[`review-payload.md`](../security-review/review-payload.md) contract. For a
standalone review, use a `.git`-free `REVIEW_ROOT` exported from the reviewed
`HEAD` tree. The complete rendered bundle is redacted before the size decision.

```bash
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
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
ADVERSARIAL_INSTRUCTION="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}"
```

**Step 3: Send with structured output**

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")

RESULT_FILE=$(mktemp)
NORMALIZED_RESULT_FILE=$(mktemp)
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
{
  printf '%s\n' "$ADVERSARIAL_INSTRUCTION"
  printf 'Target: %s\n' "$TARGET"
  printf 'File stat:\n%s\n' "$FILE_STAT"
  printf 'Commit log:\n%s\n' "$COMMIT_LOG"
  printf 'Diff:\n%s' "$DIFF"
} > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" \
  < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$RESULT_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "outbound redaction failed" >&2
  exit 1
fi
if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" \
  "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$REDACTED_PAYLOAD_FILE"
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

trap 'rm -f "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE" "$NORMALIZED_RESULT_FILE"; rm -rf "$REVIEW_ROOT"' EXIT
grok --prompt-file "$REVIEW_PROMPT_FILE" \
  --sandbox read-only \
  --always-approve \
  --cwd "$REVIEW_ROOT" \
  --json-schema "$SCHEMA_JSON" \
  ${GROK_MODEL:+--model "$GROK_MODEL"} \
  ${GROK_EFFORT:+--effort "$GROK_EFFORT"} \
  < /dev/null > "$RESULT_FILE"
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > "$NORMALIZED_RESULT_FILE"
cat "$NORMALIZED_RESULT_FILE"
```

For payloads over 128 KiB, `prepare-review-artifact` writes the complete
redacted bundle to `.razorback-review/review-input.md` inside `REVIEW_ROOT` and
the prompt contains only the concise instruction and artifact path. Do not
reload that file into an argument, stdin, or `--prompt-file`; `--prompt-file`
is prompt transport, not a review-artifact mechanism.

Always include `--always-approve` with `--sandbox read-only` (see Defaults).
The `--json-schema` flag tells Grok to return JSON matching the review schema
(verdict, summary, findings with severity/file/line/confidence, next steps, and
completion evidence). A completed review requires `review_completed: true`, a
non-empty unique `files_inspected` list, a `commands_run` array (which may be
empty), and non-empty file/line/observation `evidence`; `needs-attention`
requires at least one finding.

**After**: Parse the normalized output from `validate-review-output` (see Code
Review). Present findings grouped by severity (critical first). For
each finding, show the file, lines, and recommendation. Add your own assessment
of each finding: do you agree? Is the confidence warranted? Then give your
overall take on Grok's verdict.

### Delegate a Task

The user wants Grok to actually do something: write code, refactor, fix a bug.
Grok needs write access.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "Your task instructions here. Apply changes directly." > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true

grok -p "$REDACTED_PROMPT" \
  --sandbox workspace \
  --always-approve \
  --cwd /path/to/project \
  < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

`--sandbox workspace` gives Grok write access inside the workspace;
`--always-approve` auto-approves tool executions so the headless run never
stalls waiting for confirmation. Grok can read files, write files, and run
commands within the project directory.

**After**: Summarize what Grok changed. Run `git diff --stat` in the project to
show the scope, then review the changes yourself. Flag anything wrong or
improvable. If Grok made a mess, say so and offer to fix it.

**For tasks needing an isolated branch**, add `-w, --worktree [<NAME>]` to run
in a fresh git worktree (optionally `--worktree-ref <REF>` to base it on a
specific commit).

## Adversarial Prompt Template

The canonical adversarial prompt lives in this skill at
`./adversarial-prompt.txt` (version-controlled). Read it and replace the
`{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` placeholders at
runtime, as the Adversarial Review invocation above does.

It is the Grok variant of a deliberate trio: `../codex-cli/adversarial-prompt.txt`
and `../claude-cli/adversarial-prompt.txt` are identical except for the model
name and the REVIEW METHOD phrasing. Attack-surface categories, finding bar,
calibration, and grounding rules match; keep the three in sync when editing any.

## Resuming a Session

The generic resume examples below are for user-requested, non-campaign
conversation follow-ups. They do not authorize another review call after a
standalone campaign has reached its invocation or terminal-state limit.

Grok persists sessions by default — there is no `--ephemeral` /
`--no-session-persistence` flag.

`-c, --continue` is a **boolean flag** and `-r, --resume` takes only an optional
session ID — neither accepts the prompt. A bare `grok -c "follow-up prompt"`
treats the prompt as the positional argument that opens the **interactive TUI**,
which hangs or errors (`Device not configured (os error 6)`) in a headless
agent. Always pair resume with `-p` or `--prompt-file`:

```bash
# Continue the most recent session for the current directory
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "follow-up prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
grok -c -p "$REDACTED_PROMPT" --always-approve < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"

# Resume a specific session by ID (or the most recent if omitted)
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "follow-up prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
grok -r <SESSION_ID> -p "$REDACTED_PROMPT" --always-approve < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"

# Fork instead of reusing the original session id
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "follow-up prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
grok -r <SESSION_ID> --fork-session -p "$REDACTED_PROMPT" --always-approve < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"

# Large follow-up prompt: swap -p for --prompt-file (never both)
REDACTED_PROMPT_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PROMPT_FILE" > "$REDACTED_PROMPT_FILE"; then
  rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
grok -c --prompt-file "$REDACTED_PROMPT_FILE" --always-approve < /dev/null
rm -f -- "$PROMPT_FILE" "$REDACTED_PROMPT_FILE"
```

A resumed session keeps the sandbox profile it was created with. Passing a
different `--sandbox` fails with `cannot resume this session under sandbox
profile 'X' — it was created with 'Y'`. Omit `--sandbox` when resuming, or start
a new session to change profile. Still pass `--always-approve` on headless
resume so tool calls do not hit `permission_cancelled`.

Use `grok sessions list` (or `grok sessions search <query>`) to find sessions —
bare `grok sessions` prints subcommand help, not a list. `grok export` dumps a
transcript as Markdown. Use resume when you need a multi-turn conversation (e.g.
iterating on a review or asking clarifying questions about findings).

## Cross-Project Usage

Grok reads project instructions (`AGENTS.md` / `CLAUDE.md`) and discovers
skills, MCP servers, and permissions for the target directory automatically.
`grok inspect` reports configuration, but it is not a sandbox capability probe.
To review a project other than cwd, point `--cwd` at it:

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
grok -p "$REDACTED_PROMPT" --sandbox read-only --always-approve --cwd ~/source/other-project < /dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

There is no `--ignore-user-config` equivalent to codex's; Grok inherits the
project's context. Factor that into how much independence you assign the review
— it is not a context-free reviewer.

## Critical Evaluation

Grok is a peer, not an authority. It runs on xAI's models with their own
knowledge cutoffs and blind spots.

- **Trust your own knowledge** when confident. If Grok says something you know
  is wrong, say so directly with evidence.
- **Research disagreements.** A different model isn't inherently more or less
  right. Check the code.
- **Don't defer.** Evaluate Grok's suggestions critically. The point of a
  second opinion is two perspectives, not rubber-stamping.
- **Adversarial review findings need validation.** Grok in adversarial mode is
  intentionally trying to find problems. Some findings may be speculative or
  low-confidence. Filter accordingly.

When you disagree with Grok, tell the user clearly: what Grok said, why you
think it's wrong, and your evidence.

## Error Handling

- **Not logged in**: only `You are not authenticated.` plus a missing
  `~/.grok/auth.json`. Classify every other `grok models` result per Pre-flight
  Check — do not run `grok login`.
- **Rate limits**: xAI plans have usage limits. A rate limit means the service
  is unavailable, not that the review was too big. Tell the user and suggest
  waiting for the window to reset or swapping to another reviewer. Do NOT
  shrink the prompt or drop to a cheaper model to squeeze the review through —
  that ships a weaker review under the name of the one the user asked for.
- **Sandbox profile not found**: `Custom sandbox profile '<name>' not found` means
  you passed a name that isn't a built-in (`off`, `workspace`, `devbox`,
  `read-only`, `strict`) and isn't defined in `~/.grok/sandbox.toml`. Use a
  built-in or define the profile. Grok refuses to start rather than run
  unsandboxed.
- **Sandbox startup failure before a session**: errors such as `sandbox profile resolve
  failed`, `runtime-socket`, an unreadable `/run/podman/podman.sock` or other runtime
  sockets, `denied paths unprotected`, or missing or unusable `bwrap` are pre-session
  host/sandbox failures, not a model crash and not `permission_cancelled`. Do not
  auto-retry in the same review campaign: the failed CLI call consumes the campaign
  invocation, so close the campaign as blocked. Only a new explicit user-approved
  campaign may use `--sandbox off`; warn that kernel filesystem and child-network
  enforcement are disabled. In that optional fallback, constrain Grok to the
  read-only tool allowlist with `--tools "Read,Grep,Glob"`; application-level tools
  do not replace kernel isolation.
- **`a value is required for '--single <PROMPT>'`** (exit 2, immediate): you
  combined `-p` with `--prompt-file`. Drop `-p` — `--prompt-file` is a complete
  prompt source on its own.
- **`Device not configured (os error 6)`** or a hang: the invocation had no
  headless prompt flag, so Grok tried to open the interactive TUI. Add `-p` or
  `--prompt-file`. Most common with `grok -c "prompt"` / `grok -r <ID> "prompt"`.
- **Resume sandbox mismatch**: `cannot resume this session under sandbox profile
  'X' — it was created with 'Y'`. Omit `--sandbox` when resuming, or start a new
  session.
- **Max turns reached**: `Error: max turns reached` means a `--max-turns` value
  was too low for the reviewer to finish (bootstrap + review can burn several
  turns). These recipes set no turn cap — remove the flag rather than raising it.
- **Timeout tripped**: a review that runs 10-20+ minutes is working, not
  stuck — that is why the failsafe sits at 30 min. If the failsafe trips, the
  process hung or died; the diff was not "too big". Do NOT re-run with a
  longer timeout, and do NOT split the diff and re-run. A second full attempt
  burns another half hour and another full context on the same broken run.
  Check stderr, then treat it as reviewer unavailability.
- **Empty / placeholder / incomplete output**: a successful CLI exit, tool use,
  or future-tense plan is not completion evidence. Run
  `validate-review-output RESULT_FILE`; for a standalone campaign, allow only
  the one same-session continuation when a session was created. A sandbox
  startup failure has no session and cannot use that continuation.
- **Permission cancellation**: almost always a headless
  **permission cancel**, not a model crash. Session
  `events.jsonl` shows `permission_resolved` → `decision: cancelled` on
  `run_terminal_command` and `turn_ended` with
  `cancellation_category: permission_cancelled`. Cause: missing
  `--always-approve` while the model ran a non-allowlisted shell form (common
  when it batches reads + bash in one turn). Fix the invocation before starting
  an approved campaign; do not spend a campaign continuation on a pre-session
  permission failure.
- **Empty output (other)**: if stdout is empty and the permission pattern above does
  not match, check stderr for error messages.
- **Grok not installed**: `command -v grok` fails and `~/.local/bin/grok` /
  `~/.grok/bin/grok` are missing. Install per xAI's Grok CLI instructions.
  A missing binary is not logout.

## Quick Reference

Inherit the current Grok default. Only override with `-m`/`--effort` when the
user or environment gives a concrete value. Optionally set `GROK_MODEL` /
`GROK_EFFORT` before invoking and let the `${VAR:+--flag "$VAR"}` guards add the
flag only when non-empty.

Grok, Claude, and Codex CLIs do not share a command set — probe with `--help`
before assuming a command that exists in one exists in the other.

All non-piped patterns include `< /dev/null` (bash) / `< NUL` (Windows) as cheap
insurance against a harness holding stdin open.

If a sandbox startup failure occurs, follow Error Handling: do not retry within
the same review campaign. A new explicit user-approved campaign may use
`--sandbox off` with the read-only tool allowlist `--tools "Read,Grep,Glob"`,
while kernel filesystem and child-network enforcement are disabled.

The command patterns below assume the final payload has already passed the
Outbound Payload Redaction guard and the shared review-artifact size decision.
Use `$REDACTED_PROMPT` only for small `-p` payloads and `$REVIEW_PROMPT_FILE`
for review/adversarial prompt transport (a concise wrapper for large bundles).
Every
structured result must pass `validate-review-output RESULT_FILE` before it is
accepted.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only + approve | `grok -p "$REDACTED_PROMPT" --sandbox read-only --always-approve --cwd dir < /dev/null` |
| Code review | read-only + approve + schema | `grok --prompt-file "$REVIEW_PROMPT_FILE" --json-schema "$SCHEMA_JSON" --sandbox read-only --always-approve --cwd "$REVIEW_ROOT"` (no `-p`), after `prepare-review-artifact` selects inline vs artifact transport. Scope/sizing per Review Targeting. |
| Adversarial review | read-only + approve + schema | Build the prompt from `$SKILL_DIR/adversarial-prompt.txt` (see Adversarial Review), then the code-review command. |
| Delegate (complex) | workspace + approve | `grok -p "$REDACTED_PROMPT" --sandbox workspace --always-approve --cwd dir < /dev/null` (add `-w` for an isolated worktree) |
| Pre-flight / auth check | any | `"$GROK_BIN" models` with stderr kept. Ready only if stdout contains `You are logged in with grok.com.` Empty/timeout/exit 127 is not logout. `You are not authenticated.` + missing `~/.grok/auth.json` is the only `grok login` case. |
| Apply explicit model/effort | any | Add `--model "$GROK_MODEL"` / `--effort "$GROK_EFFORT"` when set |
| Resume session | persistent | `grok -c --prompt-file "$REDACTED_FOLLOW_UP_FILE" --always-approve` for the one bounded standalone continuation (most recent), or `grok -r <ID> -p "$REDACTED_PROMPT" --always-approve` for a user-requested conversation follow-up. `-c`/`-r` never take the prompt — omit `-p` / `--prompt-file` and you get the interactive TUI. Omit `--sandbox` on resume; still pass `--always-approve`. |
| Structured output shape | any | Envelope: `.structuredOutput` (parsed object), `.text` (JSON string), `.usage`, `.total_cost_usd`; normalize and validate with `validate-review-output RESULT_FILE`. |
