# Reviewer Prompt: codex

Invocation instructions for running `codex` as the pre-merge adversarial reviewer. Canonical source for the adversarial prompt and CLI shape is `~/.claude/skills/codex-cli/SKILL.md` — the "Adversarial Review" section there defines the full prompt template. This file wires that invocation into the pre-merge-review flow.

## Preconditions

- `codex --version` returns successfully (the CLI is installed).
- `codex login status` exits 0 (authenticated via ChatGPT OAuth). If it exits non-zero, this is **blocker taxonomy #1** (credentials broken) — stop the review, surface the blocker, and do not push the branch. See `skills/using-razorback/references/blocker-taxonomy.md`.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the adversarial prompt

Use the template from `~/.claude/skills/codex-cli/SKILL.md` "Adversarial Prompt Template". Substitute:

- `{{TARGET_LABEL}}` ← `$FILE_STAT` plus a short description, e.g. `"branch <name>: N files changed, base..HEAD"`.
- `{{USER_FOCUS}}` ← `$USER_FOCUS` if set at plan approval, otherwise `"none specified"`.
- `{{REVIEW_INPUT}}` ← `$FILE_STAT`, `$COMMIT_LOG`, and `$DIFF`, concatenated under labelled headings.

The template instructs codex to default to skepticism, prioritize high-impact attack surfaces (auth, data loss, race conditions, schema drift, observability gaps), emit only material findings, and return JSON matching the shared schema.

## Invocation

```bash
cd "$PROJECT_DIR" && echo "$ADVERSARIAL_PROMPT_WITH_DIFF" | codex exec \
  --ephemeral --color never \
  --output-schema ~/.claude/skills/codex-cli/schemas/review-output.schema.json \
  - \
  2>/dev/null
```

Flag rationale (see `~/.claude/skills/codex-cli/SKILL.md` for the full treatment):

- `--ephemeral` — no persistent session left behind.
- `--color never` — clean non-interactive output suitable for piping into `jq`.
- `--output-schema` — forces codex to return JSON conforming to the shared review-output schema. The schema is the same file codex-cli uses for ad-hoc adversarial reviews; reusing it keeps downstream parsing uniform across reviewers.
- `-` — read the prompt from stdin (which is the piped `$ADVERSARIAL_PROMPT_WITH_DIFF`).
- `2>/dev/null` — drop codex's session banner and transcript noise; the JSON lands on stdout.

**Model:** defaults to `gpt-5.4` with xhigh reasoning. Do not override with `-m` unless you have a concrete reason — xhigh on 5.4 is the right setting for adversarial review.

**Timeout:** set the Bash tool's `timeout` to at least `600000` (10 min). xhigh reasoning on a large diff can take minutes.

## Expected output format

JSON conforming to `~/.claude/skills/codex-cli/schemas/review-output.schema.json`:

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
jq -e '.findings[]' < codex-output.json
```

`jq -e` exits non-zero if `.findings` is missing or malformed. On parse failure, retry **once** with a stricter prompt instructing codex to return ONLY JSON conforming to the schema (no prose). If the retry still fails to produce schema-valid output, reviewer unavailability applies — see Error Handling below. Do NOT loop beyond one retry (single pass rule).

If a schema-valid partial output exists despite a mid-stream failure (e.g. stdout truncated but `.findings[]` parses), use it and note the truncation in the morning report.

## Cost / token notes

Codex's JSON output does not include per-request token counts. The morning report's external-review cost line for codex is omitted (or rendered as "not reported by codex-cli"). If you need cost tracking, the `codex` CLI itself logs usage to its own history — out of scope for this skill.

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer at plan approval.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`codex login status` exits non-zero) → **blocker taxonomy #1** (credentials broken). Tell Murphy to run `codex login`.
- **Rate limit exhausted** (ChatGPT plan's rolling 5-hour limits tripped) → **blocker taxonomy #1** — credentials work but the backing service is unavailable. Suggest retry-after-cooldown in the blocker note.
- **Empty stdout** → **blocker taxonomy #1**. Remove `2>/dev/null` and re-run to surface stderr in the blocker note. Common causes: bad schema path, missing network.
- **Schema violation that persists after one retry with a stricter prompt** → **blocker taxonomy #5** (unresolvable — the reviewer is producing unusable output).

If a schema-valid partial output exists despite the failure, use it and proceed with a truncation note. Otherwise, block.

**Not a blocker:**

- **Timeout** — first raise the Bash tool's timeout parameter and re-run. Splitting the diff breaks the reviewer's ability to reason about cross-file interactions and is a last resort. Only if generous timeouts also fail does this become a blocker (taxonomy #1 — service unavailable).
