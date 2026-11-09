# Reviewer Prompt: codex

Invocation for `codex` as the pre-merge adversarial reviewer. Background: `razorback:codex-cli`. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads.

## Preconditions

- `codex --version` succeeds; `codex login status` exits 0 (else blocker taxonomy #1, `razorback:using-razorback` `references/blocker-taxonomy.md`).
- `$REVIEW_ROOT` (exported tree from Step 1, outside `$PROJECT_DIR`, shared by both passes) and `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$SOURCE_EVIDENCE`, optional `$USER_FOCUS` exist. Never run Codex from the live worktree.
- This reviewer does not run code-kb and never claims to. It works from the lead's source-backed bundle and the exported tree, and reports missing evidence when they cannot support a conclusion.

## Build the adversarial prompt

Read `$SKILL_DIR/../codex-cli/adversarial-prompt.txt` and substitute:

- `{{TARGET_LABEL}}` ← `"branch <name>: N files changed, base..HEAD"`.
- `{{USER_FOCUS}}` ← `$USER_FOCUS` or `"none specified"`.
- `{{REVIEW_INPUT}}` ← `$FILE_STAT`, `$COMMIT_LOG`, `$SOURCE_EVIDENCE`, `$DIFF` under the labelled `Target:`, `File stat:`, `Commit log:`, `Lead source evidence:`, `Diff:` headings.

Write the rendered prompt to `$PAYLOAD_FILE`, filter it through `$SKILL_DIR/../security-review/scripts/redact-outbound`, and apply [`review-payload.md`](../../security-review/review-payload.md) with `prepare-review-artifact`. That yields `$REVIEW_PROMPT_FILE` and `$REVIEW_ARTIFACT`: the complete redacted review prompt at or below 128 KiB, or the bounded static wrapper `Read and follow the complete redacted review bundle at:` plus the artifact path (`.razorback-review/review-input.md` inside `$REVIEW_ROOT`) above it. Codex reads the artifact with its read-only tools; never pass the large payload through `echo`, stdin, or a positional argument.

## Invocation

OpenAI structured outputs reject the canonical schema's `uniqueItems`, `minItems`, `minLength`, and `minimum` keywords (HTTP 400 `invalid_json_schema` before the model runs). Sanitize with `openai-schema`; `validate-review-output` still enforces every constraint on the result.

```bash
PASS=general
SCHEMA_FILE="$OUT_DIR/openai-schema.json"
if ! "$SKILL_DIR/../codex-cli/scripts/openai-schema" > "$SCHEMA_FILE"; then
  echo "schema preparation failed" >&2
  exit 1
fi

CODEX_MODEL="${RAZORBACK_CODEX_REVIEW_MODEL:-}"

cd "$REVIEW_ROOT" && cat "$REVIEW_PROMPT_FILE" | "$SKILL_DIR/../codex-cli/scripts/codex-exec" \
  --ephemeral --color never \
  -s read-only \
  --skip-git-repo-check \
  --ignore-user-config \
  --ignore-rules \
  ${CODEX_MODEL:+-m "$CODEX_MODEL"} \
  --output-schema "$SCHEMA_FILE" \
  - \
  > "$OUT_DIR/reviewer-output-$PASS.json" 2> "$OUT_DIR/reviewer-stderr-$PASS.log"
```

`$OUT_DIR` comes from the skill's Step 1, outside both `$PROJECT_DIR` and `$REVIEW_ROOT`, and holds the schema file and the output of both passes. Set no `trap` on it: the skill removes `$OUT_DIR` and `$REVIEW_ROOT` after it has parsed both passes.

Flags:

- `codex-exec` — forwards to `codex exec`. On Windows it runs a sandbox preflight first: the Microsoft Store `pwsh` under `WindowsApps` rejects the restricted sandbox token (`CreateProcessAsUserW failed: 5`), so codex reads zero files while still consuming the invocation. The wrapper prefers the MSI `pwsh` and proves the spawn with `codex sandbox` before any model turn.
- `-s read-only` — the CLI-layer write block; the prompt's read-only instruction is backup, not the mechanism.
- `--skip-git-repo-check` — the exported tree has no `.git`.
- `--ignore-user-config --ignore-rules` — user/project config and branch-controlled rules are not reviewer input.
- `--output-schema` — sanitized shared schema. A completed result has `review_completed: true`, non-empty unique `files_inspected`, a `commands_run` array (may be empty), non-empty file/line/observation `evidence`; `needs-attention` requires a finding.
- `-` — prompt from stdin (`$REVIEW_PROMPT_FILE`; only the small wrapper for large bundles).
- `2> reviewer-stderr-$PASS.log` — diagnostics for a blocker report; do not re-run to recover stderr.

**Timeout:** Bash `timeout` `1800000` (30 min), a failsafe for a hung process, not a budget. Do not lower it, and do not raise it and re-run.

## Parsing

No envelope. The validator exits non-zero on missing completion evidence or malformed output:

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/reviewer-output-$PASS.json" > "$OUT_DIR/reviewer-normalized-$PASS.json"
jq '.findings[]?' < "$OUT_DIR/reviewer-normalized-$PASS.json"
```

Do not gate on `jq -e '.findings[]'` (exit 4 on a valid empty array). Malformed, incomplete, or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry. A partial output is not completion evidence. Record `$OUT_DIR/reviewer-stderr-$PASS.log` in the blocker report.

**Cost:** codex reports no per-request token counts; render the morning-report cost line as "not reported by codex-cli".

## Error handling

Reviewer unavailability is a blocker: stop, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the failure in `Blockers hit`.

| Trigger | Blocker | Note |
|---|---|---|
| `codex login status` non-zero | #1 | Tell the user to run `codex login`. |
| Rate limit exhausted | #1 | Suggest retry after cooldown. |
| `codex-exec` preflight exits 2 before any model turn (stderr names the `pwsh` it could not spawn) | none | Not a consumed invocation. Fix the host (MSI PowerShell 7 or `RAZORBACK_PWSH_DIR`) and dispatch again. |
| Empty stdout | #1 | Cite `reviewer-stderr-$PASS.log`. Consumed; do not re-run. |
| Schema violation / malformed output | #1 | The reviewer is unavailable for this run. Consumed; do not re-run. |
| 30-minute failsafe trips without complete output | #1 | Consumed. Do NOT raise the timeout and re-run, and do NOT split the diff and re-run. |

A run of 10-20+ minutes is working, not stuck. Wait for it.

## Security pass

Same invocation, same flags, schema file, model handling, timeout, and stdin pipe, run a second time from the same `$REVIEW_ROOT`. Only the pass name and the prompt differ:

```bash
PASS=security
```

Render `$SKILL_DIR/../security-review/security-adversarial-prompt.txt` with the same `$SOURCE_EVIDENCE` section into a fresh `PAYLOAD_FILE`, redact it, apply `prepare-review-artifact`, and pipe the fresh `$REVIEW_PROMPT_FILE`. Reusing the general prompt yields two general reviews and no security review. `$PASS` sends stdout to `$OUT_DIR/reviewer-output-security.json`, so `reviewer-output-general.json` is preserved. Apply the same parsing, cost, and error rules; a security-pass failure is reviewer unavailability, never a silent skip. If it fails, record the stderr log, then remove `"$REVIEW_ROOT"` and `"$OUT_DIR"` before returning the blocker.
