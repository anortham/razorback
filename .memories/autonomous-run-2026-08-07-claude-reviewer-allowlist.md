# Autonomous Execution Report - Claude Reviewer Allowlist Drift Fix

**Status:** Complete
**Plan:** docs/plans/2026-08-07-claude-reviewer-allowlist-drift.md
**Branch:** worktree-claude-reviewer-allowlist
**PR:** pending — filled in after PR creation
**Duration:** ~50m (single session, including the assessment that found the drift)
**Phases:** 1/1 complete
**Tasks:** 1/1 complete (one TDD slice: guards red → doc fixes → green)

## What shipped
- `skills/pre-merge-review/SKILL.md:109` — claude reviewer flag summary corrected to `--tools "Read,Grep,Glob" --strict-mcp-config` (was `Read,Bash`, which is write-capable under `--dangerously-skip-permissions`).
- `skills/pre-merge-review/SKILL.md:109,111` — false "self-contained / schema inlined" claims replaced with the real behavior: both reviewer-prompts files read the canonical schema (and claude the canonical adversarial prompt) at dispatch time.
- `skills/claude-cli/adversarial-prompt.txt` — REVIEW METHOD now instructs only allowlisted tools: "Investigate read-only with the Read, Grep, and Glob tools." (was instructing Bash, which the CLI allowlist blocks).
- `skills/claude-cli/SKILL.md:286` and `skills/pre-merge-review/reviewer-prompts/codex.md:115` — divergence descriptions updated from `Read`/`Bash` to `Read`/`Grep`/`Glob`.
- `tests/claude-cli-docs.test.mjs` — four new guards: fenced-block allowlist check, file-wide inline `--tools` value scanner, negative meta-tests proving the scanner flags `Read,Write`/`Read,Bash` drift, and a `Read,Bash` quarantine (allowed only in the documented anti-pattern warning).
- `tests/adversarial-prompt-sync.test.mjs` (new) — trio shared-section byte-sync across codex/claude/grok adversarial prompts, opening-line model-name check, placeholder-order check, claude tool-sentence guard.
- Guard suite grew 169 → 177 tests.

## Judgment calls (non-blocking decisions made)
- `tests/adversarial-prompt-sync.test.mjs:23-72` — Split the planned two sync guards into four finer tests (sections, opening line, placeholders, tool sentence) for sharper failure messages; same invariants as planned.
- `tests/claude-cli-docs.test.mjs:107` — Exempted the anti-pattern warning by matching `/Do NOT treat/` on the flagged line or the line above, because the warning wraps across two lines in `claude-cli/SKILL.md`.
- `.memories/2026-08-07/*` — Moved both checkpoint files from the main checkout into this worktree before committing; goldfish binds to the primary workspace path, and untracked files do not propagate to worktrees.
- Active Goldfish brief "Harness descope + 2026-07 audit remediation" is 21+ days stale and its work appears shipped (releases through 0.26.2). Left untouched — completing another run's brief is a user call; see Next steps.

## External review (codex, adversarial)
- **Findings:** 1
- **Verified real, fixed:** 1 (commits: bf1f882)
  - "Inline reviewer allowlists remain outside the guard" (medium, confidence 0.99) — the fenced-block guard missed inline Markdown `--tools` values, the exact site of the historical drift, and the quarantine matched only the literal `Read,Bash`. Verified real: an inline drift to `--tools "Read,Write"` passed both original guards. Fixed with a file-wide `--tools` scanner requiring the canonical `"Read,Grep,Glob"` value outside the anti-pattern warning, plus negative meta-tests proving the scanner catches inline `Read,Write` and `Read,Bash` drift.
- **Dismissed:** 0
- **Flagged for your review:** 0
- Cost: codex does not surface per-request token counts — not reported by codex-cli. (Reviewer also noted `EROFS` failures running `npm test` inside its read-only sandbox; expected sandbox behavior, not a finding. The full suite passes in the working tree.)

## Tests
- `npm test`: 177 passing, 0 failing (at bf1f882 tree). `./scripts/bump-version.sh --audit`: all manifests in sync at 0.26.2, no undeclared version strings.
- TDD ledger: worker red (2 expected failures: `Read,Bash` guard + tool-sentence guard, pre-fix tree) → worker green (10/10) → post-review-fix green (12/12 guard tests) → branch gate 177/177 + audit clean.

## Blockers hit
- None.

## Files changed
```
 .memories/2026-08-07/114631_4ace.md                |  38 +++++++
 .memories/2026-08-07/121039_21da.md                |  36 ++++++
 .../2026-08-07-claude-reviewer-allowlist-drift.md  | 123 +++++++++++++++++++++
 skills/claude-cli/SKILL.md                         |   2 +-
 skills/claude-cli/adversarial-prompt.txt           |   4 +-
 skills/pre-merge-review/SKILL.md                   |   4 +-
 skills/pre-merge-review/reviewer-prompts/codex.md  |   2 +-
 tests/adversarial-prompt-sync.test.mjs             |  70 ++++++++++++
 tests/claude-cli-docs.test.mjs                     |  94 ++++++++++++++++
 9 files changed, 367 insertions(+), 6 deletions(-)
```

## Next steps
- Review PR: pending — filled in after PR creation
- Confirm the stale active Goldfish brief ("Harness descope + 2026-07 audit remediation") can be marked complete.
- Deferred follow-ups from the 2026-08-07 assessment are recorded in the plan's Context section: CI/DevOps PR reviewer, security lane at the branch gate, data-governance precondition for external-model skills, org rollout kit, example-command-vs-CLI-help linter, memories data-classification policy.
- After merge: version bump + release is a separate approved action (`./scripts/bump-version.sh`).
