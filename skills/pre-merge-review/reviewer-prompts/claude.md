# Reviewer Prompt: claude

Invocation instructions for running `claude -p` as the pre-merge adversarial reviewer. Background on claude-cli's adversarial-review mode lives in the bundled `razorback:claude-cli` skill. This file is self-contained; both the schema JSON and the adversarial system prompt are inlined below, so no knowledge of the razorback install path is required.

## Preconditions

- `claude --version` returns successfully (the CLI is installed).
- `claude auth status` exits 0 (logged in via Anthropic OAuth or API key). Exit 1 means not logged in; this is **blocker taxonomy #1** (credentials broken). Stop, surface, do not push. See `skills/using-razorback/references/blocker-taxonomy.md`.
- Do not add `--bare`. Current Claude help says bare mode skips OAuth and keychain auth reads, so it breaks the common login path.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the user prompt

The adversarial system prompt (loaded via `--system-prompt-file`) supplies the operating stance, attack-surface categories, finding bar, calibration, and grounding rules. The user prompt therefore carries only the target-specific context; the same three inputs codex and gemini get:

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

Claude's `--json-schema` takes a string and `--system-prompt-file` takes a file path. Inline the schema as a string; materialize the adversarial prompt to a temp file. Do not add `--bare`; current Claude help says bare mode skips OAuth and keychain auth reads.

```bash
SCHEMA_JSON='{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false,"required":["verdict","summary","findings","next_steps"],"properties":{"verdict":{"type":"string","enum":["approve","needs-attention"]},"summary":{"type":"string","minLength":1},"findings":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["severity","title","body","file","line_start","line_end","confidence","recommendation"],"properties":{"severity":{"type":"string","enum":["critical","high","medium","low"]},"title":{"type":"string","minLength":1},"body":{"type":"string","minLength":1},"file":{"type":"string","minLength":1},"line_start":{"type":"integer","minimum":1},"line_end":{"type":"integer","minimum":1},"confidence":{"type":"number","minimum":0,"maximum":1},"recommendation":{"type":"string"}}}},"next_steps":{"type":"array","items":{"type":"string","minLength":1}}}}'

PROMPT_FILE=$(mktemp) && trap 'rm -f "$PROMPT_FILE"' EXIT
cat > "$PROMPT_FILE" <<'PROMPT_EOF'
You are Claude performing an adversarial software review.
Your job is to break confidence in the change, not to validate it.

Target: {{TARGET_LABEL}}
User focus: {{USER_FOCUS}}

OPERATING STANCE:
Default to skepticism. Assume the change can fail in subtle, high-cost, or
user-visible ways until evidence says otherwise. Do not give credit for good
intent, partial fixes, or likely follow-up work. If something only works on
the happy path, treat that as a real weakness.

ATTACK SURFACE (prioritize expensive, dangerous, or hard-to-detect failures):
- Auth, permissions, tenant isolation, and trust boundaries
- Data loss, corruption, duplication, and irreversible state changes
- Rollback safety, retries, partial failure, and idempotency gaps
- Race conditions, ordering assumptions, stale state, and re-entrancy
- Empty-state, null, timeout, and degraded dependency behavior
- Version skew, schema drift, migration hazards, and compatibility regressions
- Observability gaps that would hide failure or make recovery harder

REVIEW METHOD:
Actively try to disprove the change. Look for violated invariants, missing
guards, unhandled failure paths, and assumptions that stop being true under
stress. Trace how bad inputs, retries, concurrent actions, or partially
completed operations move through the code. If the user supplied a focus area,
weight it heavily, but still report any other material issue you can defend.
Use Read to inspect files and Bash for read-only investigation (grep, git log,
diff). Do not modify files.

FINDING BAR:
Report only material findings. No style feedback, naming feedback, low-value
cleanup, or speculative concerns without evidence. Each finding must answer:
1. What can go wrong?
2. Why is this code path vulnerable?
3. What is the likely impact?
4. What concrete change would reduce the risk?

CALIBRATION:
Prefer one strong finding over several weak ones. Do not dilute serious issues
with filler. If the change looks safe, say so directly and return no findings.

GROUNDING:
Every finding must be defensible from the provided context. Do not invent
files, lines, code paths, or runtime behavior you cannot support. If a
conclusion depends on an inference, state that explicitly and keep the
confidence honest.

Return JSON matching the provided schema.

REPOSITORY CONTEXT:
{{REVIEW_INPUT}}
PROMPT_EOF

CLAUDE_MODEL="${RAZORBACK_CLAUDE_REVIEW_MODEL:-opus}"

cd "$PROJECT_DIR" && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model "$CLAUDE_MODEL" \
  --system-prompt-file "$PROMPT_FILE" \
  "$DIFF_AND_CONTEXT" \
  2>/dev/null
```

The validated baseline flags are: `-p`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--output-format json`, `--json-schema`, `--tools "Read,Bash"`, `--max-turns 15`, `--max-budget-usd 5.00`, `--model "$CLAUDE_MODEL"`, `--system-prompt-file`.

Flag rationale:

- `-p` - non-interactive, print-and-exit (parity with `codex exec`).
- No `--bare` flag - current Claude help says bare mode skips OAuth and keychain auth reads. A working reviewer beats a broken "pure" invocation.
- `--no-session-persistence` - ephemeral session (parity with codex's `--ephemeral`).
- `--dangerously-skip-permissions` - required for scripted non-interactive use.
- `--output-format json --json-schema …` - structured review output conforming to the shared schema.
- `--tools "Read,Bash"` - read-only. The reviewer can read files and run shell commands (grep, git log, diff) but cannot edit. Enforced at the CLI layer, not only by prompt.
- `--max-turns 15 --max-budget-usd 5.00` - bounded cost/time. Raise only if a run legitimately needs more.
- `--model "$CLAUDE_MODEL"` - strategy or escalation tier from the plan's Model Routing section. The review's value is a fresh session and prompt framing, not model superiority.
- `--system-prompt-file` - loads the adversarial operating stance from the temp file built above. The canonical source for that prompt is `skills/claude-cli/adversarial-prompt.txt` in the razorback plugin; update both in sync.

**Timeout:** at least `600000` ms (10 min). Escalation-tier models on a large diff can take minutes.

## Expected output format

Direct JSON conforming to the schema inlined above (same schema as the codex path). **No envelope**; unlike gemini, claude's `--output-format json` returns the model response directly on stdout.

## Parsing

```bash
jq -e '.findings[]' < claude-output.json
```

On parse failure, retry **once** with a stricter prompt instructing claude to return ONLY JSON conforming to the schema (no prose, no prefatory text). If the retry still fails to produce schema-valid output, reviewer unavailability applies; see Error Handling below. Do NOT loop beyond one retry (single pass rule).

If a schema-valid partial output exists despite a mid-stream failure (e.g. budget/turn cap trips but `.findings[]` parses), use it and note the truncation in the morning report.

## Cost / token notes

Claude's `--output-format json` does not surface per-request token counts in a stable field. The morning report's external-review cost line for claude is rendered as "cost not reported by claude-cli" (or omitted), same as codex.

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer at plan approval.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (`claude auth status` exits 1) → **blocker taxonomy #1** (credentials broken). Tell the user to run `claude login`.
- **Rate limit exhausted** (Claude plan's rolling usage limits tripped) → **blocker taxonomy #1** - credentials work but the backing service is unavailable. Suggest retry-after-cooldown or dropping the reviewer-choice to `none` on the next run.
- **Budget cap trips with no schema-valid partial output** (`--max-budget-usd` exhausted before `.findings[]` was produced) → **blocker taxonomy #1**. Raise the cap and re-run, or block.
- **Turn cap trips with no schema-valid partial output** (`--max-turns` exhausted before final JSON) → **blocker taxonomy #1**. Raise `--max-turns` to 25 and re-run, or shrink the context, otherwise block.
- **Old `--bare` snippet copied into the command** → **blocker taxonomy #1** until you remove that flag and re-run. Current Claude help says bare mode skips OAuth and keychain auth reads.
- **Empty stdout** → **blocker taxonomy #1**. Remove `2>/dev/null` and re-run to surface stderr in the blocker note.
- **Schema violation that persists after one retry with a stricter prompt** → **blocker taxonomy #5** (unresolvable — the reviewer is producing unusable output).

If a schema-valid partial output exists despite the failure (budget or turn cap trips mid-stream but `.findings[]` parses), use it and note the truncation in the morning report. Otherwise, block.

**Not a blocker:**

- **Timeout (Bash-level)** - first raise the Bash tool's timeout and re-run. Splitting the diff breaks cross-file reasoning and is a last resort. Only if generous timeouts also fail does this become a blocker (taxonomy #1 - service unavailable).
