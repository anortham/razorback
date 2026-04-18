---
name: claude-cli
description: Call the Claude Code CLI (`claude -p`) as a fresh, isolated Claude instance for second opinions, code review, and adversarial review. Use this skill whenever the user says "ask claude", "fresh claude review", "second opinion from another claude", "have another claude look at this", "delegate to a fresh claude", or any variation suggesting they want a second Claude instance's perspective. The value is isolated/fresh context (no session state, no project CLAUDE.md pollution, no hook/plugin interference), not a different model.
---

# Claude CLI Assistant

Use the Claude Code CLI (`claude -p`) to get a second opinion, review code
changes, or run adversarial security/correctness reviews from a fresh,
isolated Claude instance. The value is clean-context isolation — no session
history, no project hooks, no plugin clutter, no CLAUDE.md pollution — not a
different underlying model.

## Defaults

- **Model**: `opus` for everything. The calling Claude may already be Opus; a
  fresh Opus reviewer still earns its keep because it starts with zero context
  and can find things the author instance missed.
- **Ephemeral**: `--no-session-persistence` so the review leaves no stored
  session behind (parity with codex's `--ephemeral`).
- **Isolation**: `--bare` skips auto-discovery of hooks, skills, plugins, MCP
  servers, and CLAUDE.md. This is critical — without `--bare`, the reviewer
  inherits project-level context that can bias findings or re-introduce the
  author instance's blind spots.
- **Output format**: `--output-format json` for structured returns; combine
  with `--json-schema` for schema-validated adversarial output.
- **Stderr**: append `2>/dev/null` to suppress banner and status noise.
- **Working directory**: Claude uses the shell's cwd. There is no equivalent
  to codex's `-C` flag — `cd` first or run from the project root.
- **Non-interactive permissions**: `--dangerously-skip-permissions` is
  required for scripted use. Pair it with `--tools "Read,Bash"` to enforce
  read-only behavior — the reviewer can investigate but cannot edit.
- **Timeout**: 300000ms (5 min) for simple queries, 600000ms (10 min) for
  deep reviews. Opus on a large diff can take minutes.
- **Auth**: Logged in via Anthropic OAuth or API key. Check with
  `claude auth status` (exits 0 logged in, 1 otherwise). If it fails, tell
  the user to run `claude login` in a terminal.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants a fresh Claude's take on an approach, design decision, or
piece of code. No file changes, no structured output.

```bash
cd /path/to/project && claude -p \
  --bare \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --tools "Read,Bash" \
  --model opus \
  "Your prompt here" \
  2>/dev/null
```

Drop `--json-schema` and `--max-turns` — a second opinion is free-form text.
The reviewer reads files on its own via the `Read` tool; mention specific
paths in the prompt if you want it focused.

**After**: Show the reviewer's response, then add your own analysis. Where
you agree, say so. Where you disagree, explain why with evidence. The user
gets two perspectives from two fresh starts.

### Code Review (read-only)

The user wants a review of current changes. Single pass with Opus, standard
review prompt (not adversarial framing).

**Step 1: Collect git context**

```bash
# Get the review target description
TARGET=$(git -C /path/to/project diff --stat HEAD 2>/dev/null)

# Build the diff (staged + unstaged)
DIFF=$(git -C /path/to/project diff --cached --no-ext-diff && git -C /path/to/project diff --no-ext-diff)
```

If there are no uncommitted changes, fall back to reviewing the current
branch against its base:

```bash
BASE=$(git -C /path/to/project merge-base HEAD main 2>/dev/null || git -C /path/to/project merge-base HEAD master 2>/dev/null)
DIFF=$(git -C /path/to/project diff "$BASE"..HEAD --no-ext-diff)
TARGET=$(git -C /path/to/project log --oneline "$BASE"..HEAD)
```

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

`--json-schema` takes a JSON string — inline the schema directly (the same
schema is kept in this skill at `schemas/review-output.schema.json` for
version control):

```bash
SCHEMA_JSON='{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false,"required":["verdict","summary","findings","next_steps"],"properties":{"verdict":{"type":"string","enum":["approve","needs-attention"]},"summary":{"type":"string","minLength":1},"findings":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["severity","title","body","file","line_start","line_end","confidence","recommendation"],"properties":{"severity":{"type":"string","enum":["critical","high","medium","low"]},"title":{"type":"string","minLength":1},"body":{"type":"string","minLength":1},"file":{"type":"string","minLength":1},"line_start":{"type":"integer","minimum":1},"line_end":{"type":"integer","minimum":1},"confidence":{"type":"number","minimum":0,"maximum":1},"recommendation":{"type":"string"}}}},"next_steps":{"type":"array","items":{"type":"string","minLength":1}}}}'

cd /path/to/project && claude -p \
  --bare \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model opus \
  "$PROMPT" \
  2>/dev/null
```

Same command shape as adversarial review but without the adversarial system
prompt — the prompt body itself asks for a standard review.

**After**: Parse the JSON, present findings, add your own assessment.
Highlight agreements and disagreements. Call out anything the reviewer
missed.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured system prompt that tells Claude to actively try to break
confidence in the change.

**Step 1: Collect context** (same as Code Review above)

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
[paste the adversarial-prompt.txt content here — see "Adversarial Prompt Template" below]
PROMPT_EOF

cd /path/to/project && claude -p \
  --bare \
  --no-session-persistence \
  --dangerously-skip-permissions \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --tools "Read,Bash" \
  --max-turns 15 \
  --max-budget-usd 5.00 \
  --model opus \
  --system-prompt-file "$PROMPT_FILE" \
  "$DIFF_AND_CONTEXT" \
  2>/dev/null
```

All 11 flags are present: `-p`, `--bare`, `--no-session-persistence`,
`--dangerously-skip-permissions`, `--output-format json`, `--json-schema`,
`--tools "Read,Bash"`, `--max-turns 15`, `--max-budget-usd 5.00`,
`--model opus`, `--system-prompt-file`.

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
need follow-up capability, drop that flag (and `--bare`, if you want hooks
and plugins applied), then resume with `claude -r`:

```bash
# Initial task (persistent session)
cd /path && claude -p --dangerously-skip-permissions --model opus "prompt" 2>/dev/null

# Resume the last session
claude -r "follow-up prompt" 2>/dev/null
```

See the Claude Code CLI reference for session-resume details. Use this when
you need a multi-turn conversation (e.g. iterating on a review or asking
clarifying questions about findings). Note: resume loses the `--bare`
isolation guarantee, so only use it for second opinions where CLAUDE.md and
project context are helpful, not for adversarial review.

## Cross-Project Usage

Without `--bare`, Claude reads `CLAUDE.md` from the project root (and
discovers plugins, hooks, skills, MCP servers). With `--bare`, all of that is
skipped — the reviewer sees only the files you point it at and the prompt
you give it.

There is no `-C`/`--cwd` flag equivalent to codex's working-directory
override. To review a project other than cwd, `cd` into it first:

```bash
cd ~/source/other-project && claude -p --bare --no-session-persistence \
  --dangerously-skip-permissions --tools "Read,Bash" --model opus \
  "prompt" 2>/dev/null
```

For adversarial review always keep `--bare`. The whole point is a Claude
that knows nothing about your conventions, so it can't rationalize around
them.

## Critical Evaluation

A fresh Claude is a peer, not an authority. The review's value comes from
**context isolation** — zero session history, no project CLAUDE.md, no
plugin/hook interference, no inherited assumptions from the current
conversation — not from the reviewer being a different or smarter model.
The author instance and the reviewer instance may literally be the same
Opus build.

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
  or dropping to `--model sonnet` temporarily.
- **Budget cap hit**: if `--max-budget-usd` trips mid-review the process
  exits with a partial result. Either raise the cap or narrow the diff.
- **Turn cap hit**: if `--max-turns` is exhausted before the reviewer
  produces schema-valid output, raise the cap (15 → 25) or shrink the
  context.
- **Timeout**: Opus on large diffs can take minutes. Set generous Bash
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

All invocations use `opus` with `--bare --no-session-persistence` for fresh
isolated context. The calling agent may also be Opus — the review's value
is clean context, not a different model.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `cd dir && claude -p --bare --no-session-persistence --dangerously-skip-permissions --tools "Read,Bash" --model opus "prompt" 2>/dev/null` |
| Code review | read-only + schema | Add `--output-format json --json-schema "$SCHEMA_JSON" --max-turns 15 --max-budget-usd 5.00` (inline schema as a string — see Code Review section) |
| Adversarial review | read-only + schema + system prompt | Add `--system-prompt-file "$PROMPT_FILE"` (temp file materialized from the Adversarial Prompt Template) to the code-review pattern |
| Resume session | persistent | Drop `--no-session-persistence`, use `claude -r "prompt"` |
