# Autonomous Execution Report - Ponytail Adoption

**Status:** Complete
**Plan:** docs/plans/2026-07-11-ponytail-adoption-plan.md
**Branch:** worktree-ponytail-adoption
**PR:** https://github.com/anortham/razorback/pull/5
**Duration:** ~35m (dispatch 13:30 → gate 14:05 UTC-5)
**Phases:** 1/1 complete (single parallel batch)
**Tasks:** 4/4 complete (+ 2 codex pre-merge review fixes)

## What shipped

- Task 1 (`a491a7e`): CI workflow — `npm test` + `bump-version.sh --audit` on push/PR, plus a release-tag gate asserting the tag matches the manifest version; `package.json` gains the canonical `test` script.
- Task 2 (`7e2ba91`): `SubagentStart` hook injecting the Miller capability table + six exploration rules + worktree-state reporting into every dispatched Claude Code subagent (`hooks/subagent-start`, `references/subagent-toolchain.md`).
- Task 4 (`745ac89`): `# razorback: <ceiling>, <upgrade trigger>` shortcut-debt marker convention in `fixing-small-issues`, plus the one-shot `harvesting-debt` ledger skill.
- Task 3 (`6b56574`): instruction-tier ruleset — canonical at `skills/using-razorback/references/instruction-tier.md` with byte-exact copies for Cursor/Windsurf/Cline/Kiro and a two-layer drift checker (`scripts/check-rule-copies.mjs`); one fix round extended the invariant layer to cover `subagent-toolchain.md` after Task 2 introduced a second verbatim rules copy.
- Review fix (`06d5b22`): `bump-version.sh --audit` now exits non-zero on manifest drift (was swallowed by `|| true`); undeclared-refs scan stays advisory; behavioral fixture tests added; `.razorback`/`.miller`/`.claude` excluded from the audit scan.
- Review fix (`a2d147b`): harvesting-debt scan gains `-I` and `.miller`/`.razorback`/`.claude` exclusions so tool-state dirs and binary indexes can't pollute the ledger.

## Judgment calls (non-blocking decisions made)

- `.github/workflows/test.yml:19` — no `npm ci` step because the repo has zero npm dependencies and no lockfile (`npm ci` would fail); inline comment explains.
- `.github/workflows/test.yml:33` — tag gate reads `GITHUB_REF_NAME` from the environment rather than interpolating `${{ github.ref_name }}` into the script body; same result, avoids injecting ref text into shell source.
- `tests/ci-workflow.test.mjs:12` — workflow asserted as text (repo's established content-assertion style; Node stdlib has no YAML parser); real YAML syntax validated out-of-band during implementation.
- `skills/using-razorback/references/subagent-toolchain.md:19` — `**Rules:**` heading drops SKILL.md's "(apply to the lead AND every implementer…)" parenthetical because the reader here *is* the dispatched worker; the six rules themselves are verbatim.
- `hooks/subagent-start:44` — emits the Claude Code `hookSpecificOutput` shape unconditionally, no platform branching: the hook is registered only in `hooks/hooks.json`, and dead branches would invite the double-inject bug documented in `session-start`.
- `hooks/subagent-start:10` — injects into ALL subagents; agent-type matcher deliberately deferred with a `razorback:` debt marker naming the trigger (Explore-agent noise).
- `scripts/check-rule-copies.mjs:35` — seven invariants pinned instead of the plan's suggested three, so every one of the six exploration rules (plus the MUST-use requirement) trips the checker on reword.
- `.kiro/steering/razorback.md:1` — Kiro frontmatter uses `inclusion: always` (mirrors ponytail's Kiro file; Cursor's `alwaysApply` is not a Kiro key).
- `skills/using-razorback/references/instruction-tier.md:27` — process rules are original distilled prose and deliberately NOT pinned as invariants; only the six Miller rules have a verbatim SKILL.md counterpart to stay in sync with.
- `skills/fixing-small-issues/SKILL.md:60` — marker rule added as the last Step 3 bullet (strictly additive; folding it into the TDD bullet would entangle it with protected policy).
- `skills/harvesting-debt/SKILL.md` — `tests/` NOT excluded from the debt scan: deliberate shortcuts in test code are real debt; the one self-referential regex-literal hit in `tests/debt-marker.test.mjs` is an accepted, obvious template row.
- `tests/version-audit.test.mjs` — fixture copies the working tree rather than `git archive HEAD` so the test exercises the fixed script pre-commit; a fourth test locks the advisory behavior of undeclared refs so a future "hard-fail everything" change fails loudly.
- Lead — pre-merge fix workers handed diffs back instead of committing (skill default is worker-commit): keeps the whole run on `parallel-lead-commit` semantics and avoids git index races between concurrent fixers.
- Lead — codex's recommendation to also hard-fail undeclared version references was PARTIALLY adopted: drift hard-fails, prose mentions stay advisory, because docs legitimately mention the version and the exclude list can't anticipate every case.

## External review (codex, adversarial)

- **Findings:** 2 (verdict: needs-attention)
- **Verified real, fixed:** 2 (commits: 06d5b22, a2d147b)
  - "Version audit failures cannot fail CI" (high) — reproduced with a drifted-manifest fixture (audit exit 0, check exit 1); root cause `cmd_check || true`; fixed in 06d5b22.
  - "Debt scan counts generated and binary artifacts as debt" (medium) — reproduced on `/usr/bin/grep` (17 rows, 6 binary `.miller` matches, zero real debt); fixed in a2d147b. Note: the Task 4 worker's original smoke test looked clean because this machine aliases grep→ugrep, which skips hidden dirs — the fix makes the exclusions explicit for standard grep users.
- **Dismissed:** 0
- **Flagged for your review:** 0
- Cost: not reported by codex-cli (no per-request token counts in JSON output).

## Tests

- 111 passing, 0 failing (79 baseline + 32 new across ci-workflow, subagent-hook, rule-copies, debt-marker, version-audit); `bump-version.sh --audit` exit 0; `check-rule-copies.mjs` exit 0. Gate verified at ef63337.

## Blockers hit

- None.

## Files changed

- 24 files, +1,354 / −10: `.github/workflows/test.yml`, `hooks/{subagent-start,hooks.json}`, `skills/using-razorback/references/{subagent-toolchain,instruction-tier}.md`, 4 host rule copies (`.cursor`/`.windsurf`/`.clinerules`/`.kiro`), `scripts/{check-rule-copies.mjs,bump-version.sh}`, `.version-bump.json`, `skills/{harvesting-debt,fixing-small-issues}`, 5 new test files, `package.json`, plan doc, `.memories/`.

## Next steps

- Review PR: https://github.com/anortham/razorback/pull/5
- CLAUDE.md follow-up (lead discretion, deliberately not edited by workers): add the instruction tier + new files to the Project Structure / Harness split tables.
- Consider `.github/copilot-instructions.md` as a fifth rule copy (one file + one checker line) for GitHub Copilot's instruction tier.
- Cosmetic: `subagent-toolchain.md`'s capability table has unescaped pipes (fine in its raw-text consumption path; escape if it's ever rendered).
- Main checkout shows untracked `.claude/` (Claude Code worktree container) — consider adding `.claude/worktrees/` to `.gitignore`.
- First push exercises the new CI workflow live for the first time — watch the Actions run on this PR.
- Deferred plan items remain recorded in the plan's Deferred section (Node hook runtime, mode levels, npm publishing, benchmark harness, subagent matcher, portability doc).
