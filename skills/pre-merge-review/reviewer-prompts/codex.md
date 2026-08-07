# Reviewer Prompt: codex

Invocation instructions for running `codex` as the pre-merge adversarial reviewer. Background on codex's adversarial-review mode lives in the bundled `razorback:codex-cli` skill.

Bare relative paths below (like the blocker-taxonomy reference) are relative to this file's directory, `skills/pre-merge-review/reviewer-prompts/` inside the razorback plugin. `$SKILL_DIR` is the pre-merge-review skill's own base directory, announced when the skill loads — substitute it before running any command.

## Preconditions

- `codex --version` returns successfully (the CLI is installed).
- `codex login status` exits 0 (authenticated via ChatGPT OAuth). If it exits non-zero, this is **blocker taxonomy #1** (credentials broken) — stop the review, surface the blocker, and do not push the branch. See `../../using-razorback/references/blocker-taxonomy.md` in the razorback plugin.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the adversarial prompt

Read the canonical adversarial prompt template at `$SKILL_DIR/../codex-cli/adversarial-prompt.txt` in the razorback plugin. Substitute:

- `{{TARGET_LABEL}}` ← `$FILE_STAT` plus a short description, e.g. `"branch <name>: N files changed, base..HEAD"`.
- `{{USER_FOCUS}}` ← `$USER_FOCUS` if set during execution handoff, otherwise `"none specified"`.
- `{{REVIEW_INPUT}}` ← `$FILE_STAT`, `$COMMIT_LOG`, and `$DIFF`, concatenated under labelled headings.

The template instructs codex to default to skepticism, prioritize high-impact attack surfaces (auth, data loss, race conditions, schema drift, observability gaps), emit only material findings, and return JSON matching the shared schema.

## Invocation

Codex's `--output-schema` flag takes a file path, so point it straight at the canonical schema file — no temp copy needed:

```bash
SCHEMA_FILE="$SKILL_DIR/../codex-cli/schemas/review-output.schema.json"

CODEX_MODEL="${RAZORBACK_CODEX_REVIEW_MODEL:-}"  # empty = inherit global default

cd "$PROJECT_DIR" && echo "$ADVERSARIAL_PROMPT_WITH_DIFF" | codex exec \
  --ephemeral --color never \
  -s read-only \
  ${CODEX_MODEL:+-m "$CODEX_MODEL"} \
  --output-schema "$SCHEMA_FILE" \
  - \
  2>/dev/null
```

Flag rationale:

- `--ephemeral` — no persistent session left behind.
- `--color never` — clean non-interactive output suitable for piping into `jq`.
- `-s read-only` — sandbox policy that blocks file writes at the CLI layer. This is what actually enforces "the reviewer never edits code"; the prompt's read-only instruction is backup, not the mechanism.
- `${CODEX_MODEL:+-m "$CODEX_MODEL"}` — explicit model override from `RAZORBACK_CODEX_REVIEW_MODEL`. When unset, the expansion is empty and codex uses its configured default.
- `--output-schema` — forces codex to return JSON conforming to the shared review-output schema. `reviewer-prompts/claude.md` reads the same canonical file (minus the `$schema` key, which claude's validator rejects), so both reviewers target an identical shape.
- `-` — read the prompt from stdin (which is the piped `$ADVERSARIAL_PROMPT_WITH_DIFF`).
- `2>/dev/null` — drop codex's session banner and transcript noise; the JSON lands on stdout.

**Model:** `RAZORBACK_CODEX_REVIEW_MODEL` is an optional explicit override. When unset, codex inherits its global default.

**Timeout:** set the Bash tool's `timeout` to at least `600000` (10 min). Large diffs can take minutes.

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
  "next_steps": ["..."]
}
```

## Parsing

Direct — no envelope. Parse with `jq`:

```bash
jq -e '.findings | type == "array"' < codex-output.json >/dev/null   # shape check
jq '.findings[]?' < codex-output.json                                 # iterate; empty = clean review
```

The shape check exits non-zero if `.findings` is missing or malformed. Do NOT gate on `jq -e '.findings[]'` — it exits 4 on a valid empty array, turning a clean review into a false parse failure. On parse failure, retry **once** with a stricter prompt instructing codex to return ONLY JSON conforming to the schema (no prose). If the retry still fails to produce schema-valid output, reviewer unavailability applies — see Error Handling below. Do NOT loop beyond one retry (single pass rule).

If a schema-valid partial output exists despite a mid-stream failure (e.g. stdout truncated but `.findings[]` parses), use it and note the truncation in the morning report.

## Cost / token notes

Codex's JSON output does not include per-request token counts. The morning report's external-review cost line for codex is omitted (or rendered as "not reported by codex-cli"). If you need cost tracking, the `codex` CLI itself logs usage to its own history — out of scope for this skill.

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer for the run.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`codex login status` exits non-zero) → **blocker taxonomy #1** (credentials broken). Tell the user to run `codex login`.
- **Rate limit exhausted** (ChatGPT plan's rolling 5-hour limits tripped) → **blocker taxonomy #1** — credentials work but the backing service is unavailable. Suggest retry-after-cooldown in the blocker note.
- **Empty stdout** → **blocker taxonomy #1**. Remove `2>/dev/null` and re-run to surface stderr in the blocker note. Common causes: bad schema path, missing network.
- **Schema violation that persists after one retry with a stricter prompt** → **blocker taxonomy #5** (unresolvable — the reviewer is producing unusable output).

If a schema-valid partial output exists despite the failure, use it and proceed with a truncation note. Otherwise, block.

**Not a blocker:**

- **Timeout** — first raise the Bash tool's timeout parameter and re-run. Splitting the diff breaks the reviewer's ability to reason about cross-file interactions and is a last resort. Only if generous timeouts also fail does this become a blocker (taxonomy #1 — service unavailable).

## Adversarial prompt template

The canonical template is `$SKILL_DIR/../codex-cli/adversarial-prompt.txt` in the razorback plugin — read it at dispatch time and substitute the placeholders as described under "Build the adversarial prompt" above. It is the Codex variant of a deliberate pair; `skills/claude-cli/adversarial-prompt.txt` differs only in the model name and a REVIEW METHOD line naming Claude's `Read`/`Grep`/`Glob` tools.
