# Review Targeting

Shared scope-selection and execution-mode rules for razorback's diff-based
reviewer skills (`razorback:claude-cli`, `razorback:codex-cli`). Load this when
selecting review scope. The reviewer CLI is referred to below as *the reviewer*;
substitute the concrete CLI (`claude -p`, `codex exec`) from the skill that sent
you here.

For diff-based modes (Code Review, Adversarial Review), pick scope and execution
mode before invoking the reviewer.

**Scope** — these are *skill arguments* the user passes to the reviewer skill,
NOT reviewer CLI flags (never append them to the `claude -p` / `codex exec`
command). Default `--scope auto`:

- `--scope auto`: working-tree if `git status --porcelain` is non-empty, else
  branch-vs-base
- `--scope working-tree`: staged + unstaged changes
- `--scope branch`: current branch vs base ref
- `--base <ref>`: explicit base for branch scope (default: `main`, fall back
  to `master`)

Resolve `$DIFF`, `$TARGET`, and `$RANGE` per scope:

`$DIFF` is always the complete resolved diff for the selected scope. `$RANGE`
and `$TARGET` describe that scope for labels and metadata; neither is a
substitute for the full diff in a review payload.

```bash
DIR="${DIR:-$(git rev-parse --show-toplevel)}"

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
  `Bash({command: ..., run_in_background: true})`. Tell the user "<reviewer>
  review running in the background; a deep review on a large diff often runs
  10-20+ minutes" and use `Monitor` on the returned shell ID to fetch output
  later.

This heuristic picks where output lands. It never narrows what the reviewer
looks at — a large diff goes to the background whole, not split. Set the Bash
timeout to the 30-minute failsafe either way; a long-running review is working,
not stuck.

`--wait` forces foreground; `--background` forces background. Otherwise apply
the heuristic and announce the chosen mode in one sentence.
