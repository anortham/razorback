# Autonomous Execution Report - Pre-merge security pass

**Status:** Complete
**Plan:** docs/plans/2026-08-07-security-pass.md (design: docs/plans/2026-08-07-security-pass-design.md)
**Branch:** worktree-security-pass
**PR:** https://github.com/anortham/razorback/pull/10
**Duration:** ~40m (design commit 13:44Z → final fix commit 14:20Z)
**Phases:** 1/1 complete
**Tasks:** 5/5 complete
**External-model policy:** no policy declared — openai received the diff

## What shipped
- Canonical model-neutral security adversarial prompt at `skills/security-review/security-adversarial-prompt.txt` (29852af)
- `pre-merge-review` now orchestrates two reviewer passes — general + security — with per-pass tagging and a `dual-flagged` dedupe rule (16dbefa)
- Both reviewer invocation docs (`reviewer-prompts/codex.md`, `reviewer-prompts/claude.md`) carry a `## Security pass` section with second output files (a3a4167)
- Morning-report template renders per-pass counts, pass-labeled findings, and a cost note; `security-review` cross-references the pass (44e0bf6)
- Guard tests: quartet byte-sync of shared prompt sections, security-pass wiring, and report placeholders (a5e1996)
- Review fixes: INPUT TRUST section in all four adversarial prompts (370ac01), per-pass policy recheck (28e3fd6), distinct security-prompt rebuild + private temp-dir outputs (80a6717)

## Judgment calls (non-blocking decisions made)
- `skills/pre-merge-review/reviewer-prompts/codex.md:41` — Kept the general pass output name `codex-output.json` over the task text's `reviewer-output.json` because the file already used that name; only the `$OUT_DIR/` prefix changed.
- `skills/pre-merge-review/SKILL.md:123` — Aligned the Step 3 parsing snippets to `$OUT_DIR/` paths after a fix worker flagged the drift outside its file ownership; a bare filename there contradicted the reviewer-prompt docs.
- `skills/finishing-a-development-branch/morning-report-template.md:46` — Accepted the worker's extra `- **Cost:** {{cost_note}}` line beyond the strict task text because Step 7 already emits the note and the template had no home for it; guarded by test.
- Review dispatch built the branch diff once and reused it for both passes, matching the plan's "same diff, different lens" rule.

## External review (codex, adversarial)
- **Passes:** general 3 / security 3

- **Findings:** 5
- **Verified real, fixed:** 4 (commits: 370ac01, 28e3fd6, 80a6717)
  - [security] untrusted diffs can hijack the reviewer and exfiltrate readable files — INPUT TRUST section added to all four adversarial prompts, byte-sync guarded — fixed in 370ac01 (isolated credential-free reviewer checkout + malicious-diff fixtures filed as follow-up)
  - [general+security] the second dispatch bypassed the policy recheck — Step 2 now re-reads the external-model policy immediately before each pass and fails closed — fixed in 28e3fd6
  - [general] codex could run the general prompt twice and label the second result security — codex.md now requires rebuilding a distinct `ADVERSARIAL_SECURITY_PROMPT` and documents reuse as an error — fixed in 80a6717
  - [security] review findings were written to unprotected, unignored worktree files — all four pass outputs moved to a `mktemp -d` directory outside the repo with trap cleanup — fixed in 80a6717
- **Dismissed:** 1
  - [general] claude security review executes branch-controlled configuration — dismissed: pre-existing, documented tradeoff in `claude-cli/SKILL.md`, outside this plan's scope; codex's `--safe-mode` suggestion is unverified against the real CLI and is filed as a follow-up
- **Flagged for your review:** 0
- **Cost:** codex does not surface per-request token counts in its JSON output; both passes ran with no cost figures available

## Tests
- 196 passing, 0 failing (`npm test` at 80a6717) + `./scripts/bump-version.sh --audit` clean

## Blockers hit
- None

## Files changed
- `docs/plans/2026-08-07-security-pass-design.md` +130
- `docs/plans/2026-08-07-security-pass.md` +214
- `skills/security-review/security-adversarial-prompt.txt` +58
- `skills/pre-merge-review/SKILL.md` +46/-18
- `skills/pre-merge-review/reviewer-prompts/claude.md` +27/-10
- `skills/pre-merge-review/reviewer-prompts/codex.md` +25/-12
- `skills/claude-cli/adversarial-prompt.txt`, `skills/codex-cli/adversarial-prompt.txt`, `skills/grok-cli/adversarial-prompt.txt` +7 each (INPUT TRUST)
- `skills/finishing-a-development-branch/morning-report-template.md` +8/-2
- `skills/security-review/SKILL.md` +2
- `tests/adversarial-prompt-sync.test.mjs` +82/-20, `tests/security-checklist-sync.test.mjs` +46
- Total: 14 files, +641/-42 (plus `.memories/` checkpoints)

## Next steps
- Review PR: https://github.com/anortham/razorback/pull/10
- Decide whether to bump the version and release (manifests are at 0.26.2; the security pass is unreleased until then)
- Follow-up candidates recorded during review: isolated credential-free reviewer checkout + malicious-diff test fixtures; verify a claude `--safe-mode`-style flag against the real CLI before adopting; add an `## External model policy` block to razorback's own CLAUDE.md (dogfood)
