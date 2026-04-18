# Reviewer Prompt: claude

Invocation instructions for running `claude -p` as the pre-merge adversarial reviewer. Canonical source for the adversarial prompt, the flag rationale, and the full command is `~/.claude/skills/claude-cli/SKILL.md` "Adversarial Review" section. This file **quotes** that command verbatim so it is self-contained, but that SKILL.md remains the source of truth — if the CLI contract changes, update it there first, then propagate here.

## Preconditions

- `claude --version` returns successfully (the CLI is installed).
- `claude auth status` exits 0 (logged in via Anthropic OAuth or API key). Exit 1 means not logged in — this is **blocker taxonomy #1** (credentials broken). Stop, surface, do not push. See `skills/using-razorback/references/blocker-taxonomy.md`.
- The schema file exists at `~/.claude/skills/claude-cli/schemas/review-output.schema.json`. If it was installed as a copy of codex-cli's schema (Phase 1 Task 3), both files should match byte-for-byte.
- The adversarial system-prompt file exists at `~/.claude/skills/claude-cli/adversarial-prompt.txt`.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the user prompt

The adversarial system prompt (loaded via `--system-prompt-file`) supplies the operating stance, attack-surface categories, finding bar, calibration, and grounding rules. The user prompt therefore carries only the target-specific context — the same three inputs codex and gemini get:

```bash
DIFF_AND_CONTEXT="Target: $FILE_STAT (branch <name>: base..HEAD)

User focus: ${USER_FOCUS:-none specified}

Commit log:
$COMMIT_LOG

Diff:
$DIFF"
```

If the plan path is short and likely to orient the reviewer, append it ("Plan: docs/plans/…"). Do not paste the full plan — the reviewer is supposed to form an independent take.

## Invocation

Quoted from `~/.claude/skills/claude-cli/SKILL.md` "Adversarial Review":

```bash
cd "$PROJECT_DIR" && claude -p \
  --bare \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$(cat ~/.claude/skills/claude-cli/schemas/review-output.schema.json)" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model opus \
  --system-prompt-file ~/.claude/skills/claude-cli/adversarial-prompt.txt \
  "$DIFF_AND_CONTEXT" \
  2>/dev/null
```

All 11 validated flags are present: `-p`, `--bare`, `--no-session-persistence`, `--dangerously-skip-permissions`, `--output-format json`, `--json-schema`, `--tools "Read,Bash"`, `--max-turns 15`, `--max-budget-usd 5.00`, `--model opus`, `--system-prompt-file`.

Flag rationale (condensed — full treatment in `~/.claude/skills/claude-cli/SKILL.md`):

- `-p` — non-interactive, print-and-exit (parity with `codex exec`).
- `--bare` — skip auto-discovery of hooks, skills, plugins, MCP servers, CLAUDE.md. Critical for reviewer isolation: without `--bare` the fresh Claude would inherit project-level context and lose the blind-spot advantage.
- `--no-session-persistence` — ephemeral session (parity with codex's `--ephemeral`).
- `--dangerously-skip-permissions` — required for scripted non-interactive use.
- `--output-format json --json-schema …` — structured review output conforming to the shared schema.
- `--tools "Read,Bash"` — read-only. The reviewer can read files and run shell commands (grep, git log, diff) but cannot edit. Enforced at the CLI layer, not just by prompt.
- `--max-turns 15 --max-budget-usd 5.00` — bounded cost/time. Raise only if a run legitimately needs more.
- `--model opus` — strongest reviewer. The calling agent may also be Opus; the review's value is context isolation, not model superiority.
- `--system-prompt-file` — loads the adversarial operating stance from `adversarial-prompt.txt`.

**Timeout:** at least `600000` ms (10 min). Opus on a large diff can take minutes.

## Expected output format

Direct JSON conforming to `~/.claude/skills/codex-cli/schemas/review-output.schema.json` (same schema as the codex path). **No envelope** — unlike gemini, claude's `--output-format json` returns the model response directly on stdout.

## Parsing

```bash
jq -e '.findings[]' < claude-output.json
```

On parse failure: do NOT retry in a loop (single pass rule). Log the malformed output as a blocker note in the morning report, flag "reviewer output unparseable", and proceed to `finishing-a-development-branch`. The user decides whether to re-request review manually.

## Cost / token notes

Claude's `--output-format json` does not surface per-request token counts in a stable field. The morning report's external-review cost line for claude is rendered as "cost not reported by claude-cli" (or omitted), same as codex. If `--max-budget-usd` trips mid-review, the process exits with a partial result — treat that like any other parse failure and proceed.

## Error handling

- **Auth expired** (`claude auth status` exits 1) → blocker taxonomy #1. Stop, surface, do not push.
- **Rate limits** — Claude plan has rolling usage limits. If hit, log "reviewer unavailable" and proceed without findings (single pass rule).
- **Budget cap hit** (`--max-budget-usd` trips) — inspect the partial JSON; if it's schema-valid through `.findings`, use it. Otherwise treat as parse failure.
- **Turn cap hit** (`--max-turns` exhausted before output completes) — raise to 25 and re-run, OR shrink the context. Do not lower the cap; 15 is already tight.
- **Schema violation** — inspect the raw output (remove `2>/dev/null`). Usually the reviewer hit the turn cap before emitting final JSON. Raise `--max-turns`.
- **Empty stdout** — remove `2>/dev/null` and re-run to see stderr.
