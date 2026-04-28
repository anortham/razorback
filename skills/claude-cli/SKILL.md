---
name: claude-cli
description: Call the Claude Code CLI (`claude -p`) as a fresh Claude instance for second opinions, code review, and adversarial review. Use this skill whenever the user says "ask claude", "fresh claude review", "second opinion from another claude", "have another claude look at this", "delegate to a fresh claude", or any variation suggesting they want a second Claude instance's perspective. The value is a fresh session and independent prompt framing, not a different model.
---

# Claude CLI Assistant

Use the Claude Code CLI (`claude -p`) to get a second opinion, review code
changes, or run adversarial security/correctness reviews from a fresh Claude
instance. The value is a new session and an independent prompt, not a
different underlying model.

Do not use `--bare` in this skill. Current `claude -p --help` says bare mode
skips OAuth and keychain auth reads, so the common Claude login path fails.

## Defaults

- **Model**: use repo-root `RAZORBACK.md` model routing when present. If absent,
  inherit the current Claude default or use the strongest available reviewer
  model for adversarial review.
- **Ephemeral**: `--no-session-persistence` so the review leaves no stored
  session behind (parity with codex's `--ephemeral`).
- **No `--bare`**: current Claude help says bare mode skips OAuth and
  keychain auth reads. This skill avoids it so normal Anthropic logins keep
  working.
- **Output format**: `--output-format json` for structured returns; combine
  with `--json-schema` for schema-validated adversarial output.
- **Stderr**: append `2>/dev/null` to suppress banner and status noise.
- **Working directory**: Claude uses the shell's cwd. There is no equivalent
  to codex's `-C` flag; `cd` first or run from the project root.
- **Non-interactive permissions**: `--dangerously-skip-permissions` is
  required for scripted use. Pair it with `--tools "Read,Bash"` to enforce
  read-only behavior; the reviewer can investigate but cannot edit.
- **Timeout**: 300000ms (5 min) for simple queries, 600000ms (10 min) for
  deep reviews. Escalation-tier models on large diffs can take minutes.
- **Auth**: Logged in via Anthropic OAuth or API key. Check with
  `claude auth status` (exits 0 logged in, 1 otherwise). If it fails, tell
  the user to run `claude login` in a terminal. If you copied an older
  command that includes `--bare`, remove that flag first.

For command snippets below, set `CLAUDE_MODEL` from the plan's Model Routing
section. If no route exists, use the current harness default or the strongest
available reviewer model.

## Review Targeting

For diff-based modes (Code Review, Adversarial Review), pick scope and
execution mode before invoking Claude.

**Scope** — user-passable arguments, default `--scope auto`:

- `--scope auto`: working-tree if `git status --porcelain` is non-empty, else
  branch-vs-base
- `--scope working-tree`: staged + unstaged changes
- `--scope branch`: current branch vs base ref
- `--base <ref>`: explicit base for branch scope (default: `main`, fall back
  to `master`)

Resolve `$DIFF`, `$TARGET`, and `$RANGE` per scope:

```bash
case "$SCOPE" in
  branch)
    BASE="${USER_BASE:-$(git -C "$DIR" merge-base HEAD main 2>/dev/null || git -C "$DIR" merge-base HEAD master 2>/dev/null)}"
    DIFF=$(git -C "$DIR" diff "$BASE..HEAD" --no-ext-diff)
    TARGET=$(git -C "$DIR" log --oneline "$BASE..HEAD")
    RANGE="$BASE..HEAD"
    ;;
  working-tree)
    DIFF=$(git -C "$DIR" diff --cached --no-ext-diff && git -C "$DIR" diff --no-ext-diff)
    TARGET=$(git -C "$DIR" diff --stat HEAD)
    RANGE=""
    ;;
  auto|*)
    if [ -n "$(git -C "$DIR" status --porcelain)" ]; then
      DIFF=$(git -C "$DIR" diff --cached --no-ext-diff && git -C "$DIR" diff --no-ext-diff)
      TARGET=$(git -C "$DIR" diff --stat HEAD)
      RANGE=""
    else
      BASE="${USER_BASE:-$(git -C "$DIR" merge-base HEAD main 2>/dev/null || git -C "$DIR" merge-base HEAD master 2>/dev/null)}"
      DIFF=$(git -C "$DIR" diff "$BASE..HEAD" --no-ext-diff)
      TARGET=$(git -C "$DIR" log --oneline "$BASE..HEAD")
      RANGE="$BASE..HEAD"
    fi
    ;;
esac
```

**Execution mode** — peek at diff size first:

```bash
SHORTSTAT=$(git -C "$DIR" diff --shortstat $RANGE)
```

Decide:

- **Tiny** (≤ 2 files, < ~200 lines): foreground. Return the result inline.
- **Anything else, or unclear**: launch with
  `Bash({command: ..., run_in_background: true})`. Tell the user "Claude review
  running in the background; escalation-tier review on a large diff can take 2-5
  minutes" and use `Monitor` on the returned shell ID to fetch output later.

`--wait` forces foreground; `--background` forces background. Otherwise apply
the heuristic and announce the chosen mode in one sentence.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants a fresh Claude's take on an approach, design decision, or
piece of code. No file changes, no structured output.

```bash
cd /path/to/project && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --tools "Read,Bash" \
  --model "$CLAUDE_MODEL" \
  "Your prompt here" \
  2>/dev/null
```

Drop `--json-schema` and `--max-turns`; a second opinion is free-form text.
The reviewer reads files on its own via the `Read` tool; mention specific
paths in the prompt if you want it focused.

**After**: Show the reviewer's response, then add your own analysis. Where
you agree, say so. Where you disagree, explain why with evidence. The user
gets two perspectives from two fresh starts.

### Code Review (read-only)

The user wants a review of current changes. Single pass with Opus, standard
review prompt (not adversarial framing).

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above (scope from `--scope`/`--base`, execution mode
from the sizing heuristic or explicit `--wait`/`--background`).

**Step 2: Build the prompt**

```bash
PROMPT="Review the following code changes for bugs, security issues, correctness problems, and improvements.

$([ -n "$FOCUS" ] && echo "Focus area: $FOCUS")

Files changed:
$TARGET

Diff:
$DIFF"
```

**Step 3: Send to Claude**

`--json-schema` takes a JSON string; inline the schema directly (the same
schema is kept in this skill at `schemas/review-output.schema.json` for
version control):

```bash
SCHEMA_JSON='{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false,"required":["verdict","summary","findings","next_steps"],"properties":{"verdict":{"type":"string","enum":["approve","needs-attention"]},"summary":{"type":"string","minLength":1},"findings":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["severity","title","body","file","line_start","line_end","confidence","recommendation"],"properties":{"severity":{"type":"string","enum":["critical","high","medium","low"]},"title":{"type":"string","minLength":1},"body":{"type":"string","minLength":1},"file":{"type":"string","minLength":1},"line_start":{"type":"integer","minimum":1},"line_end":{"type":"integer","minimum":1},"confidence":{"type":"number","minimum":0,"maximum":1},"recommendation":{"type":"string"}}}},"next_steps":{"type":"array","items":{"type":"string","minLength":1}}}}'

cd /path/to/project && claude -p \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model "$CLAUDE_MODEL" \
  "$PROMPT" \
  2>/dev/null
```

Same command shape as adversarial review but without the adversarial system
prompt; the prompt body itself asks for a standard review.

**After**: Parse the JSON, present findings, add your own assessment.
Highlight agreements and disagreements. Call out anything the reviewer
missed.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured system prompt that tells Claude to actively try to break
confidence in the change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the user prompt** with the diff and any focus text.
Substitute `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` into
a copy of `adversarial-prompt.txt` if you want to inline them, or pass them
through the user-prompt string and let the system-prompt-file supply the
operating stance.

**Step 3: Send with structured output and the adversarial system prompt**

Inline the schema as a string; materialize the adversarial prompt to a temp
file from the canonical content inlined in this skill's "Adversarial Prompt
Template" section below:

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

cd /path/to/project && claude -p \
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

The baseline flags are: `-p`, `--no-session-persistence`,
`--dangerously-skip-permissions`, `--output-format json`, `--json-schema`,
`--tools "Read,Bash"`, `--max-turns 15`, `--max-budget-usd 5.00`,
`--model "$CLAUDE_MODEL"`, `--system-prompt-file`.

No `--bare` flag is used. Current Claude help says bare mode skips OAuth and
keychain auth reads, so it is a trap for the common login path.

The `--json-schema` flag tells Claude to return JSON matching the review
schema (verdict, summary, findings with severity/file/line/confidence, next
steps). `--max-turns` and `--max-budget-usd` bound cost and time.

**After**: Parse the JSON output. Present findings grouped by severity
(critical first). For each finding, show the file, lines, and
recommendation. Add your own assessment of each finding: do you agree? Is
the confidence warranted? Then give your overall take on the verdict.

## Adversarial Prompt Template

The adversarial system prompt is kept in this skill at
`adversarial-prompt.txt` for version control. At invocation time it can be
either read from that file (if you know the skill path) or materialized from
the inlined copy below via `mktemp + heredoc`. The template:

```
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
```

The only Claude-specific adaptation is the REVIEW METHOD line referencing
`Read` and `Bash` (Claude's native tool names) instead of generic shell
primitives. Attack-surface categories, finding bar, calibration, and
grounding rules are identical to codex-cli's template.

## Resuming a Session

By default, `--no-session-persistence` means sessions aren't saved. If you
need follow-up capability, drop that flag, then resume with `claude -r`:

```bash
# Initial task (persistent session)
cd /path && claude -p --dangerously-skip-permissions --model "$CLAUDE_MODEL" "prompt" 2>/dev/null

# Resume the last session
claude -r "follow-up prompt" 2>/dev/null
```

See the Claude Code CLI reference for session-resume details. Use this when
you need a multi-turn conversation (e.g. iterating on a review or asking
clarifying questions about findings).

## Cross-Project Usage

Claude reads `CLAUDE.md` from the project root and discovers plugins, hooks,
skills, and MCP servers by default. This skill accepts that tradeoff because
`--bare` disables OAuth and keychain auth.

There is no `-C`/`--cwd` flag equivalent to codex's working-directory
override. To review a project other than cwd, `cd` into it first:

```bash
cd ~/source/other-project && claude -p --no-session-persistence \
  --dangerously-skip-permissions --tools "Read,Bash" --model "$CLAUDE_MODEL" \
  "prompt" 2>/dev/null
```

Do not use `--bare` for adversarial review either. A working reviewer with a
fresh prompt beats a broken "pure" invocation.

## Critical Evaluation

A fresh Claude is a peer, not an authority. The review's value comes from
**session freshness** and independent prompt framing, not from the reviewer
being a different or smarter model. The author instance and the reviewer
instance may be the same Opus build.

Because this skill does not use `--bare`, the reviewer still sees project
context such as `CLAUDE.md`, hooks, plugins, and MCP config. Factor that into
how much independence you assign the review.

- **Trust your own knowledge** when confident. If the reviewer says
  something you know is wrong, say so directly with evidence. Same model
  means same knowledge cutoff and same systematic blind spots; fresh
  context doesn't make those go away.
- **Research disagreements.** Check the code, not vibes. Two Opus instances
  can still both be wrong in correlated ways.
- **Don't defer.** Evaluate suggestions critically. The point of a second
  opinion is two perspectives, not rubber-stamping.
- **Adversarial findings need validation.** In adversarial mode the
  reviewer is intentionally trying to find problems and will over-report.
  Some findings will be speculative or low-confidence. Filter accordingly.

When you disagree, tell the user clearly: what the reviewer said, why you
think it's wrong, and your evidence.

## Error Handling

- **Auth expired**: `claude auth status` exits non-zero. Tell the user to run
  `claude login` in a terminal.
- **Rate limits**: the Claude plan has rolling usage limits. If you hit
  them, tell the user and suggest trying again later, using a smaller prompt,
  or switching to the project policy's lower-cost tier temporarily.
- **Budget cap hit**: if `--max-budget-usd` trips mid-review the process
  exits with a partial result. Either raise the cap or narrow the diff.
- **Turn cap hit**: if `--max-turns` is exhausted before the reviewer
  produces schema-valid output, raise the cap (15 → 25) or shrink the
  context.
- **Old `--bare` recipe**: remove `--bare` and retry. Current Claude help says
  bare mode skips OAuth and keychain auth, so old snippets fail on normal
  Claude logins.
- **Timeout**: escalation-tier models on large diffs can take minutes. Set generous Bash
  timeouts (600000ms). If it still times out, split the review into
  smaller chunks.
- **Empty output**: if stdout is empty, check stderr (remove `2>/dev/null`
  temporarily) for error messages.
- **Claude not installed**: check with `claude --version`. Install via
  `npm install -g @anthropic-ai/claude-code` if missing.
- **Schema violation**: if the returned JSON doesn't validate, inspect the
  raw output — often the reviewer hit the turn cap before finishing the
  final JSON. Re-run with higher `--max-turns`.

## Quick Reference

Use the model tier from repo-root `RAZORBACK.md` when present. If no policy
exists, inherit the current Claude default or use the strongest available
reviewer model for adversarial review. This skill does not use `--bare`;
current Claude help says that flag skips OAuth and keychain auth.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `cd dir && claude -p --no-session-persistence --dangerously-skip-permissions --tools "Read,Bash" --model "$CLAUDE_MODEL" "prompt" 2>/dev/null` |
| Code review | read-only + schema | Add `--output-format json --json-schema "$SCHEMA_JSON" --max-turns 15 --max-budget-usd 5.00` (inline schema as a string; see Code Review section). Scope/sizing per Review Targeting. |
| Adversarial review | read-only + schema + system prompt | Add `--system-prompt-file "$PROMPT_FILE"` (temp file materialized from the Adversarial Prompt Template) to the code-review pattern. Scope/sizing per Review Targeting. |
| Resume session | persistent | Drop `--no-session-persistence`, use `claude -r "prompt"` |
