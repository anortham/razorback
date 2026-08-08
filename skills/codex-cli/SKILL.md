---
name: codex-cli
description: Use when the user says "ask codex", "get codex's take", "codex review", "have codex look at this", "delegate to codex", or any variation naming Codex/OpenAI as the perspective they want. Also use for a generic "second opinion from a different model" when no other model is named.
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
- **Sandbox mode**: `-s, --sandbox <MODE>` accepts `read-only | workspace-write | danger-full-access`. Use `read-only` for review (the reviewer can investigate but cannot edit). For delegate flows use `--sandbox workspace-write` alone — `codex exec` is non-interactive and never prompts for approval, and codex 0.143 removed `-a/--ask-for-approval` from `exec` entirely (passing it now errors with `unexpected argument '-a'`; the flag remains valid only on interactive `codex`). The old `--full-auto` shorthand still parses on `exec` but is deprecated. Pair with `--dangerously-bypass-approvals-and-sandbox` only when the user explicitly asks and the environment is externally sandboxed.
- **Windows sandbox**: on locked-down Windows hosts codex's sandbox can fail to spawn (`CreateProcessAsUserW failed: 5` / `windows sandbox failed: spawn setup`) and codex then reads zero files. See Error Handling for the `-s danger-full-access` fallback and its caveats.
- **Always use**: `--ephemeral --color never` for clean non-interactive output
- **Always append**: `2>/dev/null` to suppress stderr noise (session banner, transcript)
- **Always redirect stdin**: append `< /dev/null` to every invocation that doesn't pipe a prompt. `codex exec` reads stdin even when a prompt is passed as an argument (it prints "Reading additional input from stdin..." and waits for EOF). On macOS/Linux bash this is harmless because the shell closes stdin, but on Windows (Git Bash / Claude Code Bash tool) stdin can stay open and codex blocks forever with no output — this is the cause of the 30+ minute Windows hang. Use `< /dev/null` on bash; on Windows native cmd/PowerShell use `< NUL`.
- **Working directory**: `-C /path/to/project` sets the root. Defaults to cwd.
- **Output capture**: `-o, --output-last-message <FILE>` writes the agent's final message to a file. Use this for adversarial review when you need the JSON cleanly without stderr/banner contamination — point a temp file at it and read the file afterwards.
- **Timeout is a failsafe, not a budget**: set 1800000ms (30 min) on every
  review invocation. It exists to catch a process that hung or died and will
  never return — nothing else. It is not a bound on how long a review may
  take, and it is not a cost dial. Scope the review in the prompt and let the
  reviewer finish the job. Never tune it down to make a run cheaper.
- **Auth**: Logged in via ChatGPT OAuth. If auth fails, tell the user to run
  `codex login` in a terminal.
- **Profiles**: `-p, --profile <NAME>` selects a `~/.codex/config.toml` profile. If the user's policy defines a "review" profile (specific model + reasoning + sandbox), pass it instead of repeating those flags inline. Niche; only relevant when the user actually maintains profiles.

## Policy Gate

Before sending any diff or repo content to OpenAI, apply the external-model
policy check in razorback:security-review. Provider for this skill: `openai`.
No policy block in the target repo's project instructions → proceed and add the
loud note to the morning report. Policy denies `openai` → refuse the dispatch
and name an allowed alternative; on an autonomous run where the user chose this
provider, stop per blocker taxonomy #4.

## Review Targeting

Scope selection (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing heuristic are shared across razorback's reviewer
skills: load `review-targeting.md` from razorback's using-razorback references
when selecting scope. It resolves `$DIFF`, `$TARGET`, and `$RANGE`; read
"the reviewer" there as `codex exec`.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)

The user wants Codex's take on an approach, design decision, or piece of code.
No file changes needed.

```bash
codex exec --ephemeral --color never \
  -s read-only \
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

**Native alternative — `codex exec review`:** Codex ships a built-in scoped review subcommand: `codex exec review --uncommitted` (staged + unstaged + untracked), `codex exec review --base <branch>` (branch vs base), or `codex exec review --commit <sha>`, plus an optional `--title <TITLE>` for the review summary. The top-level `codex review` is the same non-interactive review with the same scope flags. It auto-detects scope and accepts a custom prompt via `[PROMPT]` or stdin. On codex 0.144.3 the `review` subcommand also accepts `--output-schema <FILE>`, `--ephemeral`, and `-o` directly. **Flag placement matters:** exec-level flags (`-C`, `--color`, `-s`) must come BEFORE `review` — codex rejects them after the subcommand (`unexpected argument '-C'`). Use `codex exec review` when the user wants a quick codex-flavored second opinion and doesn't need cross-reviewer prompt parity.

```bash
# Quick scoped review of uncommitted changes
codex exec --color never -C /path/to/project -s read-only \
  review --uncommitted --ephemeral \
  -o /tmp/review.txt \
  "Focus on error handling and concurrency safety." \
  < /dev/null 2>/dev/null
cat /tmp/review.txt
```

For the unified-prompt path (consistent with the claude-cli reviewer), continue with the steps below.

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
  -s read-only \
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

**Step 2: Build the adversarial prompt** from this skill's canonical
`adversarial-prompt.txt`, substituting `{{TARGET_LABEL}}` with the diff stat,
`{{USER_FOCUS}}` with any focus text (or "none specified"), and
`{{REVIEW_INPUT}}` with the full diff.

**Step 3: Send with structured output**

Codex's `--output-schema` flag takes a file path, so point it straight at the
canonical schema this skill ships — no temp file needed. `$SKILL_DIR`
throughout this skill is the skill's own base directory, announced when the
skill loads — substitute it before running any command:

```bash
# Split on the placeholders rather than ${//} substitution: bash >=5.2 expands
# & and backslashes in a substitution's replacement text, which mangles diffs.
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
ADVERSARIAL_PROMPT="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}${DIFF}"

RESULT_FILE=$(mktemp) && trap 'rm -f "$RESULT_FILE"' EXIT
echo "$ADVERSARIAL_PROMPT" | codex exec --ephemeral --color never \
  -s read-only \
  -C /path/to/project \
  --output-schema "$SKILL_DIR/schemas/review-output.schema.json" \
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
  --sandbox workspace-write \
  -C /path/to/project \
  "Your task instructions here. Apply changes directly." \
  < /dev/null 2>/dev/null
```

`--sandbox workspace-write` gives Codex write access inside the workspace
(the replacement for the deprecated `--full-auto` shorthand). Do NOT add
`-a never`: `codex exec` never prompts for approval, and codex 0.143 removed
`-a/--ask-for-approval` from `exec` — passing it errors with
`unexpected argument '-a'`. Codex can read files, write files, and run
commands within the project directory. If the task must write outside the
workspace root, add `--add-dir <DIR>` for each extra writable directory.

**After**: Summarize what Codex changed. Run `git diff --stat` in the project
to show the scope, then review the changes yourself. Flag anything wrong or
improvable. If Codex made a mess, say so and offer to fix it.

**For tasks outside a git repo**, add `--skip-git-repo-check`.
**For tasks needing network access**, consider `--dangerously-bypass-approvals-and-sandbox`
(warn the user first).

## Adversarial Prompt Template

The canonical adversarial prompt lives in this skill at
`./adversarial-prompt.txt` (version-controlled). Read it and replace the
`{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` placeholders at
runtime, as the Adversarial Review invocation above does.

It is the Codex variant of a deliberate trio: `../claude-cli/adversarial-prompt.txt`
and `../grok-cli/adversarial-prompt.txt` are identical except for the model name
and the REVIEW METHOD phrasing (Claude's names its `Read`/`Bash` tools).
Attack-surface categories, finding bar, calibration, and grounding rules match;
keep the three in sync when editing any.

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
- **Rate limits**: ChatGPT plan has rolling 5-hour limits. A rate limit means
  the service is unavailable, not that the review was too big. Tell the user
  and suggest waiting for the window to reset or swapping to another reviewer.
  Do NOT shrink the prompt or drop to a cheaper model to squeeze the review
  through — that ships a weaker review under the name of the one the user
  asked for.
- **Timeout tripped**: a review that runs 10-20+ minutes is working, not
  stuck — that is why the failsafe sits at 30 min. If the failsafe trips, the
  process hung or died; the diff was not "too big". Do NOT re-run with a
  longer timeout, and do NOT split the diff and re-run. A second full attempt
  burns another half hour and another full context on the same broken run.
  Check stderr, then treat it as reviewer unavailability.
- **Empty output**: If stdout is empty, check stderr (remove `2>/dev/null`
  temporarily) for error messages.
- **No git repo**: Add `--skip-git-repo-check` for non-repo directories.
- **Codex not installed**: Check with `codex --version`. Install via
  `npm install -g @openai/codex` if missing.
- **Windows hang (no output for many minutes)**: `codex exec` reads stdin even when a prompt argument is supplied. On Windows (Git Bash via Claude Code's Bash tool, PowerShell, cmd.exe) stdin can stay open with no producer, so codex blocks on stdin EOF forever and never starts the model run. Always add `< /dev/null` (bash) or `< NUL` (cmd/PowerShell) to non-piped invocations. If you've already triggered the hang, kill the process — it will not recover.
- **Windows sandbox spawn failure (`CreateProcessAsUserW failed: 5` / `windows sandbox failed: spawn setup`)**: codex's `read-only`/`workspace-write` sandbox needs to spawn a restricted-token child process, which locked-down Windows (Enterprise/LTSC, GPO process-creation restrictions) denies. Codex then can't run any shell command, so it reads zero files and the review/delegate returns nothing useful. This is **not** a finding about the code under review — it's the sandbox failing to start. Fix: re-run with `-s danger-full-access` so codex skips its own sandbox (the host harness still constrains the run; `read-only` is then enforced by the prompt, not the sandbox). On a host where this recurs, pass the flag from the start. Do not work around it by inlining file contents into the prompt. Retrying the same sandbox mode on the affected host fails identically; if you control the host, the native Windows sandbox setup or WSL2 may restore sandboxing.
- **`--full-auto` deprecation warning**: codex 0.134+ prints `warning: --full-auto is deprecated; use --sandbox workspace-write instead`. Replace `--full-auto` with `--sandbox workspace-write` alone.
- **`unexpected argument '-a' found`**: codex 0.143 removed `-a/--ask-for-approval` from `codex exec` (non-interactive runs never prompt, so the flag was meaningless there). Drop `-a never` from `exec` invocations; the flag still exists on interactive `codex`.

## Quick Reference

Inherit the current Codex default. Only override with `-m` when the user or
environment gives a concrete model.

See `references/follow-goals.md` for the verified `/goal` surface and setup note.

All non-piped patterns must include `< /dev/null` (bash) or `< NUL` (Windows cmd/PowerShell) to prevent codex from blocking on stdin EOF — see the Defaults section.

On **Windows**, if codex's sandbox fails to spawn (`CreateProcessAsUserW failed: 5`, common on locked-down Enterprise/LTSC hosts), re-run with `-s danger-full-access` — including for read-only review — since codex otherwise reads zero files. On hosts where it recurs, pass it from the start. See the Windows sandbox notes in Defaults and Error Handling.

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion | read-only | `codex exec --ephemeral --color never -s read-only -C dir "prompt" < /dev/null 2>/dev/null` |
| Code review (unified prompt) | read-only | Pipe diff: `echo "$PROMPT" \| codex exec --ephemeral --color never -s read-only -C dir - 2>/dev/null` (scope/sizing per Review Targeting) |
| Code review (codex-native scope) | read-only | `codex exec -C dir -s read-only review --uncommitted -o /tmp/review.txt "focus" < /dev/null 2>/dev/null` (or `--base <branch>` / `--commit <sha>`; exec-level flags like `-C`/`-s` go BEFORE `review`) |
| Goal tracking | interactive only | `/goal` sets or views a long-running objective; the `goals` feature is stable and enabled by default as of codex 0.143 |
| Adversarial review | read-only + schema | Add `--output-schema "$SKILL_DIR/schemas/review-output.schema.json"` and build the prompt from `$SKILL_DIR/adversarial-prompt.txt` (see Adversarial Review section). Scope/sizing per Review Targeting. |
| Delegate (complex) | workspace-write | `codex exec --ephemeral --color never --sandbox workspace-write -C dir "prompt" < /dev/null 2>/dev/null` (no `-a` — removed from `exec` in codex 0.143; replaces the deprecated `--full-auto`; add `--add-dir <DIR>` for extra writable dirs) |
| Truly fresh reviewer | read-only + isolated | Add `--ignore-user-config --ignore-rules` to skip project AGENTS.md and execpolicy `.rules` |
| Clean output capture | any | Add `-o <file>` to write the agent's last message to a file instead of mixing it with stderr/banner output |
| Resume session | persistent | Drop `--ephemeral`, use `codex exec resume --last "prompt" < /dev/null 2>/dev/null` |
