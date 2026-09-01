---
name: claude-cli
description: Use when the user says "ask claude", "fresh claude review", "second opinion from another claude", "have another claude look at this", "delegate to a fresh claude", or any variation naming Claude as the second perspective they want.
---

# Claude CLI Assistant

Use the Claude Code CLI (`claude -p`) to get a second opinion, review code
changes, or run adversarial security/correctness reviews from a fresh Claude
instance. The value is a new session and an independent prompt, not a
different underlying model.

## Pre-flight Checklist

Before invoking `claude -p`, run this readiness check. Tell the user what's
active — knowing the subscription tier and auth method explains rate limits
and plan-specific behavior without having to ask:

```bash
# Binary + version
which claude && claude --version

# Auth status — JSON output with key fields
claude auth status | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Auth: {d.get(\"loggedIn\")} via {d.get(\"authMethod\")}')
print(f'Email: {d.get(\"email\")}')
print(f'Plan: {d.get(\"subscriptionType\", \"unknown\")}')
print(f'Org: {d.get(\"orgName\")}')
"
```

`claude auth status` output fields:
- **`loggedIn`**: bool — if false, tell user to run `claude auth login`
- **`authMethod`**: `"claude.ai"` (OAuth) or `"api_key"` — confirms auth path
- **`apiProvider`**: `"firstParty"` for direct Anthropic; differs under
  Bedrock/Vertex/Foundry
- **`subscriptionType`**: `"pro"`, `"max"`, `"team"`, or `"enterprise"`. Use this
  to set user expectations about rate limits and budget before heavy invocations.
  Not present under API key auth.
- **`email`**: which account
- **`orgId`** / **`orgName`**: org context

**Usage limits check**: Before heavy invocations, check remaining weekly limits.
There is no reliable non-interactive `claude usage` command — it can hang ~10s+
with no output. The `/usage` slash command works in interactive sessions. Best
source: the usage page at `claude.ai/settings` (web UI).

If the command exits non-zero or produces no JSON, the user is not logged in.
Tell them to run `claude auth login` in a terminal.

**Billing context**: See `references/programmatic-billing.md` for the
interactive vs. programmatic billing split. Since June 15, 2026, `claude -p`
draws from a separate Agent SDK credit pool, not the general subscription
(re-verify against current Anthropic billing docs before relying on this).

## Defaults

- **Model**: inherit the current Claude default unless the user or environment
  explicitly selects a model.
- **Reasoning effort**: `--effort <level>` accepts `low | medium | high | xhigh | max`. Omit it unless the user or environment explicitly selects one.
- **Fallback model**: `--fallback-model <model>` auto-falls back when the primary is overloaded or unavailable (works only with `--print`). Accepts a comma-separated list tried in order; the primary is re-tried at the start of each user turn. Fits razorback's autonomous-by-default flow; use it only when an explicit fallback is configured.
- **Ephemeral**: `--no-session-persistence` so the review leaves no stored
  session behind (parity with codex's `--ephemeral`).
- **Do not use `--bare`**: bare mode reads auth strictly from `ANTHROPIC_API_KEY` or `apiKeyHelper` (not OAuth or keychain). The common razorback caller has OAuth, so this skill avoids `--bare` to keep normal logins working. If you have a guaranteed `ANTHROPIC_API_KEY` env in CI, `--bare` is fine.
- **Output format**: `--output-format json` for structured returns; combine
  with `--json-schema` for schema-validated adversarial output.
- **Stderr**: append `2>/dev/null` to suppress banner and status noise.
- **Always redirect stdin**: append `< /dev/null` (bash) or `< NUL` (Windows
  cmd/PowerShell) to every invocation that doesn't intentionally pipe input.
  `claude -p` reads piped stdin to EOF even when the prompt is passed as an
  argument (verified on 2.1.204: a run with a held-open pipe waits for the
  pipe to close before answering). On macOS/Linux the shell closes stdin so
  this is harmless, but on Windows (Git Bash via a harness Bash tool) stdin
  can stay open with no producer and `claude -p` blocks indefinitely — the
  same hang class documented for `codex exec` in razorback:codex-cli.
- **Hidden but supported flags**: `--system-prompt-file` and
  `--append-system-prompt-file` no longer appear in `claude --help` but are
  still parsed and supported (verified on 2.1.204: probing each without a
  value returns `option ... argument missing`, not `unknown option`). Do not
  strip them from these recipes just because help output omits them.
- **Working directory**: Claude uses the shell's cwd. There is no equivalent
  to codex's `-C` flag; `cd` first or run from the project root.
- **Non-interactive permissions**: `--dangerously-skip-permissions` is
  required for scripted use. Pair it with `--tools "Read,Grep,Glob"` plus
  `--strict-mcp-config` to enforce read-only behavior at the CLI layer: no
  tool in that set can write, and strict MCP config keeps write-capable MCP
  tools from user/project settings out of the session. Do NOT treat
  `--tools "Read,Bash"` as read-only — an unrestricted Bash tool can write
  files; only add Bash when you accept that trade for shell investigation.
- **No per-invocation turn/spend caps**: razorback does not pass
  `--max-budget-usd` and it does not pass `--max-turns`. Either cap truncates
  a review mid-flight and trades finding quality for a few cents. Review depth
  is the point; do not add the flags back. These uncapped settings apply inside
  one CLI invocation only. Every CLI call counts once against the caller's
  campaign `external_invocation_budget`; one internally uncapped invocation
  does not waive the campaign budget. Before a second review call or any
  multi-reviewer dispatch, load and follow `razorback:managing-review-campaigns`.
  A user who wants a hard per-invocation ceiling sets it themselves.
- **Timeout is a failsafe, not a budget**: set 1800000ms (30 min) on every
  review invocation. It exists to catch a process that hung or died and will
  never return — nothing else. It is not a bound on how long a review may
  take, and it is not a cost dial. Scope the review in the prompt and let the
  reviewer finish the job. Never tune it down to make a run cheaper.
- **Auth**: Logged in via Anthropic OAuth or API key. Run the Pre-flight
  Checklist above. `claude auth status` exits 0 logged in, 1 otherwise, and
  returns JSON with subscription type, auth method, email, and org. If auth
  fails, tell the user to run `claude auth login` in a terminal. If you copied an
  older command that includes `--bare`, remove that flag first (unless you
  have a guaranteed `ANTHROPIC_API_KEY`).

For command snippets below, optionally set `CLAUDE_MODEL` and `CLAUDE_EFFORT` before invoking:

```bash
CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-}"
CLAUDE_EFFORT="${RAZORBACK_CLAUDE_REVIEW_EFFORT:-}"  # low | medium | high | xhigh | max
```

Use the environment variables above only as explicit overrides. Otherwise let
Claude choose its configured default. Claude Code's `Agent` tool uses short names
(`opus`, `sonnet`, `haiku`); the CLI's `--model` flag accepts both short and
full model IDs. Add `--effort "$CLAUDE_EFFORT"` only when it is non-empty.

## Policy Gate

Before sending any diff or repo content to Anthropic, apply the external-model
policy check in razorback:security-review. Provider for this skill:
`anthropic`. No policy block in the target repo's project instructions →
proceed and add the loud note to the morning report. Policy denies `anthropic`
→ refuse the dispatch and name an allowed alternative; on an autonomous run
where the user chose this provider, stop per blocker taxonomy #4.

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

Immediately before every `claude -p` dispatch, write the fully constructed prompt to `PAYLOAD_FILE` and pass it through `skills/security-review/scripts/redact-outbound`. Use only `REDACTED_PAYLOAD_FILE` for the invocation. If redaction fails, remove both files, emit only a generic error, and stop before Claude receives any input.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

## Review Targeting

Scope selection (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing heuristic are shared across razorback's reviewer
skills: load `review-targeting.md` from razorback's using-razorback references
when selecting scope. It resolves `$DIFF`, `$TARGET`, and `$RANGE`; read
"the reviewer" there as `claude -p`.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants a fresh Claude's take on an approach, design decision, or
piece of code. No file changes, no structured output.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "Your prompt here" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi

cd /path/to/project && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --tools "Read,Grep,Glob" --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  ${CLAUDE_EFFORT:+--effort "$CLAUDE_EFFORT"} \
  < "$REDACTED_PAYLOAD_FILE" 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

Drop `--json-schema`; a second opinion is free-form text.
The reviewer reads files on its own via the `Read` tool; mention specific
paths in the prompt if you want it focused.

**After**: Show the reviewer's response, then add your own analysis. Where
you agree, say so. Where you disagree, explain why with evidence. The user
gets two perspectives from two fresh starts.

### Code Review (read-only)

The user wants a review of current changes. Single pass, standard
review prompt (not adversarial framing).

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above (scope from `--scope`/`--base`, execution mode
from the sizing heuristic or explicit `--wait`/`--background`).

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

**Step 3: Send to Claude**

`--json-schema` takes a JSON string. `$SKILL_DIR` throughout this skill is the
skill's own base directory, announced when the skill loads — substitute it
before running any command. Read the JSON string from the canonical schema file
(`$SKILL_DIR/../codex-cli/schemas/review-output.schema.json` — all razorback
reviewers share it), stripping the `$schema` key: claude 2.1.209's validator
rejects it (`no schema with key or ref …`) before the run starts. The canonical
file keeps `$schema` for other reviewers, so strip it here rather than editing
the file:

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")

cd "$REVIEW_ROOT" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  ${CLAUDE_EFFORT:+--effort "$CLAUDE_EFFORT"} \
  ${CLAUDE_FALLBACK_MODEL:+--fallback-model "$CLAUDE_FALLBACK_MODEL"} \
  < "$REVIEW_PROMPT_FILE" 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE"
rm -rf -- "$REVIEW_ROOT"
```

Same command shape as adversarial review but without the adversarial system
prompt; the prompt body itself asks for a standard review.

**After**: Parse the output. `--output-format json` returns a **result
envelope**, not the model response directly — the schema-conforming object is
at `.structured_output` (with `.result` holding the same JSON as a string, and
`.usage` / `.total_cost_usd` carrying cost data). A completed review must
include `review_completed: true`, a non-empty unique `files_inspected` list, a
`commands_run` array (which may be empty), and non-empty file/line/observation
`evidence`; `needs-attention` requires at least one finding.

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" output.json > normalized.json
jq '.findings[]?' < normalized.json
```

Present findings, add your own assessment. Highlight agreements and
disagreements. Call out anything the reviewer missed.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured system prompt that tells Claude to actively try to break
confidence in the change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the user prompt** with the shared
`review-payload.md` (in the `razorback:security-review` skill) contract. For a
standalone review, use the `.git`-free `REVIEW_ROOT` exported from the reviewed
`HEAD` tree. The user prompt carries the adversarial instruction and either the
small redacted bundle or the path to the large bundle; it never carries a large
diff inline.

**Step 3: Send with structured output and the adversarial system prompt**

Read the schema from the canonical file (stripping `$schema`, as in Code
Review) and point `--system-prompt-file` straight at this skill's canonical
`adversarial-prompt.txt` — no temp file needed:

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")

REVIEW_INSTRUCTION="Perform an adversarial review of the complete code-change bundle. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence."
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

cd "$REVIEW_ROOT" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  ${CLAUDE_EFFORT:+--effort "$CLAUDE_EFFORT"} \
  ${CLAUDE_FALLBACK_MODEL:+--fallback-model "$CLAUDE_FALLBACK_MODEL"} \
  --system-prompt-file "$SKILL_DIR/adversarial-prompt.txt" \
  < "$REVIEW_PROMPT_FILE" 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE"
rm -rf -- "$REVIEW_ROOT"
```

For payloads over 128 KiB, `prepare-review-artifact` writes the complete
redacted bundle to `.razorback-review/review-input.md` inside `REVIEW_ROOT` and
the prompt contains only the concise instruction and artifact path. Do not
reload that file into an argument, stdin, or `--prompt-file`; `--prompt-file`
is prompt transport, not a review-artifact mechanism.

The `--json-schema` flag tells Claude to return JSON matching the review
schema (verdict, summary, findings with severity/file/line/confidence, next
steps, and completion evidence). A completed review requires
`review_completed: true`, a non-empty unique `files_inspected` list, a
`commands_run` array (which may be empty), and non-empty file/line/observation
`evidence`; `needs-attention` requires at least one finding. No turn cap and no
spend cap are set — the reviewer runs to completion.

**After**: Run `validate-review-output RESULT_FILE` to normalize and enforce
the completion contract before accepting the result. Present findings grouped
by severity (critical first). For each finding, show the file, lines, and
recommendation. Add your own assessment of each finding: do you agree? Is
the confidence warranted? Then give your overall take on the verdict.

## Adversarial Prompt Template

The canonical adversarial system prompt lives in this skill at
`./adversarial-prompt.txt` (version-controlled) and is passed directly via
`--system-prompt-file` in the invocation above. It is the Claude variant of a
deliberate trio: the only Claude-specific adaptation is the REVIEW METHOD line
referencing `Read`, `Grep`, and `Glob` (the invocation's allowlisted tools). Attack-surface
categories, finding bar, calibration, and grounding rules are identical to
`../codex-cli/adversarial-prompt.txt` and `../grok-cli/adversarial-prompt.txt`;
keep the three in sync when editing any.

## Resuming a Session

By default, `--no-session-persistence` means sessions aren't saved. If you
need follow-up capability, drop that flag, then resume with `claude -r`:

```bash
# Initial task (persistent session)
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
cd /path && claude -p --dangerously-skip-permissions ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} "$REDACTED_PROMPT" < /dev/null 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"

# Resume the last session
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "follow-up prompt" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
claude -r "$REDACTED_PROMPT" < /dev/null 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

See the Claude Code CLI reference for session-resume details. Use this when
you need a multi-turn conversation (e.g. iterating on a review or asking
clarifying questions about findings).

## Cross-Project Usage

Claude reads `CLAUDE.md` from the project root and discovers plugins, hooks,
skills, and MCP servers by default. This skill accepts that tradeoff; use the
pre-merge `--safe-mode` and strict read-only allowlist when those inputs must be
reduced.

There is no `-C`/`--cwd` flag equivalent to codex's working-directory
override. To review a project other than cwd, `cd` into it first:

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
cd ~/source/other-project && claude -p --no-session-persistence \
  --dangerously-skip-permissions --tools "Read,Grep,Glob" --strict-mcp-config ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  "$REDACTED_PROMPT" < /dev/null 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

**Self-review with razorback skills loaded:** if you want the reviewer to apply razorback's Miller-first review checklist itself, add `--plugin-dir <path-to-razorback>` so the reviewer session loads the same skills your main session uses. Without it, the reviewer sees only the project's `CLAUDE.md`.

## Critical Evaluation

A fresh Claude is a peer, not an authority. The review's value comes from
**session freshness** and independent prompt framing, not from the reviewer
being a different or smarter model. The author instance and the reviewer
instance may be the same model build.

Because this skill does not use `--bare`, the reviewer still sees project
context such as `CLAUDE.md`, hooks, plugins, and MCP config. Factor that into
how much independence you assign the review.

- **Trust your own knowledge** when confident. If the reviewer says
  something you know is wrong, say so directly with evidence. Same model
  means same knowledge cutoff and same systematic blind spots; fresh
  context doesn't make those go away.
- **Research disagreements.** Check the code, not vibes. Two instances of
  the same model can still both be wrong in correlated ways.
- **Don't defer.** Evaluate suggestions critically. The point of a second
  opinion is two perspectives, not rubber-stamping.
- **Adversarial findings need validation.** In adversarial mode the
  reviewer is intentionally trying to find problems and will over-report.
  Some findings will be speculative or low-confidence. Filter accordingly.

When you disagree, tell the user clearly: what the reviewer said, why you
think it's wrong, and your evidence.

## Error Handling

- **Auth expired**: `claude auth status` exits non-zero. Tell the user to run
  `claude auth login` in a terminal.
- **Rate limits**: the Claude plan has rolling usage limits. A rate limit
  means the service is unavailable, not that the review was too big. Tell the
  user and suggest waiting for the window to reset or swapping to another
  reviewer. Do NOT shrink the prompt or drop to a cheaper model to squeeze
  the review through — that ships a weaker review under the name of the one
  the user asked for.
- **`claude usage` hangs**: The `claude usage` command can time out (~10s+) with
  no output, especially on first call or after auth refresh. Do not rely on it
  for pre-flight checks. Use the web UI at `claude.ai/settings` or the `/usage`
  slash command in an interactive session instead.
- **Old `--bare` recipe**: remove `--bare` and retry. Current Claude help says
  bare mode skips OAuth and keychain auth, so old snippets fail on normal
  Claude logins.
- **Timeout tripped**: a review that runs 10-20+ minutes is working, not
  stuck — that is why the failsafe sits at 30 min. If the failsafe trips, the
  process hung or died; the diff was not "too big". Do NOT re-run with a
  longer timeout, and do NOT split the diff and re-run. A second full attempt
  burns another half hour and another full context on the same broken run.
  Check stderr, then treat it as reviewer unavailability.
- **Empty output**: if stdout is empty, check stderr (remove `2>/dev/null`
  temporarily) for error messages.
- **Windows hang (no output for many minutes)**: the stdin-EOF block described
  under Defaults ("Always redirect stdin"). The run never starts, so there is
  no partial output to salvage — kill the process, it will not recover, then
  re-run with the redirect in place.
- **Flag missing from `--help`**: `--system-prompt-file` and
  `--append-system-prompt-file` are hidden from help output but still
  supported. Verify with a missing-argument probe (`claude -p
  --system-prompt-file` should say `argument missing`, not `unknown option`)
  before concluding a flag was removed.
- **Claude not installed**: check with `claude --version`. Install via
  `npm install -g @anthropic-ai/claude-code` if missing.
- **Schema or completion violation**: `validate-review-output` rejects malformed,
  contradictory, placeholder, or evidence-free output. The review invocation is
  consumed; do not narrow the diff or retry inside the same campaign. A new
  campaign requires an explicit user decision.

## Quick Reference

Inherit the current Claude default unless the user or environment selects a
model.

Claude and Codex CLIs do not share a command set — probe with `--help` before
assuming a command that exists in one exists in the other.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `cd dir && claude -p --no-session-persistence --dangerously-skip-permissions --tools "Read,Grep,Glob" --strict-mcp-config ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} "prompt" < /dev/null 2>/dev/null` |
| Code review | read-only + schema | Add `--output-format json --json-schema "$SCHEMA_JSON"` and feed the final redacted payload file to stdin, where `SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")`; normalize with `validate-review-output RESULT_FILE`. Scope/sizing per Review Targeting. |
| Adversarial review | read-only + schema + system prompt | Add `--system-prompt-file "$SKILL_DIR/adversarial-prompt.txt"` to the code-review pattern and keep the redacted payload on stdin. Scope/sizing per Review Targeting. |
| Resume session | persistent | Drop `--no-session-persistence`, use `claude -r "prompt" < /dev/null 2>/dev/null` |
| Apply explicit effort | any | Add `--effort "$CLAUDE_EFFORT"` (low/medium/high/xhigh/max) when the environment sets it |
| Survive overload | autonomous | Add `--fallback-model "$CLAUDE_FALLBACK_MODEL"` so the run doesn't hard-fail on capacity |
| Self-review with razorback skills | any | Add `--plugin-dir <path-to-razorback>` so the reviewer loads the same skill set |
