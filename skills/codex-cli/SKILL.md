---
name: codex-cli
description: Call OpenAI's Codex CLI for second opinions, code review, adversarial review, and task delegation. Use this skill whenever the user says "ask codex", "get codex's take", "codex review", "second opinion", "have codex look at this", "delegate to codex", "deep review", "adversarial review", or any variation suggesting they want Codex's perspective. Also trigger when the user wants a fresh take from a different model on code, architecture, or implementation decisions.
---

# Codex Assistant

Use the Codex CLI (`codex exec`) to get a second opinion, review code changes,
run adversarial security/correctness reviews, or delegate tasks to OpenAI
models through the project's razorback routing policy.

## Defaults

- **Model**: use repo-root `RAZORBACK.md` model routing when present. If absent,
  inherit the current Codex default.
- **Reasoning**: use the tier mapped by `RAZORBACK.md`. Reserve the escalation
  tier for subtle correctness, security, weak tests, high blast radius, or
  repeated failures.
- **Always use**: `--ephemeral --color never` for clean non-interactive output
- **Always append**: `2>/dev/null` to suppress stderr noise (session banner, transcript)
- **Working directory**: `-C /path/to/project` sets the root. Defaults to cwd.
- **Timeout**: 300000ms (5 min) for simple queries, 600000ms (10 min) for
  deep reviews or delegation work. Escalation-tier reasoning on large diffs can
  take several minutes; use generous timeouts.
- **Auth**: Logged in via ChatGPT OAuth. If auth fails, tell the user to run
  `codex login` in a terminal.

## Review Targeting

For diff-based modes (Code Review, Adversarial Review), pick scope and
execution mode before invoking Codex.

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
  `Bash({command: ..., run_in_background: true})`. Tell the user "Codex review
  running in the background; escalation-tier review on a large diff can take
  minutes" and use `Monitor` on the returned shell ID to fetch output later.

`--wait` forces foreground; `--background` forces background. Otherwise apply
the heuristic and announce the chosen mode in one sentence.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants Codex's take on an approach, design decision, or piece of code.
No file changes needed.

```bash
codex exec --ephemeral --color never \
  -C /path/to/project \
  "Your prompt here" \
  2>/dev/null
```

Codex runs in the project directory and can read files on its own. If you need
to point it at specific files, mention them by path in the prompt. Codex has no
`@file` syntax; it reads files via shell tools.

**After**: Show Codex's response, then add your own analysis. Where you agree,
say so. Where you disagree, explain why with evidence. The user gets two
perspectives.

### Code Review

The user wants a review of current changes. Use the strategy tier from
`RAZORBACK.md`, or inherit the current Codex default if no policy exists.

**Step 1: Apply Review Targeting**

Resolve `$DIFF`, `$TARGET`, and the foreground/background decision per the
Review Targeting section above (scope from `--scope`/`--base`, execution mode
from the sizing heuristic or explicit `--wait`/`--background`).

**Step 2: Build the prompt**

Construct a prompt with the diff embedded. If the user gave focus text (e.g.,
"review my changes, focus on error handling"), include it.

```bash
PROMPT="Review the following code changes for bugs, security issues, correctness problems, and improvements.

$([ -n "$FOCUS" ] && echo "Focus area: $FOCUS")

Files changed:
$TARGET

Diff:
$DIFF"
```

**Step 3: Send to Codex**

```bash
echo "$PROMPT" | codex exec --ephemeral --color never \
  -C /path/to/project \
  - \
  2>/dev/null
```

**After**: Present Codex's review, then add your own assessment. Highlight
agreements and disagreements. Call out anything Codex missed.

### Adversarial Review (deep review)

Triggered by "deep review", "adversarial review", or `--adversarial`. Uses a
structured prompt that tells Codex to actively try to break confidence in the
change.

**Step 1: Apply Review Targeting** (same as Code Review)

**Step 2: Build the adversarial prompt** using the template below, substituting
`{{TARGET_LABEL}}` with the diff stat, `{{USER_FOCUS}}` with any focus text
(or "none specified"), and `{{REVIEW_INPUT}}` with the full diff.

**Step 3: Send with structured output**

Codex's `--output-schema` flag takes a file path. Write the canonical schema
(kept in this skill at `schemas/review-output.schema.json` for version control)
to a temp file at invocation time — the content is inlined below so no knowledge
of the razorback install path is required:

```bash
SCHEMA_FILE=$(mktemp) && trap 'rm -f "$SCHEMA_FILE"' EXIT
cat > "$SCHEMA_FILE" <<'SCHEMA_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["verdict", "summary", "findings", "next_steps"],
  "properties": {
    "verdict": { "type": "string", "enum": ["approve", "needs-attention"] },
    "summary": { "type": "string", "minLength": 1 },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["severity", "title", "body", "file", "line_start", "line_end", "confidence", "recommendation"],
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
          "title": { "type": "string", "minLength": 1 },
          "body": { "type": "string", "minLength": 1 },
          "file": { "type": "string", "minLength": 1 },
          "line_start": { "type": "integer", "minimum": 1 },
          "line_end": { "type": "integer", "minimum": 1 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "recommendation": { "type": "string" }
        }
      }
    },
    "next_steps": { "type": "array", "items": { "type": "string", "minLength": 1 } }
  }
}
SCHEMA_EOF

echo "$ADVERSARIAL_PROMPT" | codex exec --ephemeral --color never \
  -C /path/to/project \
  --output-schema "$SCHEMA_FILE" \
  - \
  2>/dev/null
```

The `--output-schema` flag tells Codex to return JSON matching the review
schema (verdict, summary, findings with severity/file/line/confidence, next
steps).

**After**: Parse the JSON output. Present findings grouped by severity
(critical first). For each finding, show the file, lines, and recommendation.
Add your own assessment of each finding: do you agree? Is the confidence
warranted? Then give your overall take on Codex's verdict.

### Delegate a Task

The user wants Codex to actually do something: write code, refactor, fix a
bug. Codex needs tool access.

```bash
codex exec --ephemeral --color never --full-auto \
  -C /path/to/project \
  "Your task instructions here. Apply changes directly." \
  2>/dev/null
```

`--full-auto` gives Codex sandbox write access and on-request approval mode.
It can read files, write files, and run commands within the project directory.

**After**: Summarize what Codex changed. Run `git diff --stat` in the project
to show the scope, then review the changes yourself. Flag anything wrong or
improvable. If Codex made a mess, say so and offer to fix it.

**For tasks outside a git repo**, add `--skip-git-repo-check`.
**For tasks needing network access**, consider `--dangerously-bypass-approvals-and-sandbox`
(warn the user first).

## Adversarial Prompt Template

Use this template for adversarial reviews. Replace the `{{placeholders}}` with
actual values at runtime.

```
You are Codex performing an adversarial software review.
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

## Resuming a Codex Session

By default, `--ephemeral` means sessions aren't saved. If you need follow-up
capability, drop the `--ephemeral` flag:

```bash
# Initial task (persistent session)
codex exec --color never -C /path "prompt" 2>/dev/null

# Resume the last session
codex exec resume --last "follow-up prompt" 2>/dev/null
```

Use this when you need a multi-turn conversation with Codex (e.g., iterating
on a review or asking clarifying questions about findings).

## Cross-Project Usage

Codex reads AGENTS.md files from the project root for project-specific
instructions (like CLAUDE.md for Claude). If the target project has an
AGENTS.md, Codex will follow it automatically. Maximum 32KB of project docs.

To review a project other than cwd:

```bash
codex exec --ephemeral --color never -C ~/source/other-project "prompt" 2>/dev/null
```

## Critical Evaluation

Codex is a peer, not an authority. It runs on OpenAI's models with their own
knowledge cutoffs and blind spots.

- **Trust your own knowledge** when confident. If Codex says something you know
  is wrong, say so directly with evidence.
- **Research disagreements.** A different model isn't inherently more or less
  right. Check the code.
- **Don't defer.** Evaluate Codex's suggestions critically. The point of a
  second opinion is two perspectives, not rubber-stamping.
- **Adversarial review findings need validation.** Codex in adversarial mode is
  intentionally trying to find problems. Some findings may be speculative or
  low-confidence. Filter accordingly.

When you disagree with Codex, tell the user clearly: what Codex said, why you
think it's wrong, and your evidence.

## Error Handling

- **Auth expired**: `codex login status` exits non-zero. Tell the user to run
  `codex login` in a terminal.
- **Rate limits**: ChatGPT plan has rolling 5-hour limits. If you hit them,
  tell the user and suggest trying again later or using a simpler prompt.
- **Timeout**: escalation-tier reasoning on large diffs can take minutes. Set generous
  Bash timeouts (600000ms). If it still times out, try splitting the review
  into smaller chunks.
- **Empty output**: If stdout is empty, check stderr (remove `2>/dev/null`
  temporarily) for error messages.
- **No git repo**: Add `--skip-git-repo-check` for non-repo directories.
- **Codex not installed**: Check with `codex --version`. Install via
  `npm install -g @openai/codex` if missing.

## Quick Reference

Use the model/reasoning tier from repo-root `RAZORBACK.md` when present. If no
policy exists, inherit the current Codex default. Only override with `-m` when
the project policy or user request gives a concrete route.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `codex exec --ephemeral --color never -C dir "prompt" 2>/dev/null` |
| Code review | read-only | Pipe diff: `echo "$PROMPT" \| codex exec --ephemeral --color never -C dir - 2>/dev/null` (scope/sizing per Review Targeting) |
| Adversarial review | read-only + schema | Add `--output-schema "$SCHEMA_FILE"` where `$SCHEMA_FILE` is a temp file materialized from the inlined schema (see Adversarial Review section). Scope/sizing per Review Targeting. |
| Delegate (complex) | full-auto | `codex exec --ephemeral --color never --full-auto -C dir "prompt" 2>/dev/null` |
| Resume session | persistent | Drop `--ephemeral`, use `codex exec resume --last "prompt"` |
