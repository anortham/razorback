---
name: claude-cli
description: Use when the user says "ask claude", "fresh claude review", "second opinion from another claude", "have another claude look at this", "delegate to a fresh claude", or any variation naming Claude as the second perspective they want.
---

# Claude CLI

Second opinions, code review, and adversarial review from a fresh Claude
session through `claude -p`. The independence is the new session and prompt,
not a different model; the reviewer may be the same build as the author and
shares its blind spots. Read `skills/codex-cli/references/shared-cli-review.md`
before the first call: policy gate, redaction, payload transport, completion
contract, and evaluation rules live there. Provider for this skill:
`anthropic` (policy check in razorback:security-review). Other models:
razorback:codex-cli (default when none is named), razorback:grok-cli,
razorback:agy-cli.

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

```bash
which claude && claude --version
claude auth status | jq '{loggedIn, authMethod, apiProvider, subscriptionType, email, orgName}'
```

Exit 1 or no JSON means not logged in: the user runs `claude auth login`.
`subscriptionType` (`pro|max|team|enterprise`, absent under API key) sets rate
limit expectations. Do not run `claude usage` (hangs 10s+ with no output);
usage lives at `claude.ai/settings` or the interactive `/usage`. Billing split
for `claude -p`: `references/programmatic-billing.md`.

## Defaults

- **Model / effort**: inherit. Optional overrides
  `CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-}"`,
  `CLAUDE_EFFORT="${RAZORBACK_CLAUDE_REVIEW_EFFORT:-}"` (`low|medium|high|xhigh|max`);
  the `${VAR:+--flag "$VAR"}` guards add the flag only when set.
- **Fallback**: `--fallback-model <model[,model]>` (print mode only) when an
  explicit fallback is configured.
- **Ephemeral**: `--no-session-persistence` (parity with codex `--ephemeral`).
- **Do not use `--bare`**: bare mode reads auth only from `ANTHROPIC_API_KEY`
  or `apiKeyHelper`, never OAuth or the keychain, so normal logins fail. Fine
  only in CI with a guaranteed API key.
- **Read-only enforcement**: `--dangerously-skip-permissions` (required for
  scripted use) with `--tools "Read,Grep,Glob" --strict-mcp-config`. No tool in
  that set can write, and strict MCP config keeps write-capable MCP tools out.
  Never allowlist Bash for a read-only run.
- **Output**: `--output-format json` returns an envelope; the schema object is
  at `.structured_output` (`.result` holds the same JSON as a string,
  `.usage`/`.total_cost_usd` carry cost). Pair with `--json-schema <string>`.
- **Stdin**: `< /dev/null` (`< NUL` on Windows cmd/PowerShell) on every call
  that does not pipe input; `claude -p` reads stdin to EOF and hangs on an
  open pipe. Append `2>/dev/null`.
- **Hidden flags**: `--system-prompt-file` and `--append-system-prompt-file`
  are absent from `--help` but supported (a missing-value probe says
  `argument missing`, not `unknown option`).
- **Working directory**: no `-C`; `cd` first.
- **No per-invocation turn/spend caps**: pass neither `--max-budget-usd` nor
  `--max-turns`. Every CLI call counts once against the caller's campaign
  `external_invocation_budget`; one internally uncapped invocation does not
  waive the campaign budget. Before a second review call or any multi-reviewer
  dispatch, load `razorback:managing-review-campaigns`.
- **Timeout is a failsafe, not a budget**: 1800000ms (30 min) on every review
  call. Never lower it.

## Second Opinion (read-only)

```bash
PROMPT="Your prompt here"
# Redact per shared-cli-review.md, then:
cd /path/to/project && claude -p \
  --no-session-persistence --dangerously-skip-permissions \
  --tools "Read,Grep,Glob" --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} ${CLAUDE_EFFORT:+--effort "$CLAUDE_EFFORT"} \
  < "$REDACTED_PAYLOAD_FILE" 2>/dev/null
rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
```

Free-form text, no `--json-schema`. Name paths in the prompt to focus it.

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

**Step 3: Send with schema**

`--json-schema` takes a JSON string. Strip `$schema` from the canonical file:
claude 2.1.209 rejects it (`no schema with key or ref`).

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
RESULT_FILE=$(mktemp)
cd "$REVIEW_ROOT" && claude -p \
  --no-session-persistence --dangerously-skip-permissions \
  --output-format json --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} ${CLAUDE_EFFORT:+--effort "$CLAUDE_EFFORT"} \
  ${CLAUDE_FALLBACK_MODEL:+--fallback-model "$CLAUDE_FALLBACK_MODEL"} \
  < "$REVIEW_PROMPT_FILE" 2>/dev/null > "$RESULT_FILE"
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$RESULT_FILE" > normalized.json
rm -f -- "$REDACTED_PAYLOAD_FILE" "$REVIEW_PROMPT_FILE" "$RESULT_FILE"; rm -rf -- "$REVIEW_ROOT"
```

Accept only `normalized.json` (`jq '.findings[]?'`).

## Adversarial Review

Run Code Review with two deltas:

```bash
REVIEW_INSTRUCTION="Perform an adversarial review of the complete code-change bundle. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence."
```

and, in Step 3 before the stdin redirect:

```bash
  --system-prompt-file "$SKILL_DIR/adversarial-prompt.txt" \
```

`adversarial-prompt.txt` is the Claude member of the quartet; its only
adaptation is the REVIEW METHOD line naming `Read`, `Grep`, and `Glob`.

## Sessions and Other Projects

- Persistent session: drop `--no-session-persistence`; follow up with
  `claude -r "$REDACTED_PROMPT" < /dev/null 2>/dev/null` (redact each prompt).
- Other project: `cd ~/source/other-project` first. The reviewer sees that
  project's `CLAUDE.md`, hooks, plugins, and MCP config (no `--bare`); weigh
  that when judging independence. Pre-merge review uses `--safe-mode` when
  those inputs must be reduced.
- Self-review with razorback skills: add `--plugin-dir <path-to-razorback>`.

## Error Handling

- **Not installed**: `claude --version`; install with
  `npm install -g @anthropic-ai/claude-code`.
- **Auth expired**: `claude auth status` exits non-zero; user runs
  `claude auth login`.
- **Old recipe with `--bare`**: remove the flag and retry.
- **Windows hang, no output**: stdin stayed open. Kill the process; re-run
  with the redirect.
- **Flag missing from `--help`**: probe with a missing-argument call before
  concluding it was removed.
- **Schema or completion violation**: `validate-review-output` rejected the
  result; the invocation is consumed. Do not narrow the diff or retry inside
  the same campaign.
- **Rate limit**, **timeout tripped**, **empty output**: see
  shared-cli-review.md. Do not re-run a burned attempt.
