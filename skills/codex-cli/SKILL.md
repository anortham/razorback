---
name: codex-cli
description: Call OpenAI's Codex CLI for second opinions, code review, adversarial review, and task delegation. Use this skill whenever the user says "ask codex", "get codex's take", "codex review", "second opinion", "have codex look at this", "delegate to codex", "deep review", "adversarial review", or any variation suggesting they want Codex's perspective. Also trigger when the user wants a fresh take from a different model on code, architecture, or implementation decisions.
---

# Codex Assistant

Use the Codex CLI (`codex exec`) to get a second opinion, review code changes,
run adversarial security/correctness reviews, or delegate tasks to OpenAI
models.

## Defaults

- **Model**: inherit the current Codex default unless the user or environment
  explicitly selects a model with `-m`.
- **Reasoning**: inherit the current Codex default unless the user or environment
  explicitly selects reasoning effort.
- **Sandbox mode**: `-s, --sandbox <MODE>` accepts `read-only | workspace-write | danger-full-access`. Use `read-only` for review (the reviewer can investigate but cannot edit). For delegate flows use `--sandbox workspace-write` plus `-a never` (the old `--full-auto` shorthand is deprecated as of codex 0.134; it still runs but emits a warning). Pair with `--dangerously-bypass-approvals-and-sandbox` only when the user explicitly asks and the environment is externally sandboxed.
- **Windows sandbox**: codex's `read-only` and `workspace-write` sandboxes build a restricted-token child process via `CreateProcessAsUserW`. On locked-down Windows (Enterprise/LTSC, GPO-restricted process creation) that call fails with `CreateProcessAsUserW failed: 5` / `windows sandbox failed: spawn setup`, so codex cannot spawn **any** child process and reads no files — even for read-only review. When you hit this, re-run with `-s danger-full-access` so codex skips its own sandbox; the host harness (Claude Code) still bounds the run, but note `danger-full-access` removes codex's local isolation, so `read-only` is then enforced only by the prompt, not the sandbox. On a host where this failure is known to recur (e.g. an Enterprise/LTSC machine with GPO restrictions), pass the flag from the start to skip a wasted first run. It is environmental: retrying the same sandbox mode on the affected host fails identically, and if you control the host the native Windows sandbox setup (`codex-windows-sandbox-setup.exe`) or running under WSL2 may restore sandboxing. Do NOT work around it by embedding file contents in the prompt, and do not reach for `--dangerously-bypass-approvals-and-sandbox` (it also skips approvals) unless the user asks. See Error Handling.
- **Always use**: `--ephemeral --color never` for clean non-interactive output
- **Always append**: `2>/dev/null` to suppress stderr noise (session banner, transcript)
- **Always redirect stdin**: append `< /dev/null` to every invocation that doesn't pipe a prompt. `codex exec` reads stdin even when a prompt is passed as an argument (it prints "Reading additional input from stdin..." and waits for EOF). On macOS/Linux bash this is harmless because the shell closes stdin, but on Windows (Git Bash / Claude Code Bash tool) stdin can stay open and codex blocks forever with no output — this is the cause of the 30+ minute Windows hang. Use `< /dev/null` on bash; on Windows native cmd/PowerShell use `< NUL`.
- **Working directory**: `-C /path/to/project` sets the root. Defaults to cwd.
- **Output capture**: `-o, --output-last-message <FILE>` writes the agent's final message to a file. Use this for adversarial review when you need the JSON cleanly without stderr/banner contamination — point a temp file at it and read the file afterwards.
- **Timeout**: 600000ms (10 min) for simple queries, 1200000ms (20 min) for
  deep reviews or delegation work, 1800000ms (30 min) for large diffs. Err generous — a single timeout wastes more time
  (and tokens) than a longer wait, especially when Codex is itself calling out
  to another model. Don't default below 10 min.
- **Auth**: Logged in via ChatGPT OAuth. If auth fails, tell the user to run
  `codex login` in a terminal.
- **Profiles**: `-p, --profile <NAME>` selects a `~/.codex/config.toml` profile. If the user's policy defines a "review" profile (specific model + reasoning + sandbox), pass it instead of repeating those flags inline. Niche; only relevant when the user actually maintains profiles.

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
  < /dev/null 2>/dev/null
```

Codex runs in the project directory and can read files on its own. If you need
to point it at specific files, mention them by path in the prompt. Codex has no
`@file` syntax; it reads files via shell tools.

**After**: Show Codex's response, then add your own analysis. Where you agree,
say so. Where you disagree, explain why with evidence. The user gets two
perspectives.

### Code Review

The user wants a review of current changes. Inherit the current Codex default
unless the user or environment explicitly selects a model.

**Native alternative — `codex exec review`:** Codex ships a built-in scoped review subcommand: `codex exec review --uncommitted` (working tree), `codex exec review --base <branch>` (branch vs base), or `codex exec review --commit <sha>`. It auto-detects scope and accepts a custom prompt via `[PROMPT]` or stdin. It does **not** support `--output-schema`, so use the regular `codex exec` path below for adversarial / schema-validated review. Use `codex exec review` when the user wants a quick codex-flavored second opinion and doesn't need cross-reviewer prompt parity.

```bash
# Quick scoped review of uncommitted changes
codex exec review --uncommitted --ephemeral --color never \
  -C /path/to/project \
  -o /tmp/review.txt \
  "Focus on error handling and concurrency safety." \
  < /dev/null 2>/dev/null
cat /tmp/review.txt
```

For the unified-prompt path (consistent with claude-cli / gemini-cli reviewers), continue with the steps below.

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

RESULT_FILE=$(mktemp) && trap 'rm -f "$RESULT_FILE"' EXIT
echo "$ADVERSARIAL_PROMPT" | codex exec --ephemeral --color never \
  -C /path/to/project \
  --output-schema "$SCHEMA_FILE" \
  -o "$RESULT_FILE" \
  - \
  2>/dev/null
cat "$RESULT_FILE"  # Clean JSON, no banner/transcript noise
```

The `--output-schema` flag tells Codex to return JSON matching the review
schema (verdict, summary, findings with severity/file/line/confidence, next
steps). `-o` writes the agent's final message to a file so the JSON arrives uncontaminated by status output.

**After**: Parse the JSON output. Present findings grouped by severity
(critical first). For each finding, show the file, lines, and recommendation.
Add your own assessment of each finding: do you agree? Is the confidence
warranted? Then give your overall take on Codex's verdict.

### Delegate a Task

The user wants Codex to actually do something: write code, refactor, fix a
bug. Codex needs tool access.

```bash
codex exec --ephemeral --color never \
  --sandbox workspace-write -a never \
  -C /path/to/project \
  "Your task instructions here. Apply changes directly." \
  < /dev/null 2>/dev/null
```

`--sandbox workspace-write -a never` gives Codex write access inside the
workspace and tells it not to ask for approval mid-run (the replacement for
the deprecated `--full-auto` shorthand). It can read files, write files, and
run commands within the project directory.

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
codex exec --color never -C /path "prompt" < /dev/null 2>/dev/null

# Resume the last session
codex exec resume --last "follow-up prompt" < /dev/null 2>/dev/null
```

Use this when you need a multi-turn conversation with Codex (e.g., iterating
on a review or asking clarifying questions about findings).

## Cross-Project Usage

Codex reads AGENTS.md files from the project root for project-specific
instructions (like CLAUDE.md for Claude). If the target project has an
AGENTS.md, Codex will follow it automatically. Maximum 32KB of project docs.

To review a project other than cwd:

```bash
codex exec --ephemeral --color never -C ~/source/other-project "prompt" < /dev/null 2>/dev/null
```

**Truly fresh reviewer (no project context bias):** if the reviewing instance should *not* inherit AGENTS.md or `.rules` from the project being reviewed (e.g., adversarial review where project conventions might rationalize the change), add `--ignore-user-config` and `--ignore-rules`:

```bash
codex exec --ephemeral --color never \
  -C ~/source/other-project \
  --ignore-user-config --ignore-rules \
  "prompt" < /dev/null 2>/dev/null
```

Auth still uses `CODEX_HOME` even with `--ignore-user-config`, so login isn't affected.

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
- **Timeout**: escalation-tier reasoning on large diffs can take 10-20+ minutes,
  longer when Codex delegates to another model. Set generous Bash timeouts
  (1800000ms / 30 min for escalation-tier). If it still times out, split the
  review into smaller chunks rather than retrying with the same timeout.
- **Empty output**: If stdout is empty, check stderr (remove `2>/dev/null`
  temporarily) for error messages.
- **No git repo**: Add `--skip-git-repo-check` for non-repo directories.
- **Codex not installed**: Check with `codex --version`. Install via
  `npm install -g @openai/codex` if missing.
- **ACP transport unsupported**: Codex CLI does NOT support the `--acp` protocol flag. If a `delegate_task` call with `acp_command: "codex"` fails with `unexpected argument '--acp'`, remove the `acp_command` parameter entirely — it will fall back to the default Hermes subagent transport instead.
- **Windows hang (no output for many minutes)**: `codex exec` reads stdin even when a prompt argument is supplied. On Windows (Git Bash via Claude Code's Bash tool, PowerShell, cmd.exe) stdin can stay open with no producer, so codex blocks on stdin EOF forever and never starts the model run. Always add `< /dev/null` (bash) or `< NUL` (cmd/PowerShell) to non-piped invocations. If you've already triggered the hang, kill the process — it will not recover.
- **Windows sandbox spawn failure (`CreateProcessAsUserW failed: 5` / `windows sandbox failed: spawn setup`)**: codex's `read-only`/`workspace-write` sandbox needs to spawn a restricted-token child process, which locked-down Windows (Enterprise/LTSC, GPO process-creation restrictions) denies. Codex then can't run any shell command, so it reads zero files and the review/delegate returns nothing useful. This is **not** a finding about the code under review — it's the sandbox failing to start. Fix: re-run with `-s danger-full-access` so codex skips its own sandbox (the host harness still constrains the run; `read-only` is then enforced by the prompt, not the sandbox). On a host where this recurs, pass the flag from the start. Do not work around it by inlining file contents into the prompt. Retrying the same sandbox mode on the affected host fails identically; if you control the host, the native Windows sandbox setup or WSL2 may restore sandboxing.
- **`--full-auto` deprecation warning**: codex 0.134+ prints `warning: --full-auto is deprecated; use --sandbox workspace-write instead`. Replace `--full-auto` with `--sandbox workspace-write -a never` (or `--sandbox workspace-write` alone if you want the default approval policy).

## Quick Reference

Inherit the current Codex default. Only override with `-m` when the user or
environment gives a concrete model.

See `references/follow-goals.md` for the verified `/goal` surface and setup note.

All non-piped patterns must include `< /dev/null` (bash) or `< NUL` (Windows cmd/PowerShell) to prevent codex from blocking on stdin EOF — see the Defaults section.

On **Windows**, if codex's sandbox fails to spawn (`CreateProcessAsUserW failed: 5`, common on locked-down Enterprise/LTSC hosts), re-run with `-s danger-full-access` — including for read-only review — since codex otherwise reads zero files. On hosts where it recurs, pass it from the start. See the Windows sandbox notes in Defaults and Error Handling.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `codex exec --ephemeral --color never -C dir "prompt" < /dev/null 2>/dev/null` |
| Code review (unified prompt) | read-only | Pipe diff: `echo "$PROMPT" \| codex exec --ephemeral --color never -C dir - 2>/dev/null` (scope/sizing per Review Targeting) |
| Code review (codex-native scope) | read-only | `codex exec review --uncommitted -C dir -o /tmp/review.txt "focus" < /dev/null 2>/dev/null` (or `--base <branch>` / `--commit <sha>`). No `--output-schema` support. |
| Goal tracking | experimental | `/goal` sets or views a long-running objective; requires `features.goals` |
| Adversarial review | read-only + schema | Add `--output-schema "$SCHEMA_FILE"` where `$SCHEMA_FILE` is a temp file materialized from the inlined schema (see Adversarial Review section). Scope/sizing per Review Targeting. |
| Delegate (complex) | workspace-write | `codex exec --ephemeral --color never --sandbox workspace-write -a never -C dir "prompt" < /dev/null 2>/dev/null` (replaces the deprecated `--full-auto`) |
| Truly fresh reviewer | read-only + isolated | Add `--ignore-user-config --ignore-rules` to skip project AGENTS.md and execpolicy `.rules` |
| Clean output capture | any | Add `-o <file>` to write the agent's last message to a file instead of mixing it with stderr/banner output |
| Resume session | persistent | Drop `--ephemeral`, use `codex exec resume --last "prompt" < /dev/null 2>/dev/null` |
