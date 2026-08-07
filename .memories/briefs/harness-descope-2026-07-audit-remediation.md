---
id: harness-descope-2026-07-audit-remediation
title: Harness descope + 2026-07 audit remediation
status: completed
created: 2026-07-16T13:29:48.784Z
updated: 2026-08-07T14:43:55.319Z
tags:
  - harness-descope
  - audit
  - milestone
---

## Direction (user-approved 2026-07-16)

- **Drop Gemini CLI entirely** — product retired; both host-harness support AND the `gemini` reviewer/delegation role are removed. Reviewer choice becomes `none | codex | claude`.
- **Demote Copilot CLI to instruction-tier** — no hooks/manifest claims; users get `.github/copilot-instructions.md` (new synced host copy).
- **Cursor frozen/deferred** — no Cursor work at all until user re-opens it (known upstream doubt: hook `additional_context` may not reach the model).
- Supported plugin-tier harnesses after this: Claude Code, Codex CLI / ChatGPT desktop app, OpenCode.
- Razorback pins no model names by design; only `cursor-agent` has a pin (`composer-2.5-fast`) — deferred with Cursor.

## Execution

Plan: `docs/plans/2026-07-16-audit-remediation-and-harness-descope.md` — 13 tasks, 4 serialized batches (A descope, B correctness+canon, C dedup+hot-path, D Miller insertions). Worktree `.claude/worktrees/audit-fixes-2026-07`, branch `worktree-audit-fixes-2026-07`. Pre-merge reviewer: **codex**. Commit mode: parallel-lead-commit within batches.

## Key audit facts driving the plan

- Miller canonical table under-documents the live schema (5 missing search modes, no `depth=overview`, `patterns`/`content` absent).
- 3 verified drift bugs: finishing-a-development-branch interactive base-branch script, implementer-prompt 4-item blocker list, claude-cli inlining its own declared canonicals.
- Dedup policy: same-run duplication → canonical file + reference; alternative-load duplication (SDD ⟷ executing-plans) → keep copies + byte-compare guard test.
- CI gains a tag-equality version gate (both ponytail and context-mode shipped the "all manifests stale together" failure).
