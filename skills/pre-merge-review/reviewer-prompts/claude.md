# Reviewer Prompt: claude

## Contents

- Preconditions
- Build the user prompt
- Invocation
- Parsing
- Error handling
- Security pass

Invocation for `claude -p` as the pre-merge adversarial reviewer. Background: `razorback:claude-cli`. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads.

## Preconditions

- `claude --version` succeeds; `claude auth status` exits 0 (else blocker taxonomy #1, [`blocker-taxonomy.md`](../../using-razorback/references/blocker-taxonomy.md)).
- Do not add `--bare`: bare mode skips OAuth and keychain auth reads.
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

Append a short plan path if useful; never paste the plan. Write this to `$PAYLOAD_FILE`, filter it through `$SKILL_DIR/../security-review/scripts/redact-outbound`, and apply [`review-payload.md`](../../security-review/review-payload.md) with `prepare-review-artifact`. That yields `$REVIEW_PROMPT_FILE` and `$REVIEW_ARTIFACT`: the complete redacted review prompt at or below 128 KiB, or the bounded static wrapper `Read and follow the complete redacted review bundle at:` plus the artifact path (`.razorback-review/review-input.md` inside `$REVIEW_ROOT`), which Claude reads with `Read,Grep,Glob`. Never load the artifact into a shell variable or positional argument.

## Invocation

`--json-schema` takes a string; strip the `$schema` key at read time (the `--json-schema` validator rejects it). `--system-prompt-file` takes claude-cli's canonical adversarial prompt after `render-system-prompt` fills its three placeholders with pointers to the user message. Never pass the template itself: the placeholders would reach Claude unfilled.

```bash
PASS=general
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")
PROMPT_TEMPLATE="$SKILL_DIR/../claude-cli/adversarial-prompt.txt"
SYSTEM_PROMPT_FILE="$OUT_DIR/system-prompt-$PASS.txt"
"$SKILL_DIR/../claude-cli/scripts/render-system-prompt" "$PROMPT_TEMPLATE" > "$SYSTEM_PROMPT_FILE" \
  || { echo "system prompt render failed" >&2; exit 1; }

CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-}"

cd "$REVIEW_ROOT" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --safe-mode \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" \
  --strict-mcp-config \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  --system-prompt-file "$SYSTEM_PROMPT_FILE" \
  < "$REVIEW_PROMPT_FILE" > "$OUT_DIR/reviewer-output-$PASS.json" 2> "$OUT_DIR/reviewer-stderr-$PASS.log"
```

`$OUT_DIR` comes from the skill's Step 1, outside both `$PROJECT_DIR` and `$REVIEW_ROOT`, and holds the output of both passes. Set no `trap` on it: the skill removes `$OUT_DIR` and `$REVIEW_ROOT` after it has parsed both passes.

Validated baseline flags: `-p`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--safe-mode`, `--output-format json`, `--json-schema`, `--tools "Read,Grep,Glob"`, `--strict-mcp-config`, optional `--model`, `--system-prompt-file`.

- `--safe-mode` — disables branch-controlled startup hooks and settings while keeping the explicit allowlist.
- `--tools "Read,Grep,Glob"` — the CLI-layer read-only enforcement. Do NOT add `Bash`; an unrestricted Bash tool can write files.
- `--strict-mcp-config` — drops inherited MCP servers, which can carry write-capable tools.
- **No `--max-turns`, no `--max-budget-usd`** — either cap truncates the review while still consuming the invocation. Scope comes from the prompt.
- `2> reviewer-stderr-$PASS.log` — diagnostics for a blocker report; do not re-run to recover stderr.

**Timeout:** Bash `timeout` `1800000` ms (30 min), a failsafe for a hung process, not a budget. Do not lower it, and do not raise it and re-run.

## Parsing

Stdout is a result envelope `{"type":"result","result":"<JSON string>","structured_output":{…},"usage":{…},"total_cost_usd":…}`; the schema object is `.structured_output`. The validator normalizes it and exits non-zero on missing completion evidence (`review_completed: true`, non-empty unique `files_inspected`, `commands_run` array, non-empty `evidence`; `needs-attention` requires a finding):

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/reviewer-output-$PASS.json" > "$OUT_DIR/reviewer-normalized-$PASS.json"
jq '.findings[]?' < "$OUT_DIR/reviewer-normalized-$PASS.json"
```

Malformed, incomplete, or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry. A partial output is not completion evidence. Record `$OUT_DIR/reviewer-stderr-$PASS.log` in the blocker report.

**Cost:** render the morning-report line from `.total_cost_usd`, `.usage.input_tokens`, `.usage.output_tokens` ("claude used N in / M out tokens, $X.XX").

## Error handling

Reviewer unavailability is a blocker: stop, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the failure in `Blockers hit`.

| Trigger | Blocker | Note |
|---|---|---|
| `claude auth status` exits 1 | #1 | Tell the user to run `claude auth login`. |
| Rate limit exhausted | #1 | Suggest retry after cooldown or reviewer `none` next run. |
| Old `--bare` snippet in the command | — | Do not dispatch. If dispatched and failed, the invocation is consumed and the campaign blocks. |
| Empty stdout | #1 | Cite `reviewer-stderr-$PASS.log`. Consumed; do not re-run. |
| 30-minute failsafe trips without complete output | #1 | Consumed. Do NOT raise the timeout and re-run, do NOT split the diff and re-run, do NOT add `--max-turns`. |
| Schema violation / malformed output | #1 | The reviewer is unavailable for this run. Consumed; do not re-run. |

A run of 10-20+ minutes is working, not stuck. Wait for it.

## Security pass

Same invocation with the baseline flags, schema string, allowlist, model handling, and timeout unchanged, run a second time from the same `$REVIEW_ROOT`. Only the pass name and the system prompt template change:

```bash
PASS=security
PROMPT_TEMPLATE="$SKILL_DIR/../security-review/security-adversarial-prompt.txt"
```

Render `$PROMPT_TEMPLATE` into a fresh `$SYSTEM_PROMPT_FILE` as above. Build `$DIFF_AND_CONTEXT` exactly as above, redact it into a fresh `$REDACTED_PAYLOAD_FILE`, apply `prepare-review-artifact`, and redirect the resulting `$REVIEW_PROMPT_FILE`. `$PASS` sends stdout to `$OUT_DIR/reviewer-output-security.json`, so `reviewer-output-general.json` is preserved. Apply the same parsing, cost, and error rules; a security-pass failure is reviewer unavailability, never a silent skip. If it fails, record the stderr log, then remove `"$REVIEW_ROOT"` and `"$OUT_DIR"` before returning the blocker.
