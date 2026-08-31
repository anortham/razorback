# Reviewer Prompt: codex

Invocation instructions for running `codex` as the pre-merge adversarial reviewer. Background on codex's adversarial-review mode lives in the bundled `razorback:codex-cli` skill.

Bare relative paths below (like the blocker-taxonomy reference) are relative to this file's directory, `skills/pre-merge-review/reviewer-prompts/` inside the razorback plugin. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads — substitute it before running any command.

## Preconditions

- `codex --version` returns successfully (the CLI is installed).
- `codex login status` exits 0 (authenticated via ChatGPT OAuth). If it exits non-zero, this is **blocker taxonomy #1** (credentials broken) — stop the review, surface the blocker, and do not push the branch. See `../../using-razorback/references/blocker-taxonomy.md` in the razorback plugin.
- `$REVIEW_ROOT` is the temporary exported review tree prepared in pre-merge-review Step 1. It is outside `$PROJECT_DIR` and is shared by the general and security passes; do not run Codex from the live worktree.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the adversarial prompt

Read the canonical adversarial prompt template at `$SKILL_DIR/../codex-cli/adversarial-prompt.txt` in the razorback plugin. Substitute:

- `{{TARGET_LABEL}}` ← `$FILE_STAT` plus a short description, e.g. `"branch <name>: N files changed, base..HEAD"`.
- `{{USER_FOCUS}}` ← `$USER_FOCUS` if set during execution handoff, otherwise `"none specified"`.
- `{{REVIEW_INPUT}}` ← `$FILE_STAT`, `$COMMIT_LOG`, and `$DIFF`, concatenated under labelled headings.

The template instructs codex to default to skepticism, prioritize high-impact attack surfaces (auth, data loss, race conditions, schema drift, observability gaps), emit only material findings, and return JSON matching the shared schema.

The caller writes the complete rendered prompt to `$PAYLOAD_FILE`, filters it
through `skills/security-review/scripts/redact-outbound`, and exposes the final
bytes as `$REDACTED_PAYLOAD_FILE`. Keep the payload in that file; do not pass a
large diff to `echo` or any other positional argument.

## Invocation

Codex's `--output-schema` flag takes a file path, so point it straight at the canonical schema file — no temp copy needed:

```bash
SCHEMA_FILE="$SKILL_DIR/../codex-cli/schemas/review-output.schema.json"

CODEX_MODEL="${RAZORBACK_CODEX_REVIEW_MODEL:-}"  # empty = inherit global default

OUT_DIR=$(mktemp -d)
trap 'rm -rf "$OUT_DIR"' EXIT

cd "$REVIEW_ROOT" && cat "$REDACTED_PAYLOAD_FILE" | codex exec \
  --ephemeral --color never \
  -s read-only \
  --skip-git-repo-check \
  --ignore-user-config \
  --ignore-rules \
  ${CODEX_MODEL:+-m "$CODEX_MODEL"} \
  --output-schema "$SCHEMA_FILE" \
  - \
  > "$OUT_DIR/codex-output.json" 2> "$OUT_DIR/codex-stderr.log"
```

`REVIEW_ROOT` and `OUT_DIR` must both live outside the live worktree. The review root is created once by pre-merge-review and is shared across both passes; the caller removes it explicitly after both outputs are captured and parsed. `OUT_DIR` is private per invocation, so its local `trap` only removes reviewer output files and is not the review-root lifecycle.

Flag rationale:

- `--ephemeral` — no persistent session left behind.
- `--color never` — clean non-interactive output suitable for piping into `jq`.
- `-s read-only` — sandbox policy that blocks file writes at the CLI layer. This is what actually enforces "the reviewer never edits code"; the prompt's read-only instruction is backup, not the mechanism.
- `--skip-git-repo-check` — permits review from the exported tree, which intentionally has no `.git` directory.
- `--ignore-user-config --ignore-rules` — prevents user/project configuration and branch-controlled rules from becoming reviewer control input.
- `${CODEX_MODEL:+-m "$CODEX_MODEL"}` — explicit model override from `RAZORBACK_CODEX_REVIEW_MODEL`. When unset, the expansion is empty and codex uses its configured default.
- `--output-schema` — forces codex to return JSON conforming to the shared review-output schema. A completed result includes `review_completed: true`, non-empty unique `files_inspected`, a `commands_run` array (which may be empty), and non-empty file/line/observation `evidence`; `needs-attention` requires a finding. `reviewer-prompts/claude.md` reads the same canonical file (minus the `$schema` key, which claude's validator rejects), so both reviewers target an identical shape.
- `-` — read the prompt from stdin (which is the piped `$REDACTED_PAYLOAD_FILE`).
- `2> "$OUT_DIR/codex-stderr.log"` — keep stdout JSON-only while retaining diagnostics from the same invocation for a blocker report. Do not re-run merely to recover discarded stderr.

**Model:** `RAZORBACK_CODEX_REVIEW_MODEL` is an optional explicit override. When unset, codex inherits its global default.

**Timeout:** set the Bash tool's `timeout` to `1800000` (30 min). This is a failsafe against a hung process, not a budget for the review. Do not lower it to bound cost, and do not raise it and re-run when it trips.

## Expected output format

JSON conforming to the canonical schema:

```json
{
  "verdict": "approve" | "needs-attention",
  "summary": "...",
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "title": "...",
      "body": "...",
      "file": "path/to/file.ext",
      "line_start": 42,
      "line_end": 58,
      "confidence": 0.85,
      "recommendation": "..."
    }
  ],
  "next_steps": ["..."],
  "review_completed": true,
  "files_inspected": ["path/to/file.ext"],
  "commands_run": [],
  "evidence": [
    {
      "file": "path/to/file.ext",
      "line_start": 42,
      "line_end": 58,
      "observation": "Concrete observation from the reviewed diff."
    }
  ]
}
```

## Parsing

Direct — no envelope. Parse with `jq`:

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/codex-output.json" > "$OUT_DIR/codex-normalized.json"
jq '.findings[]?' < "$OUT_DIR/codex-normalized.json"
```

The validator exits non-zero if the result is missing completion evidence or is malformed. Do NOT gate on `jq -e '.findings[]'` — it exits 4 on a valid empty array, turning a clean review into a false parse failure. Malformed, incomplete, or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry. Record diagnostics from `$OUT_DIR/codex-stderr.log` in the blocker report.

A partial output is not completion evidence and must not be accepted.

## Cost / token notes

Codex's JSON output does not include per-request token counts. The morning report's external-review cost line for codex is omitted (or rendered as "not reported by codex-cli"). If you need cost tracking, the `codex` CLI itself logs usage to its own history — out of scope for this skill.

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer for the run.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`codex login status` exits non-zero) → **blocker taxonomy #1** (credentials broken). Tell the user to run `codex login`.
- **Rate limit exhausted** (ChatGPT plan's rolling 5-hour limits tripped) → **blocker taxonomy #1** — credentials work but the backing service is unavailable. Suggest retry-after-cooldown in the blocker note.
- **Empty stdout** → **blocker taxonomy #1**. Use the captured `$OUT_DIR/codex-stderr.log` in the blocker note. Common causes: bad schema path, missing network. The invocation is consumed; do not re-run it.
- **Schema violation or malformed output** → **blocker taxonomy #5** (unresolvable — the reviewer produced unusable output). The invocation is consumed; do not re-run it.
- **The 30-minute failsafe trips without a complete output** → **blocker taxonomy #1**. The process hung or died; the diff was not too big. Do NOT raise the timeout and re-run, and do NOT split the diff and re-run — splitting also breaks the reviewer's ability to reason about cross-file interactions. One burned attempt is enough — block and let the human decide.

A truncated result is incomplete and must be rejected by `validate-review-output`; block the campaign and record the captured diagnostics.

**Not a blocker:**

- **A long run.** A review that takes 10-20+ minutes is working, not stuck. Wait for it.

## Security pass

When the run includes the dedicated security pass, run codex a second time. The invocation is the SAME as the general pass — `codex exec --ephemeral --color never -s read-only --output-schema "$SCHEMA_FILE" -`, with the same model handling, timeout, and stdin pipe as the Invocation section above.

The stdin prompt is NOT the same. Rebuild the security template into a fresh
`PAYLOAD_FILE`, redact it into a fresh `$REDACTED_PAYLOAD_FILE`, and pipe that
file — not the general pass's payload — into the second `codex exec`. Reusing
the general pass's rendered prompt here is an error: it produces two general
reviews and no security review.
Build the security template from the canonical
`$SKILL_DIR/../security-review/security-adversarial-prompt.txt` file.

Capture stdout to a second file in the same private temp directory, `$OUT_DIR/reviewer-output-security.json`, so the general pass's `$OUT_DIR/codex-output.json` is preserved.

Run the second command from the same exported tree: `cd "$REVIEW_ROOT" && … | codex exec …`. Keep `--skip-git-repo-check`, `--ignore-user-config`, and `--ignore-rules` unchanged. Do not switch back to `$PROJECT_DIR` or create a second review root. If this pass fails, remove `"$REVIEW_ROOT"` explicitly before returning the blocker.

Parse rules, cost notes, and error handling are identical to the general pass: apply the Parsing section's shape check, empty-findings rule, and no-retry blocking rule to `$OUT_DIR/reviewer-output-security.json`, and the Cost / token notes unchanged.

**A security-pass failure is reviewer unavailability.** The same triggers and the same blocker protocol from Error handling apply: stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`. Never silently skip the security pass.

## Adversarial prompt template

The canonical template is `$SKILL_DIR/../codex-cli/adversarial-prompt.txt` in the razorback plugin — read it at dispatch time and substitute the placeholders as described under "Build the adversarial prompt" above. It is the Codex variant of a deliberate pair; `skills/claude-cli/adversarial-prompt.txt` differs only in the model name and a REVIEW METHOD line naming Claude's `Read`/`Grep`/`Glob` tools.
