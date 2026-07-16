# Reviewer Prompt: claude

Invocation instructions for running `claude -p` as the pre-merge adversarial reviewer. Background on claude-cli's adversarial-review mode lives in the bundled `razorback:claude-cli` skill.

Paths below are relative to this file (`skills/pre-merge-review/reviewer-prompts/`) inside the razorback plugin — the same convention the blocker-taxonomy reference below uses. Set `RAZORBACK_DIR` to the plugin root if you need absolute paths:

```bash
REVIEWER_PROMPTS_DIR="$RAZORBACK_DIR/skills/pre-merge-review/reviewer-prompts"
```

## Preconditions

- `claude --version` returns successfully (the CLI is installed).
- `claude auth status` exits 0 (logged in via Anthropic OAuth or API key). Exit 1 means not logged in; this is **blocker taxonomy #1** (credentials broken). Stop, surface, do not push. See `../../using-razorback/references/blocker-taxonomy.md` in the razorback plugin.
- Do not add `--bare`. Current Claude help says bare mode skips OAuth and keychain auth reads, so it breaks the common login path.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the user prompt

The adversarial system prompt (loaded via `--system-prompt-file`) supplies the operating stance, attack-surface categories, finding bar, calibration, and grounding rules. The user prompt therefore carries only the target-specific context; the same three inputs codex gets:

```bash
DIFF_AND_CONTEXT="Target: $FILE_STAT (branch <name>: base..HEAD)

User focus: ${USER_FOCUS:-none specified}

Commit log:
$COMMIT_LOG

Diff:
$DIFF"
```

If the plan path is short and likely to orient the reviewer, append it ("Plan: docs/plans/…"). Do not paste the full plan; the reviewer is supposed to form an independent take.

## Invocation

Claude's `--json-schema` takes a string and `--system-prompt-file` takes a file path. Read the schema from the canonical file; point `--system-prompt-file` straight at claude-cli's canonical adversarial prompt. Do not add `--bare`; current Claude help says bare mode skips OAuth and keychain auth reads.

The claude-side schema string must NOT contain a `$schema` key — claude 2.1.209's validator rejects it (`no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`) before the run starts. The canonical schema file keeps `$schema` for other reviewers, so strip it at read time rather than editing the file.

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$REVIEWER_PROMPTS_DIR/../../codex-cli/schemas/review-output.schema.json")
PROMPT_FILE="$REVIEWER_PROMPTS_DIR/../../claude-cli/adversarial-prompt.txt"

CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-}"

cd "$PROJECT_DIR" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Grep,Glob" \
  --strict-mcp-config \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
  --system-prompt-file "$PROMPT_FILE" \
  "$DIFF_AND_CONTEXT" \
  < /dev/null 2>/dev/null
```

The validated baseline flags are: `-p`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--output-format json`, `--json-schema`, `--tools "Read,Grep,Glob"`, `--strict-mcp-config`, `--max-turns 15`, `--max-budget-usd 5.00`, optional `${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"}`, `--system-prompt-file`.

Flag rationale:

- `-p` - non-interactive, print-and-exit (parity with `codex exec`).
- No `--bare` flag - current Claude help says bare mode skips OAuth and keychain auth reads. A working reviewer beats a broken "pure" invocation.
- `--no-session-persistence` - ephemeral session (parity with codex's `--ephemeral`).
- `--dangerously-skip-permissions` - required for scripted non-interactive use.
- `--output-format json --json-schema …` - structured review output conforming to the shared schema.
- `--tools "Read,Grep,Glob"` - read-only, enforced at the CLI layer: no tool in the allowlist can write. Do NOT add `Bash` — an unrestricted Bash tool can write files and would make the read-only claim prompt-deep only. The diff and commit log are embedded in the prompt, so the reviewer doesn't need shell access.
- `--strict-mcp-config` - drops MCP servers inherited from user/project settings, which can carry write-capable tools into an otherwise read-only allowlist.
- `--max-turns 15 --max-budget-usd 5.00` - bounded cost/time. Raise only if a run legitimately needs more.
- `--model "$CLAUDE_MODEL"` - explicit model override when `CLAUDE_MODEL` is set. The review's value is a fresh session and prompt framing, not model superiority.
- `--system-prompt-file` - loads the adversarial operating stance directly from the canonical `skills/claude-cli/adversarial-prompt.txt` in the razorback plugin. No copy is made, so there is nothing to keep in sync.

**Timeout:** at least `600000` ms (10 min). Large diffs can take minutes.

## Expected output format

A **result envelope** on stdout: `{"type":"result","subtype":"success","result":"<JSON string>","structured_output":{…},"usage":{…},"total_cost_usd":…,…}`. With `--json-schema`, the schema-conforming object lands in `.structured_output`; `.result` carries the same JSON as a string. The model response is NOT the top-level object.

## Parsing

```bash
# Validate shape first — a clean review has findings: [] and must NOT read as a
# parse failure (`jq -e '.findings[]'` exits 4 on a valid empty array).
jq -e '.structured_output.findings | type == "array"' < claude-output.json >/dev/null \
  || jq -re '.result' < claude-output.json | jq -e '.findings | type == "array"' >/dev/null

# Then iterate (empty output for a clean review is success):
jq '.structured_output.findings[]?' < claude-output.json
```

On parse failure, retry **once** with a stricter prompt instructing claude to return ONLY JSON conforming to the schema (no prose, no prefatory text). If the retry still fails to produce schema-valid output, reviewer unavailability applies; see Error Handling below. Do NOT loop beyond one retry (single pass rule).

If a schema-valid partial output exists despite a mid-stream failure (e.g. budget/turn cap trips but `.findings[]` parses), use it and note the truncation in the morning report.

## Cost / token notes

Claude's result envelope surfaces both dollars and tokens: `.total_cost_usd`, `.usage.input_tokens`, `.usage.output_tokens` (plus cache fields and `.modelUsage`). Render the morning report's external-review cost line for claude from those fields, e.g. "claude used N in / M out tokens, $X.XX". (Codex is the reviewer that reports no per-request counts.)

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer for the run.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`claude auth status` exits 1) → **blocker taxonomy #1** (credentials broken). Tell the user to run `claude auth login`.
- **Rate limit exhausted** (Claude plan's rolling usage limits tripped) → **blocker taxonomy #1** - credentials work but the backing service is unavailable. Suggest retry-after-cooldown or dropping the reviewer-choice to `none` on the next run.
- **Budget cap trips with no schema-valid partial output** (`--max-budget-usd` exhausted before `.findings[]` was produced) → **blocker taxonomy #1**. Raise the cap and re-run, or block.
- **Turn cap trips with no schema-valid partial output** (`--max-turns` exhausted before final JSON) → **blocker taxonomy #1**. Raise `--max-turns` to 25 and re-run, or shrink the context, otherwise block.
- **Old `--bare` snippet copied into the command** → **blocker taxonomy #1** until you remove that flag and re-run. Current Claude help says bare mode skips OAuth and keychain auth reads.
- **Empty stdout** → **blocker taxonomy #1**. Remove `2>/dev/null` and re-run to surface stderr in the blocker note.
- **Schema violation that persists after one retry with a stricter prompt** → **blocker taxonomy #5** (unresolvable — the reviewer is producing unusable output).

If a schema-valid partial output exists despite the failure (budget or turn cap trips mid-stream but `.findings[]` parses), use it and note the truncation in the morning report. Otherwise, block.

**Not a blocker:**

- **Timeout (Bash-level)** - first raise the Bash tool's timeout and re-run. Splitting the diff breaks cross-file reasoning and is a last resort. Only if generous timeouts also fail does this become a blocker (taxonomy #1 - service unavailable).
