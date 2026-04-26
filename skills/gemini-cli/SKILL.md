---
name: gemini-cli
description: Call Google's Gemini CLI as an assistant for second opinions, task delegation, code review, web research, and codebase analysis. Use this skill whenever the user says "ask gemini", "get gemini's take", "have gemini look at this", "delegate to gemini", "run gemini", "gemini review", or any variation suggesting they want Gemini's perspective or help. Also trigger when the user wants current web information (Gemini has Google Search built in), codebase architecture analysis, or a fresh take from a different model.
---

# Gemini Assistant

Use the Gemini CLI (`gemini`) to get a second opinion, delegate work, request code review, do web research, or analyze codebase architecture using Google's Gemini models.

## Defaults

- **Model**: `gemini-3-pro` (use `-m gemini-2.5-flash` for quick/simple tasks)
- **Output**: `-o text` for human-readable (use `-o json` when you need stats or structured parsing)
- **Always append**: `2>/dev/null` to suppress stderr noise (auth messages, debug info) and get clean stdout only
- **Timeout**: Always set the Bash tool's `timeout` parameter — minimum 300000ms (5 min) for simple queries, 600000ms (10 min) for delegation/refactoring tasks. Gemini also has a native `--timeout <ms>` flag you can pair with this for belt-and-suspenders.
- **Working directory**: Gemini operates on whatever directory it's launched from — it has no `-C` flag like Codex. If the target code isn't in the current working directory, **always `cd` to the target directory first** using `cd /path/to/project && gemini ...`. Without this, Gemini will waste its entire session trying to find the files.
- **Forceful prompts**: Gemini sometimes presents plans and asks for confirmation even in yolo mode. Use directive language: "Apply now", "Start immediately", "Do this without asking for confirmation."

## Review Targeting

For Code Review on diff-based work, pick scope and execution mode before
invoking Gemini.

**Scope** — user-passable arguments, default `--scope auto`:

- `--scope auto`: working-tree if `git status --porcelain` is non-empty, else
  branch-vs-base
- `--scope working-tree`: staged + unstaged changes
- `--scope branch`: current branch vs base ref
- `--base <ref>`: explicit base for branch scope (default: `main`, fall back
  to `master`)

Resolve the changed-file list per scope (Gemini reads files via `@./`
references, not raw diff text):

```bash
case "$SCOPE" in
  branch)
    BASE="${USER_BASE:-$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)}"
    FILES=$(git diff --name-only "$BASE..HEAD")
    RANGE="$BASE..HEAD"
    ;;
  working-tree)
    FILES=$(git diff --name-only HEAD)
    RANGE=""
    ;;
  auto|*)
    if [ -n "$(git status --porcelain)" ]; then
      FILES=$(git diff --name-only HEAD)
      RANGE=""
    else
      BASE="${USER_BASE:-$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)}"
      FILES=$(git diff --name-only "$BASE..HEAD")
      RANGE="$BASE..HEAD"
    fi
    ;;
esac
```

For branch scope, also include `git log --oneline "$BASE..HEAD"` in the
prompt as commit context.

**Execution mode** — peek at size first:

```bash
SHORTSTAT=$(git diff --shortstat $RANGE)
```

Decide:

- **Tiny** (≤ 2 files, < ~200 lines): foreground. Return inline.
- **Anything else, or unclear**: launch with
  `Bash({command: ..., run_in_background: true})`. Tell the user "Gemini
  review running in the background; on a large changeset this typically takes
  1-3 minutes" and use `Monitor` on the returned shell ID to fetch output
  later.

`--wait` forces foreground; `--background` forces background. Otherwise apply
the heuristic and announce the chosen mode in one sentence.

## Task Routing

Determine the task type from context and select the right mode:

### Second Opinion (read-only)
The user wants Gemini's take on an approach, design decision, or piece of code. No file changes needed.

```bash
gemini "Your prompt here" -o text 2>/dev/null
```

No `--yolo` needed — Gemini won't try to use tools for pure analysis unless you ask it to.

**After**: Show Gemini's response, then add your own analysis. Where you agree, say so. Where you disagree, explain why with evidence. The user gets two perspectives.

### Delegate a Task (yolo mode)
The user wants Gemini to actually do something — write code, refactor, generate files. Gemini needs tool approval.

```bash
gemini "Your prompt here. Apply changes now without asking for confirmation." --yolo -o text 2>/dev/null
```

**After**: Summarize what Gemini changed. Run `git diff --stat` to show the scope, then review the changes yourself. Flag anything wrong or improvable.

### Code Review (read-only)
The user wants Gemini to review code for bugs, style, performance, or correctness.

**Step 1: Apply Review Targeting** (see section above) to resolve `$FILES`,
`$RANGE`, and the foreground/background decision.

**Step 2: Build `@./` references** from the file list:

```bash
REFS=$(printf "@./%s " $FILES)
```

**Step 3: Send to Gemini.** For working-tree scope:

```bash
gemini "Review the following changed files for bugs, security issues, and improvements: $REFS" -o text 2>/dev/null
```

For branch scope, include commit context:

```bash
COMMITS=$(git log --oneline "$RANGE")
gemini "Review changes on this branch ($RANGE) for bugs, security issues, and improvements. Commits: $COMMITS. Files: $REFS" -o text 2>/dev/null
```

Note the `@./` file reference syntax — Gemini reads files directly via these
refs, so the prompt stays small even when the changeset is large.

**After**: Present Gemini's review, then add your own. Highlight agreements
and disagreements. Call out anything Gemini missed.

### Web Research (Google Search)
Gemini has Google Search built in — use this when the user needs current information (latest versions, API changes, recent releases, docs).

```bash
gemini "What are the latest changes to [library/API]? Use Google Search for current information." -o text 2>/dev/null
```

**After**: Present the findings. Cross-reference with your own knowledge and flag anything that seems outdated or wrong.

### Codebase Architecture Analysis
Gemini has a `codebase_investigator` tool for deep architectural analysis.

```bash
gemini "Use codebase_investigator to analyze this project's architecture. Focus on [specific aspect]." -o text 2>/dev/null
```

**After**: Present the analysis. Add your own observations, especially about patterns Gemini may have missed.

### Quick Tasks (Flash model)
For simple tasks where speed matters more than depth:

```bash
gemini "Your prompt" -m gemini-2.5-flash -o text 2>/dev/null
```

## Resuming a Session

When the user wants to continue a previous Gemini conversation:

```bash
echo "Your follow-up prompt" | gemini -r latest -o text 2>/dev/null
```

To resume a specific session (not the latest), list sessions first:
```bash
gemini --list-sessions
echo "follow-up" | gemini -r 1 -o text 2>/dev/null
```

## Constructing Good Prompts for Gemini

- **Use `@` references** for files: `@./src/main.ts` instead of pasting content
- **Be directive** — Gemini can stall on planning. Say "do it now" not "could you maybe"
- **Specify output expectations** — "Output complete file content" or "Give me a bullet list"
- **For delegation**, describe the desired end state clearly

If the user's request is vague, ask them to clarify before calling Gemini.

## Critical Evaluation

Gemini is a peer, not an authority. It runs on Google's models with their own knowledge cutoffs and blind spots.

- **Trust your own knowledge** when confident. If Gemini says something you know is wrong, say so directly with evidence.
- **Research disagreements** — Gemini has Google Search but that doesn't make its conclusions automatically correct.
- **Don't defer** — evaluate Gemini's suggestions critically. A different model isn't inherently more or less right.

When you disagree with Gemini, tell the user clearly: what Gemini said, why you think it's wrong, and your evidence. If genuinely ambiguous, say so and let the user decide. You can resume the session to discuss:

```bash
echo "This is Claude following up. I disagree with [X] because [evidence]. What's your take?" | gemini -r latest -o text 2>/dev/null
```

## Error Handling

- **Rate limits**: Free tier is 60 req/min, 1000/day. Gemini auto-retries with backoff. If you hit limits, switch to `-m gemini-2.5-flash` for lower-priority tasks or wait.
- **Command failures**: Check with `gemini --version` to verify auth. Use `--debug` for verbose error info.
- **Sandbox mode**: If the task needs isolation, add `--sandbox`. Ask the user before using risky modes.
- If output contains warnings or partial results, summarize and ask the user what to do.

## Quick Reference

| Use case | Mode | Command pattern |
|---|---|---|
| Second opinion / analysis | read-only | `gemini "prompt" -o text` |
| Write code / refactor | yolo | `gemini "prompt. Apply now." --yolo -o text` |
| Code review | read-only | `gemini "Review $REFS for bugs" -o text` (scope/sizing per Review Targeting; `$REFS` is `@./` list from changed files) |
| Web research | search | `gemini "latest X? Use Google Search." -o text` |
| Architecture analysis | investigator | `gemini "Use codebase_investigator..." -o text` |
| Quick/simple task | flash | `gemini "prompt" -m gemini-2.5-flash -o text` |
| Resume session | inherited | `echo "prompt" \| gemini -r latest -o text` |
