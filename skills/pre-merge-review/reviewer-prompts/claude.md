# Reviewer Prompt: claude

Invocation for `claude -p` as the pre-merge adversarial reviewer. Background: `razorback:claude-cli`. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads.

## Preconditions

- `claude --version` succeeds; `claude auth status` exits 0 (else blocker taxonomy #1, `razorback:using-razorback` `references/blocker-taxonomy.md`).
- Do not add `--bare`: current Claude help says bare mode skips OAuth and keychain auth reads.
- `$REVIEW_ROOT` (exported tree from Step 1, outside `$PROJECT_DIR`, shared by both passes) and `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$SOURCE_EVIDENCE`, optional `$USER_FOCUS` exist. Never run Claude from the live worktree.
- This reviewer does not run code-kb (`--strict-mcp-config` removes MCP) and never claims to. It works from the lead's source-backed bundle and the exported tree, and reports missing evidence when they cannot support a conclusion.

## Build the user prompt

The system prompt (`--system-prompt-file`) carries the adversarial stance; the user prompt carries only target context:

```bash
DIFF_AND_CONTEXT="Review the complete code-change bundle for bugs, security issues, correctness problems, and material improvements. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence.

Target: branch <name>: base..HEAD

File stat:
$FILE_STAT

User focus: ${USER_FOCUS:-none specified}

Commit log:
$COMMIT_LOG

Lead source evidence:
$SOURCE_EVIDENCE

Diff:
$DIFF"
```

Append a short plan path if useful; never paste the plan. Write this to `$PAYLOAD_FILE`, filter it through `skills/security-review/scripts/redact-outbound`, and apply [`review-payload.md`](../../security-review/review-payload.md) with `prepare-review-artifact`. That yields `$REVIEW_PROMPT_FILE` and `$REVIEW_ARTIFACT`: the complete redacted review prompt at or below 128 KiB, or the bounded static wrapper `Read and follow the complete redacted review bundle at:` plus the artifact path (`.razorback-review/review-input.md` inside `$REVIEW_ROOT`), which Claude reads with `Read,Grep,Glob`. Never load the artifact into a shell variable or positional argument.

## Invocation

`--json-schema` takes a string; strip the `$schema` key at read time (claude 2.1.209's validator rejects it). `--system-prompt-file` points straight at claude-cli's canonical adversarial prompt.

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
PROMPT_FILE="$SKILL_DIR/../claude-cli/adversarial-prompt.txt"

CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-}"

OUT_DIR=$(mktemp -d)
trap 'rm -rf "$OUT_DIR"' EXIT

cd "$REVIEW_ROOT" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --safe-mode \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" \
  --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  --system-prompt-file "$PROMPT_FILE" \
  < "$REVIEW_PROMPT_FILE" > "$OUT_DIR/claude-output.json" 2> "$OUT_DIR/claude-stderr.log"
```

`OUT_DIR` is private per invocation and outside the worktree; its `trap` removes only reviewer output, not `$REVIEW_ROOT` (the caller removes that after both passes are parsed).

Validated baseline flags: `-p`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--safe-mode`, `--output-format json`, `--json-schema`, `--tools "Read,Grep,Glob"`, `--strict-mcp-config`, optional `--model`, `--system-prompt-file`.

- `--safe-mode` — disables branch-controlled startup hooks and settings while keeping the explicit allowlist.
- `--tools "Read,Grep,Glob"` — the CLI-layer read-only enforcement. Do NOT add `Bash`; an unrestricted Bash tool can write files.
- `--strict-mcp-config` — drops inherited MCP servers, which can carry write-capable tools.
- **No `--max-turns`, no `--max-budget-usd`** — either cap truncates the review while still consuming the invocation. Scope comes from the prompt.
- `2> claude-stderr.log` — diagnostics for a blocker report; do not re-run to recover stderr.

**Timeout:** Bash `timeout` `1800000` ms (30 min), a failsafe for a hung process, not a budget. Do not lower it, and do not raise it and re-run.

## Parsing

Stdout is a result envelope `{"type":"result","result":"<JSON string>","structured_output":{…},"usage":{…},"total_cost_usd":…}`; the schema object is `.structured_output`. The validator normalizes it and exits non-zero on missing completion evidence (`review_completed: true`, non-empty unique `files_inspected`, `commands_run` array, non-empty `evidence`; `needs-attention` requires a finding):

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/claude-output.json" > "$OUT_DIR/claude-normalized.json"
jq '.findings[]?' < "$OUT_DIR/claude-normalized.json"
```

Malformed, incomplete, or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry. A partial output is not completion evidence. Record `$OUT_DIR/claude-stderr.log` in the blocker report.

**Cost:** render the morning-report line from `.total_cost_usd`, `.usage.input_tokens`, `.usage.output_tokens` ("claude used N in / M out tokens, $X.XX").

## Error handling

Reviewer unavailability is a blocker: stop, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the failure in `Blockers hit`.

| Trigger | Blocker | Note |
|---|---|---|
| `claude auth status` exits 1 | #1 | Tell the user to run `claude auth login`. |
| Rate limit exhausted | #1 | Suggest retry after cooldown or reviewer `none` next run. |
| Old `--bare` snippet in the command | — | Do not dispatch. If dispatched and failed, the invocation is consumed and the campaign blocks. |
| Empty stdout | #1 | Cite `claude-stderr.log`. Consumed; do not re-run. |
| 30-minute failsafe trips without complete output | #1 | Consumed. Do NOT raise the timeout and re-run, do NOT split the diff and re-run, do NOT add `--max-turns`. |
| Schema violation / malformed output | #5 | Consumed; do not re-run. |

A run of 10-20+ minutes is working, not stuck. Wait for it.

## Security pass

Same invocation with the baseline flags, schema string, allowlist, model handling, and timeout unchanged, run a second time from the same `$REVIEW_ROOT`. Only the system prompt changes:

```bash
PROMPT_FILE="$SKILL_DIR/../security-review/security-adversarial-prompt.txt"
```

Build `$DIFF_AND_CONTEXT` exactly as above, redact it into a fresh `$REDACTED_PAYLOAD_FILE`, apply `prepare-review-artifact`, and redirect the resulting `$REVIEW_PROMPT_FILE`. Capture stdout to `$OUT_DIR/claude-output-security.json` so `claude-output.json` is preserved. Apply the same parsing, cost, and error rules; a security-pass failure is reviewer unavailability, never a silent skip. If it fails, remove `"$REVIEW_ROOT"` before returning the blocker.
