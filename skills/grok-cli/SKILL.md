---
name: grok-cli
description: Use when the user says "ask grok", "get grok's take", "grok review", "have grok look at this", "delegate to grok", or any variation naming Grok/xAI as the perspective they want.
---

# Grok Assistant

Use the Grok CLI (`grok -p`) to get a second opinion, review code changes,
run adversarial security/correctness reviews, or delegate tasks to xAI's Grok
models.

## Defaults

- **Model**: inherit the current Grok default (`grok-4.5` at time of writing)
  unless the user or environment explicitly selects one with `-m, --model`.
  `grok models` prints the default and the list you can pick from.
- **Reasoning**: inherit the current Grok default unless the user or environment
  explicitly selects `--reasoning-effort <EFFORT>` (alias `--effort`).
- **Sandbox mode**: `--sandbox <PROFILE>` selects a filesystem/network profile.
  Built-in profiles are `read-only`, `workspace`, and `none`. Use `read-only`
  for review (the reviewer can read and run non-mutating commands but cannot
  edit). Use `workspace` for delegate flows (write access inside the workspace).
  There is **no** built-in `danger-full-access` profile — that name resolves to a
  custom profile defined in `~/.grok/sandbox.toml` and errors if undefined.
- **Headless single-turn**: `-p, --single <PROMPT>` prints the response to
  stdout and exits. For large prompts (an embedded diff), use
  `--prompt-file <PATH>` instead of passing the prompt as an argument.
  `-p` and `--prompt-file` are **mutually exclusive** — each is a complete way
  to supply the headless prompt. `-p` requires its own value, so
  `grok -p --prompt-file FILE` fails with
  `error: a value is required for '--single <PROMPT>' but none was supplied`
  (exit 2). Use `grok --prompt-file FILE` with no `-p`.
- **Non-interactive approvals (load-bearing)**: headless `-p` / `--prompt-file`
  cannot show a permission prompt. Pass **`--always-approve`** (alias `--yolo`,
  or `--permission-mode bypassPermissions`) on **every** headless tool-using
  run — second opinion, review, adversarial, and delegate — not only on
  delegate. Sandbox and approvals are orthogonal: `--sandbox read-only` still
  kernel-blocks writes/network even with always-approve. Without always-approve,
  any shell command outside Grok's small read-only allowlist (e.g.
  `git worktree`, bare `echo`, compound non-allowlisted segments) is resolved as
  `permission_cancelled`; that **cancels the entire turn** (successful parallel
  reads are discarded), the process often exits **0**, and stdout is empty or
  only the pre-tool sentence — looks like "died on multi-tool".
- **Working directory**: `--cwd <CWD>` sets the root (Grok's equivalent of
  codex's `-C`). Defaults to the shell's cwd.
- **Structured output**: `--json-schema '<SCHEMA JSON STRING>'` constrains the
  model to JSON and implies `--output-format json`. `--output-format` also
  accepts `plain` (default) and `streaming-json`.
- **Stderr**: append `2>/dev/null` to suppress banner and status noise.
- **stdin**: In testing, `grok -p` does **not** block on stdin the way
  `codex exec` and `claude -p` do — it returns without a redirect. Keep
  `< /dev/null` (bash) / `< NUL` (Windows cmd/PowerShell) on non-piped
  invocations anyway as cheap insurance against a harness that holds the pipe
  open.
- **No caps in review recipes**: razorback does not pass `--max-turns`, and it
  passes no other mechanical ceiling to a reviewer. Any such cap truncates a
  review mid-flight and trades finding quality for a few cents. Review depth
  is the point; do not add the flag back. A user who wants a hard ceiling sets
  it themselves.
- **Timeout is a failsafe, not a budget**: set 1800000ms (30 min) on every
  review invocation. It exists to catch a process that hung or died and will
  never return — nothing else. It is not a bound on how long a review may
  take, and it is not a cost dial. Scope the review in the prompt and let the
  reviewer finish the job. Never tune it down to make a run cheaper.
- **Auth**: logged in via `grok login` (`--oauth` for browser OAuth via
  auth.x.ai, `--device-auth` for headless/remote device-code flow). There is no
  `grok auth status` subcommand; use `grok models` as the readiness check — it
  prints `You are logged in with grok.com.` plus the model list when authed, and
  errors when not. If auth fails, tell the user to run `grok login` in a
  terminal.

## Policy Gate

Before sending any diff or repo content to xAI, apply the external-model
policy check in razorback:security-review. Provider for this skill: `xai`.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies `xai` → refuse the dispatch
and name an allowed alternative; on an autonomous run where the user chose this
provider, stop per blocker taxonomy #4.

## Pre-flight Check

`grok models` is the one-call readiness probe — it confirms auth and shows which
model you'll get:

```bash
grok models 2>/dev/null
# You are logged in with grok.com.
# Default model: grok-4.5
# Available models:
#   * grok-4.5 (default)
```

If it errors or prints nothing, the user is not logged in — tell them to run
`grok login`.

## Review Targeting

Scope selection (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing heuristic are shared across razorback's reviewer
skills: load `review-targeting.md` from razorback's using-razorback references
when selecting scope. It resolves `$DIFF`, `$TARGET`, and `$RANGE`; read
"the reviewer" there as `grok -p`.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants Grok's take on an approach, design decision, or piece of code.
No file changes needed.

```bash
grok -p "Your prompt here" \
  --sandbox read-only \
  --always-approve \
  --cwd /path/to/project \
  2>/dev/null < /dev/null
```

`--always-approve` is required even though the sandbox is read-only (see
Defaults). Grok runs in the project directory and reads files on its own. If
you need to point it at specific files, mention them by path in the prompt.

**After**: Show Grok's response, then add your own analysis. Where you agree,
say so. Where you disagree, explain why with evidence. The user gets two
perspectives.

### Code Review (read-only)

The user wants a review of current changes. Inherit the current Grok default
unless the user or environment explicitly selects a model.

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above.

**Step 2: Build the prompt**

```bash
PROMPT="Review the following code changes for bugs, security issues, correctness problems, and improvements.

$([ -n "$FOCUS" ] && echo "Focus area: $FOCUS")

Files changed:
$TARGET

Diff:
$DIFF"
```

**Step 3: Send to Grok with structured output**

`--json-schema` takes a JSON string. `$SKILL_DIR` throughout this skill is the
skill's own base directory, announced when the skill loads — substitute it
before running any command. Read the JSON string from the canonical schema file
(`$SKILL_DIR/../codex-cli/schemas/review-output.schema.json` — all razorback
reviewers share it), stripping the `$schema` key defensively (some validators
reject it; the verified working schema had no `$schema` key):

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")

PROMPT_FILE=$(mktemp) && trap 'rm -f "$PROMPT_FILE"' EXIT
printf '%s' "$PROMPT" > "$PROMPT_FILE"

grok --prompt-file "$PROMPT_FILE" \
  --sandbox read-only \
  --always-approve \
  --cwd /path/to/project \
  --json-schema "$SCHEMA_JSON" \
  ${GROK_MODEL:+--model "$GROK_MODEL"} \
  ${GROK_EFFORT:+--effort "$GROK_EFFORT"} \
  2>/dev/null < /dev/null
```

No `-p` here — `--prompt-file` supplies the headless prompt on its own.
Always include `--always-approve` with `--sandbox read-only` (see Defaults).

**After**: `--output-format json` (implied by `--json-schema`) returns a
**result envelope**, not the model response directly. The schema-conforming
object is at `.structuredOutput` (with `.text` holding the same JSON as a
string, and `.usage` / `.total_cost_usd` carrying cost data):

```bash
# Shape check first — a clean review has findings: [] . Fall back to parsing
# .text when .structuredOutput is absent.
jq -e '.structuredOutput.findings | type == "array"' < output.json >/dev/null \
  || jq -re '.text' < output.json | jq -e '.findings | type == "array"' >/dev/null
jq '.structuredOutput.findings[]?' < output.json   # iterate; empty = clean review
```

Present findings, add your own assessment. Highlight agreements and
disagreements. Call out anything Grok missed.

### Adversarial Review (read-only + schema)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured prompt that tells Grok to actively try to break confidence in the
change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the adversarial prompt** from this skill's canonical
`adversarial-prompt.txt`, substituting `{{TARGET_LABEL}}` with the diff stat,
`{{USER_FOCUS}}` with any focus text (or "none specified"), and
`{{REVIEW_INPUT}}` with the full diff.

```bash
# Split on the placeholders rather than ${//} substitution: bash >=5.2 expands
# & and backslashes in a substitution's replacement text, which mangles diffs.
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
ADVERSARIAL_PROMPT="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}${DIFF}"
```

**Step 3: Send with structured output**

```bash
SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")

PROMPT_FILE=$(mktemp) && RESULT_FILE=$(mktemp)
trap 'rm -f "$PROMPT_FILE" "$RESULT_FILE"' EXIT
printf '%s' "$ADVERSARIAL_PROMPT" > "$PROMPT_FILE"

grok --prompt-file "$PROMPT_FILE" \
  --sandbox read-only \
  --always-approve \
  --cwd /path/to/project \
  --json-schema "$SCHEMA_JSON" \
  ${GROK_MODEL:+--model "$GROK_MODEL"} \
  ${GROK_EFFORT:+--effort "$GROK_EFFORT"} \
  2>/dev/null < /dev/null > "$RESULT_FILE"
cat "$RESULT_FILE"
```

Always include `--always-approve` with `--sandbox read-only` (see Defaults).
The `--json-schema` flag tells Grok to return JSON matching the review schema
(verdict, summary, findings with severity/file/line/confidence, next steps).

**After**: Parse the envelope (`.structuredOutput`, fallback `.text | fromjson`
— see Code Review). Present findings grouped by severity (critical first). For
each finding, show the file, lines, and recommendation. Add your own assessment
of each finding: do you agree? Is the confidence warranted? Then give your
overall take on Grok's verdict.

### Delegate a Task

The user wants Grok to actually do something: write code, refactor, fix a bug.
Grok needs write access.

```bash
grok -p "Your task instructions here. Apply changes directly." \
  --sandbox workspace \
  --always-approve \
  --cwd /path/to/project \
  2>/dev/null < /dev/null
```

`--sandbox workspace` gives Grok write access inside the workspace;
`--always-approve` auto-approves tool executions so the headless run never
stalls waiting for confirmation. Grok can read files, write files, and run
commands within the project directory.

**After**: Summarize what Grok changed. Run `git diff --stat` in the project to
show the scope, then review the changes yourself. Flag anything wrong or
improvable. If Grok made a mess, say so and offer to fix it.

**For tasks needing an isolated branch**, add `-w, --worktree [<NAME>]` to run
in a fresh git worktree (optionally `--worktree-ref <REF>` to base it on a
specific commit).

## Adversarial Prompt Template

The canonical adversarial prompt lives in this skill at
`./adversarial-prompt.txt` (version-controlled). Read it and replace the
`{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` placeholders at
runtime, as the Adversarial Review invocation above does.

It is the Grok variant of a deliberate trio: `../codex-cli/adversarial-prompt.txt`
and `../claude-cli/adversarial-prompt.txt` are identical except for the model
name and the REVIEW METHOD phrasing. Attack-surface categories, finding bar,
calibration, and grounding rules match; keep the three in sync when editing any.

## Resuming a Session

Grok persists sessions by default — there is no `--ephemeral` /
`--no-session-persistence` flag.

`-c, --continue` is a **boolean flag** and `-r, --resume` takes only an optional
session ID — neither accepts the prompt. A bare `grok -c "follow-up prompt"`
treats the prompt as the positional argument that opens the **interactive TUI**,
which hangs or errors (`Device not configured (os error 6)`) in a headless
agent. Always pair resume with `-p` or `--prompt-file`:

```bash
# Continue the most recent session for the current directory
grok -c -p "follow-up prompt" --always-approve 2>/dev/null < /dev/null

# Resume a specific session by ID (or the most recent if omitted)
grok -r <SESSION_ID> -p "follow-up prompt" --always-approve 2>/dev/null < /dev/null

# Fork instead of reusing the original session id
grok -r <SESSION_ID> --fork-session -p "follow-up prompt" --always-approve 2>/dev/null < /dev/null

# Large follow-up prompt: swap -p for --prompt-file (never both)
grok -c --prompt-file "$PROMPT_FILE" --always-approve 2>/dev/null < /dev/null
```

A resumed session keeps the sandbox profile it was created with. Passing a
different `--sandbox` fails with `cannot resume this session under sandbox
profile 'X' — it was created with 'Y'`. Omit `--sandbox` when resuming, or start
a new session to change profile. Still pass `--always-approve` on headless
resume so tool calls do not hit `permission_cancelled`.

Use `grok sessions list` (or `grok sessions search <query>`) to find sessions —
bare `grok sessions` prints subcommand help, not a list. `grok export` dumps a
transcript as Markdown. Use resume when you need a multi-turn conversation (e.g.
iterating on a review or asking clarifying questions about findings).

## Cross-Project Usage

Grok reads project instructions (`AGENTS.md` / `CLAUDE.md`) and discovers
skills, MCP servers, and permissions for the target directory automatically —
confirm what it will load with `grok inspect`. To review a project other than
cwd, point `--cwd` at it:

```bash
grok -p "prompt" --sandbox read-only --always-approve --cwd ~/source/other-project 2>/dev/null < /dev/null
```

There is no `--ignore-user-config` equivalent to codex's; Grok inherits the
project's context. Factor that into how much independence you assign the review
— it is not a context-free reviewer.

## Critical Evaluation

Grok is a peer, not an authority. It runs on xAI's models with their own
knowledge cutoffs and blind spots.

- **Trust your own knowledge** when confident. If Grok says something you know
  is wrong, say so directly with evidence.
- **Research disagreements.** A different model isn't inherently more or less
  right. Check the code.
- **Don't defer.** Evaluate Grok's suggestions critically. The point of a
  second opinion is two perspectives, not rubber-stamping.
- **Adversarial review findings need validation.** Grok in adversarial mode is
  intentionally trying to find problems. Some findings may be speculative or
  low-confidence. Filter accordingly.

When you disagree with Grok, tell the user clearly: what Grok said, why you
think it's wrong, and your evidence.

## Error Handling

- **Not logged in**: `grok models` errors or prints no model list. Tell the user
  to run `grok login` (`--device-auth` on a headless/remote host).
- **Rate limits**: xAI plans have usage limits. A rate limit means the service
  is unavailable, not that the review was too big. Tell the user and suggest
  waiting for the window to reset or swapping to another reviewer. Do NOT
  shrink the prompt or drop to a cheaper model to squeeze the review through —
  that ships a weaker review under the name of the one the user asked for.
- **Sandbox profile not found**: `Custom sandbox profile '<name>' not found` means
  you passed a name that isn't a built-in (`read-only`, `workspace`, `none`) and
  isn't defined in `~/.grok/sandbox.toml`. Use a built-in or define the profile.
  Grok refuses to start rather than run unsandboxed.
- **`a value is required for '--single <PROMPT>'`** (exit 2, immediate): you
  combined `-p` with `--prompt-file`. Drop `-p` — `--prompt-file` is a complete
  prompt source on its own.
- **`Device not configured (os error 6)`** or a hang: the invocation had no
  headless prompt flag, so Grok tried to open the interactive TUI. Add `-p` or
  `--prompt-file`. Most common with `grok -c "prompt"` / `grok -r <ID> "prompt"`.
- **Resume sandbox mismatch**: `cannot resume this session under sandbox profile
  'X' — it was created with 'Y'`. Omit `--sandbox` when resuming, or start a new
  session.
- **Max turns reached**: `Error: max turns reached` means a `--max-turns` value
  was too low for the reviewer to finish (bootstrap + review can burn several
  turns). These recipes set no turn cap — remove the flag rather than raising it.
- **Timeout tripped**: a review that runs 10-20+ minutes is working, not
  stuck — that is why the failsafe sits at 30 min. If the failsafe trips, the
  process hung or died; the diff was not "too big". Do NOT re-run with a
  longer timeout, and do NOT split the diff and re-run. A second full attempt
  burns another half hour and another full context on the same broken run.
  Check stderr, then treat it as reviewer unavailability.
- **Empty / one-sentence truncated output (exit 0)**: almost always a headless
  **permission cancel**, not a model crash. Session
  `events.jsonl` shows `permission_resolved` → `decision: cancelled` on
  `run_terminal_command` and `turn_ended` with
  `cancellation_category: permission_cancelled`. Cause: missing
  `--always-approve` while the model ran a non-allowlisted shell form (common
  when it batches reads + bash in one turn). Fix: re-run with
  `--always-approve` (keep `--sandbox read-only` for review). Do not "fix" by
  only telling the model one-tool-per-turn unless the shell stays on the
  allowlist.
- **Empty output (other)**: if stdout is empty and the permission pattern above
  does not match, check stderr (remove `2>/dev/null` temporarily) for error
  messages.
- **Grok not installed**: check with `grok --version`. Install per xAI's Grok
  CLI instructions if missing (the binary lives under `~/.grok/bin/grok`).

## Quick Reference

Inherit the current Grok default. Only override with `-m`/`--effort` when the
user or environment gives a concrete value. Optionally set `GROK_MODEL` /
`GROK_EFFORT` before invoking and let the `${VAR:+--flag "$VAR"}` guards add the
flag only when non-empty.

Grok, Claude, and Codex CLIs do not share a command set — probe with `--help`
before assuming a command that exists in one exists in the other.

All non-piped patterns include `< /dev/null` (bash) / `< NUL` (Windows) as cheap
insurance against a harness holding stdin open.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only + approve | `grok -p "prompt" --sandbox read-only --always-approve --cwd dir 2>/dev/null < /dev/null` |
| Code review | read-only + approve + schema | `grok --prompt-file "$PROMPT_FILE" --json-schema "$SCHEMA_JSON" --sandbox read-only --always-approve --cwd dir` (no `-p`), where `SCHEMA_JSON=$(jq -c 'del(."$schema")' < "$SKILL_DIR/../codex-cli/schemas/review-output.schema.json")`. Scope/sizing per Review Targeting. |
| Adversarial review | read-only + approve + schema | Build the prompt from `$SKILL_DIR/adversarial-prompt.txt` (see Adversarial Review), then the code-review command. |
| Delegate (complex) | workspace + approve | `grok -p "prompt" --sandbox workspace --always-approve --cwd dir 2>/dev/null < /dev/null` (add `-w` for an isolated worktree) |
| Pre-flight / auth check | any | `grok models 2>/dev/null` (prints login state + model list) |
| Apply explicit model/effort | any | Add `--model "$GROK_MODEL"` / `--effort "$GROK_EFFORT"` when set |
| Resume session | persistent | `grok -c -p "prompt" --always-approve` (most recent) or `grok -r <ID> -p "prompt" --always-approve` (`--fork-session` to branch). `-c`/`-r` never take the prompt — omit `-p` and you get the interactive TUI. Omit `--sandbox` on resume; still pass `--always-approve`. |
| Structured output shape | any | Envelope: `.structuredOutput` (parsed object), `.text` (JSON string), `.usage`, `.total_cost_usd` |
