# Reviewer Prompt: claude

Invocation instructions for running `claude -p` as the pre-merge adversarial reviewer. Background on claude-cli's adversarial-review mode lives in the bundled `razorback:claude-cli` skill.

Bare relative paths below (like the blocker-taxonomy reference) are relative to this file's directory, `skills/pre-merge-review/reviewer-prompts/` inside the razorback plugin. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads — substitute it before running any command.

## Preconditions

- `claude --version` returns successfully (the CLI is installed).
- `claude auth status` exits 0 (logged in via Anthropic OAuth or API key). Exit 1 means not logged in; this is **blocker taxonomy #1** (credentials broken). Stop, surface, do not push. See the `razorback:using-razorback` skill's `references/blocker-taxonomy.md`.
- Do not add `--bare`. Current Claude help says bare mode skips OAuth and keychain auth reads, so it breaks the common login path.
- `$REVIEW_ROOT` is the temporary exported review tree prepared in pre-merge-review Step 1. It is outside `$PROJECT_DIR` and is shared by the general and security passes; do not run Claude from the live worktree.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the user prompt

The adversarial system prompt (loaded via `--system-prompt-file`) supplies the operating stance, attack-surface categories, finding bar, calibration, and grounding rules. The user prompt therefore carries only the target-specific context; the same three inputs codex gets:

```bash
DIFF_AND_CONTEXT="Review the complete code-change bundle for bugs, security issues, correctness problems, and material improvements. Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence.

Target: branch <name>: base..HEAD

File stat:
$FILE_STAT

User focus: ${USER_FOCUS:-none specified}

Commit log:
$COMMIT_LOG

Diff:
$DIFF"
```

If the plan path is short and likely to orient the reviewer, append it ("Plan: docs/plans/…"). Do not paste the full plan; the reviewer is supposed to form an independent take. The caller writes this complete prompt to `$PAYLOAD_FILE`, including the review instruction, optional focus, and bundle, filters it through `skills/security-review/scripts/redact-outbound`, and applies the shared [`review-payload.md`](../../security-review/review-payload.md) contract. It exposes the resulting `$REVIEW_PROMPT_FILE` for the invocation and records the large artifact path in `$REVIEW_ARTIFACT`. For bundles over 128 KiB, `$REVIEW_PROMPT_FILE` contains only the bounded static instruction `Read and follow the complete redacted review bundle at:` plus its path; Claude reads the complete redacted prompt from `.razorback-review/review-input.md` inside `$REVIEW_ROOT` with `Read,Grep,Glob`. Never load the large artifact into a shell variable or pass it as a positional argument.

## Invocation

Claude's `--json-schema` takes a string and `--system-prompt-file` takes a file path. Read the schema from the canonical file; point `--system-prompt-file` straight at claude-cli's canonical adversarial prompt. Do not add `--bare`; current Claude help says bare mode skips OAuth and keychain auth reads.

The claude-side schema string must NOT contain a `$schema` key — claude 2.1.209's validator rejects it (`no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`) before the run starts. The canonical schema file keeps `$schema` for other reviewers, so strip it at read time rather than editing the file.

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

`REVIEW_ROOT` and `OUT_DIR` must both live outside the live worktree. The review root is created once by pre-merge-review and is shared across both passes; the caller removes it explicitly after both outputs are captured and parsed. `OUT_DIR` is private per invocation, so its local `trap` only removes reviewer output files and is not the review-root lifecycle.

The validated baseline flags are: `-p`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--safe-mode`, `--output-format json`, `--json-schema`, `--tools "Read,Grep,Glob"`, `--strict-mcp-config`, optional `${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"}`, `--system-prompt-file`.

Flag rationale:

- `-p` - non-interactive, print-and-exit (parity with `codex exec`).
- No `--bare` flag - current Claude help says bare mode skips OAuth and keychain auth reads. A working reviewer beats a broken "pure" invocation.
- `--no-session-persistence` - ephemeral session (parity with codex's `--ephemeral`).
- `--dangerously-skip-permissions` - required for scripted non-interactive use.
- `--safe-mode` - disables branch-controlled startup hooks and settings while preserving the explicit read-only tool allowlist.
- `--output-format json --json-schema …` - structured review output conforming to the shared schema.
- `--tools "Read,Grep,Glob"` — read-only, enforced at the CLI layer: no tool in the allowlist can write. Do NOT add `Bash` — an unrestricted Bash tool can write files and would make the read-only claim prompt-deep only. Small bundles are embedded in the prompt; large bundles are in the reviewer-root-local artifact read through the existing allowlist.
- `--strict-mcp-config` - drops MCP servers inherited from user/project settings, which can carry write-capable tools into an otherwise read-only allowlist.
- **No `--max-turns` and no `--max-budget-usd`** - razorback caps neither the turns nor the spend of a review. Either cap truncates the review mid-flight and can leave unusable evidence while still consuming the campaign invocation. The review's scope is set by the prompt, not by a mechanical limit; let the reviewer finish the job. Do not add the flags back; a user who wants a hard ceiling sets it themselves.
- `--model "$CLAUDE_MODEL"` - explicit model override when `CLAUDE_MODEL` is set. The review's value is a fresh session and prompt framing, not model superiority.
- `--system-prompt-file` - loads the adversarial operating stance directly from the canonical `skills/claude-cli/adversarial-prompt.txt` in the razorback plugin. No copy is made, so there is nothing to keep in sync.
- `2> "$OUT_DIR/claude-stderr.log"` - retains diagnostics from the same invocation for a blocker report while stdout remains the result envelope. Do not re-run merely to recover discarded stderr.

**Timeout:** set the Bash tool's `timeout` to `1800000` ms (30 min). This is a failsafe against a hung process, not a budget for the review. Do not lower it to bound cost, and do not raise it and re-run when it trips.

## Expected output format

A **result envelope** on stdout: `{"type":"result","subtype":"success","result":"<JSON string>","structured_output":{…},"usage":{…},"total_cost_usd":…,…}`. With `--json-schema`, the schema-conforming object lands in `.structured_output`; `.result` carries the same JSON as a string. The model response is NOT the top-level object. The normalized review must include `review_completed: true`, a non-empty unique `files_inspected` list, a `commands_run` array (which may be empty), and non-empty file/line/observation `evidence`; `needs-attention` requires at least one finding.

## Parsing

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/claude-output.json" > "$OUT_DIR/claude-normalized.json"
jq '.findings[]?' < "$OUT_DIR/claude-normalized.json"
```

Malformed, incomplete, or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry. Record diagnostics from `$OUT_DIR/claude-stderr.log` in the blocker report.

A partial output is not completion evidence and must not be accepted.

## Cost / token notes

Claude's result envelope surfaces both dollars and tokens: `.total_cost_usd`, `.usage.input_tokens`, `.usage.output_tokens` (plus cache fields and `.modelUsage`). Render the morning report's external-review cost line for claude from those fields, e.g. "claude used N in / M out tokens, $X.XX". (Codex is the reviewer that reports no per-request counts.)

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer for the run.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`claude auth status` exits 1) → **blocker taxonomy #1** (credentials broken). Tell the user to run `claude auth login`.
- **Rate limit exhausted** (Claude plan's rolling usage limits tripped) → **blocker taxonomy #1** - credentials work but the backing service is unavailable. Suggest retry-after-cooldown or dropping the reviewer-choice to `none` on the next run.
- **Old `--bare` snippet copied into the command** → do not dispatch. Current Claude help says bare mode skips OAuth and keychain auth reads. If it was dispatched and failed, that pass's invocation is consumed and the campaign blocks.
- **Empty stdout** → **blocker taxonomy #1**. Use the captured `$OUT_DIR/claude-stderr.log` in the blocker note. The invocation is consumed; do not re-run it.
- **The 30-minute failsafe trips without a complete output** → **blocker taxonomy #1**. The process hung or died; the diff was not too big. Do NOT raise the timeout and re-run, do NOT split the diff and re-run, and do NOT add `--max-turns` to make the next run finish sooner. One burned attempt is enough — block and let the human decide.
- **Schema violation or malformed output** → **blocker taxonomy #5** (unresolvable — the reviewer produced unusable output). The invocation is consumed; do not re-run it.

A truncated result is incomplete and must be rejected by `validate-review-output`; block the campaign and record the captured diagnostics.

**Not a blocker:**

- **A long run.** A review that takes 10-20+ minutes is working, not stuck. Wait for it.

## Security pass

When the run includes the dedicated security pass, run `claude -p` a second time with the validated baseline flags unchanged — same schema string, same read-only allowlist, same model handling, same timeout. The only change is that `--system-prompt-file` points at the canonical security prompt in the razorback plugin:

```bash
PROMPT_FILE="$SKILL_DIR/../security-review/security-adversarial-prompt.txt"
```

Run the second command from the same exported tree: `cd "$REVIEW_ROOT" && claude -p …`. Do not switch back to `$PROJECT_DIR` or create a second review root. If this pass fails, remove `"$REVIEW_ROOT"` explicitly before returning the blocker.

Build `$DIFF_AND_CONTEXT` exactly as under "Build the user prompt", including its instruction and optional focus, redact it into a fresh `$REDACTED_PAYLOAD_FILE`, and apply `prepare-review-artifact` to select the shared `$REVIEW_PROMPT_FILE`. Capture stdout to a second file in the same private temp directory, `$OUT_DIR/claude-output-security.json`, so the general pass's `$OUT_DIR/claude-output.json` is preserved. Do not pass the security payload positionally, interpolate it into a large wrapper, or reload a large artifact into stdin.

Parse rules, cost notes, and error handling are identical to the general pass: apply `validate-review-output` to `$OUT_DIR/claude-output-security.json`, preserve the empty-findings rule for `approve`, and apply the no-retry blocking rule. Render the cost line from the same envelope fields.

**A security-pass failure is reviewer unavailability.** The same triggers and the same blocker protocol from Error handling apply: stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`. Never silently skip the security pass.
