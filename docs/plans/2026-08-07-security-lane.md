# Security Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Add razorback's security lane: secrets-scan and dependency-audit branch-gate scopes, a concrete security review checklist at every review touchpoint, and the org-configurable external-model policy gate.

**Architecture:** One new canonical skill (`security-review`) holds the scopes, the policy block, and the canonical checklist. Every other touchpoint carries either a short reference (policy gates) or a test-guarded verbatim copy (checklist, adversarial-prompt line). Guard tests keep all copies in sync — no unguarded duplication.

**Tech Stack:** Markdown skill docs, Node.js built-in test runner, zero dependencies.

**Architecture Quality:** From the approved design (`2026-08-07-security-lane-design.md`): skills-only change; caller-facing interface = policy block format, `Security scope:` template field, `{{policy_status}}` placeholder, checklist copy locations. Risk low-medium (breadth of copies), mitigated by sync/presence guards. Enforcement points reference the canonical skill instead of inlining the procedure — inlining was rejected (seven drift sites, the failure class PR #8 fixed).

**Spec:** `docs/plans/2026-08-07-security-lane-design.md` (approved 2026-08-07). Code reality contradicting it is a plan mismatch — report, do not redesign locally.

**Branch note:** based on `worktree-claude-reviewer-allowlist` (PR #8) because the trio sync guard from that branch enforces Task 5. Merge PR #8 first.

## Global Constraints

- **Canonical security checklist** — verbatim in all three homes, always preceded by the marker line `**Security:**`:
  ```
  - No secrets, credentials, tokens, or connection strings in the diff?
  - Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
  - Authorization checked on new or changed routes/APIs?
  - New dependencies vetted (source, maintenance, known CVEs)?
  - No sensitive data written to logs or error messages?
  ```
- **ATTACK SURFACE line** — appended as the final bullet of the shared ATTACK SURFACE section, byte-identical in all three adversarial prompts:
  `- Secrets in code or logs, injection surfaces, and missing authorization checks`
- **Policy block canonical format** (documented in `security-review/SKILL.md`; read from the target repo's CLAUDE.md / AGENTS.md):
  ```markdown
  ## External model policy
  Allowed providers: anthropic, openai
  Reviewer choices permitted: codex, claude
  ```
  `Allowed providers:` comma list from `anthropic, openai, xai, cursor`, or `any`. `Reviewer choices permitted:` subset of `codex, claude`, or `none`.
- **Provider mapping:** claude-cli → anthropic, codex-cli → openai, grok-cli → xai, cursor-agent → cursor. cross-model-convergence requires every participant's provider allowed.
- **writing-plans template line** — inserted between `**Branch gate:**` and `**Replay/metric evidence:**` in the Verification Strategy template:
  ```
  **Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]
  ```
- **Morning-report placeholder** — `{{policy_status}}` in the External review section; documented values: `policy honored (<providers>)`, `no policy declared — <provider> received the diff`, `refused: <provider> not allowed`.
- **Policy-gate section shape** — each enforcement point gets a short `## Policy Gate` section (H3 `### Policy Gate` where the file's structure demands it) that: names the skill's provider per the mapping, points at `razorback:security-review` for the check procedure, states the no-policy behavior (proceed + loud morning-report note) and the denial behavior (refuse; on an autonomous run where the user chose this provider, stop per blocker taxonomy #4). Reference, not inlined procedure.
- **Gate semantics (fixed by design):** secrets findings always block push/PR; dependency findings block on critical/high, report-only below; `none declared` is allowed but rendered in the morning report.
- No changes to the instruction-tier ruleset host copies, hooks, or version manifests. No version bump in this plan.

## Verification Strategy

**Project source of truth:** `CLAUDE.md` — `npm test` (guard suite) + `./scripts/bump-version.sh --audit`; CI mirrors both.

**Worker red/green scope:** `node --test tests/adversarial-prompt-sync.test.mjs` for Task 5; `node --test tests/claude-cli-docs.test.mjs` additionally for any task touching `skills/claude-cli/SKILL.md` (Task 6); `node --test tests/security-checklist-sync.test.mjs` for Task 2. Content-only tasks with no covering guard verify by re-reading the landed section against this plan's Global Constraints.

**Worker ceiling:** `npm test`.

**Worker gate invariant:** Task 5 — trio guard stays green (proves the three prompts moved together). Task 6 — claude-cli-docs guards stay green (proves no non-canonical `--tools` text entered). Task 2 — new suite passes against landed content AND its negative meta-tests prove each extractor flags a mutated sample (the guard bites).

**Lead affected-change scope:** `npm test` after each batch.

**Branch gate:** `npm test && ./scripts/bump-version.sh --audit`.

**Security scope:** none declared — this repo is prose + guard tests with zero dependencies; adopting scanners for razorback itself is out of this plan's scope. (The lane this plan builds makes that declaration mandatory and visible for future plans.)

**Replay/metric evidence:** not applicable.

**Escalation triggers:** any needed edit to instruction-tier host copies (`rule-copies` guard set), hooks, or manifests is a plan mismatch — stop and report.

**Assigned verification failure:** workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** record invariant, command, scope label, commit SHA, result, timestamp for each worker gate, each batch check, and the branch gate.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: security-review skill | Batch A | Create: `skills/security-review/SKILL.md` | No | None - safe parallel batch. |
| Task 2: checklist sync guard suite | None - serial (after Batch A) | Create: `tests/security-checklist-sync.test.mjs` | Yes | Asserts content landed by Tasks 1, 3, 4, 6, 7 — must run against the finished Batch A tree. |
| Task 3: writing-plans template + handoff validation | Batch A | Modify: `skills/writing-plans/SKILL.md` | No | None - safe parallel batch. |
| Task 4: reviewer checklist copies | Batch A | Modify: `skills/requesting-code-review/code-reviewer.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md` | No | None - safe parallel batch. |
| Task 5: adversarial trio line | Batch A | Modify: `skills/codex-cli/adversarial-prompt.txt`, `skills/claude-cli/adversarial-prompt.txt`, `skills/grok-cli/adversarial-prompt.txt` | No | None - safe parallel batch. |
| Task 6: policy-gate sections | Batch A | Modify: `skills/codex-cli/SKILL.md`, `skills/claude-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/requesting-code-review/SKILL.md` | No | None - safe parallel batch. |
| Task 7: morning report + README | Batch A | Modify: `skills/finishing-a-development-branch/morning-report-template.md`, `README.md` | No | None - safe parallel batch. |

Commit mode: `parallel-lead-commit` — workers hand verified diffs to the lead; the lead commits after inline review (spec compliance + code quality per `razorback:requesting-code-review`).

### Task 1: security-review skill (canonical home)

**Files:**
- Create: `skills/security-review/SKILL.md`

**Interfaces:**
- Consumes: Global Constraints (checklist text, policy block format, provider mapping, gate semantics) — copy verbatim.
- Produces: the canonical skill every other task references. Frontmatter `name: security-review`; `description` triggers on: security review, secrets scan, dependency audit, external-model policy, "can I send this diff to X".

**Contract inputs:** Global Constraints verbatim. Follow existing skill file conventions (frontmatter, Overview, Integration section; see `skills/fixing-small-issues/SKILL.md` for shape).

**File ownership:** Create: `skills/security-review/SKILL.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**What to build:** The lane's canonical skill: both scopes (`security-secrets`, `security-deps`) with named example defaults (`gitleaks detect`; `osv-scanner`, alternates `npm audit`, `pip-audit`, `cargo audit`, `dotnet list package --vulnerable`) and gate semantics; when they run (branch gate, quick-fix tier unaffected); the policy block format, provider mapping, and the numbered check procedure (read block → allowed → proceed / denied → refuse, blocker #4 on autonomous user-chosen provider / absent → proceed + loud note); the canonical `**Security:**` checklist with its copy locations named (mirroring `architecture-quality`'s convention); suppression rule (tool-native baseline/ignore files, each suppression recorded in the morning report); an anti-rationalization table (≥4 rows, e.g. "the diff is tiny, skip the scan" → "secrets ship in one-line diffs").

**Acceptance criteria:**
- [ ] All Global Constraints content present verbatim; copy locations listed; Integration section names the seven enforcement-point skills, `writing-plans`, and `finishing-a-development-branch`.
- [ ] Worker verification: re-read against Global Constraints; hand diff to lead.

### Task 2: checklist sync guard suite

**Files:**
- Create: `tests/security-checklist-sync.test.mjs`

**Interfaces:**
- Consumes: landed content from Tasks 1, 3, 4, 6, 7; the `**Security:**` marker convention; test idioms from `tests/claude-cli-docs.test.mjs` (helpers, meta-test pattern) and `tests/twin-sections.test.mjs` (heading-scoped extraction).
- Produces: CI guard for every security-lane invariant.

**Contract inputs:** Global Constraints strings; marker `**Security:**`; the three checklist homes; the seven enforcement-point files; template line and placeholder strings.

**File ownership:** Create: `tests/security-checklist-sync.test.mjs`
**Serialization required:** Yes
**Dependency reason:** Asserts content landed by Tasks 1, 3, 4, 6, 7 — must run against the finished Batch A tree.

**What to build:** Tests: (a) extract the five lines following `**Security:**` in the three checklist homes, byte-compare to the canonical in `security-review/SKILL.md`; (b) `writing-plans/SKILL.md` contains the exact `**Security scope:**` template line; (c) `morning-report-template.md` contains `{{policy_status}}`; (d) each of the seven enforcement-point files contains a Policy Gate section referencing `razorback:security-review`; (e) `security-review/SKILL.md` contains the policy block, provider mapping, and both scope names; (f) negative meta-tests — the checklist extractor flags a one-character mutation of a sample copy, and the presence checks fail on a sample missing the marker (pattern: the meta-tests in `tests/claude-cli-docs.test.mjs`).

**Acceptance criteria:**
- [ ] Suite passes against the Batch A tree; meta-tests prove detection; `npm test` green.

### Task 3: writing-plans template + handoff validation

**Files:**
- Modify: `skills/writing-plans/SKILL.md` (Verification Strategy template block; Execution Handoff Step 3)

**Interfaces:**
- Consumes: the exact template line from Global Constraints.
- Produces: the `Security scope:` field Task 2 asserts; reviewer-choice validation at handoff.

**Contract inputs:** Insert the template line between `**Branch gate:**` and `**Replay/metric evidence:**`. In Execution Handoff Step 3 (reviewer choice), add: if the target repo declares an External model policy, validate the chosen reviewer against `Reviewer choices permitted` and surface a conflict to the user at approval time instead of proceeding.

**File ownership:** Modify: `skills/writing-plans/SKILL.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] Template line present verbatim; the "silence is not allowed" rule stated (`none declared` must be written explicitly); handoff validation sentence added.

### Task 4: reviewer checklist copies

**Files:**
- Modify: `skills/requesting-code-review/code-reviewer.md` (Review Checklist section)
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

**Interfaces:**
- Consumes: canonical checklist from Global Constraints.
- Produces: the two verbatim copies Task 2 byte-compares.

**Contract inputs:** In `code-reviewer.md`, replace the lone `- Security concerns?` bullet under **Architecture / Interface:** with a new `**Security:**` group carrying the five bullets, placed after the **Architecture / Interface:** group. In `code-quality-reviewer-prompt.md`, add the same `**Security:**` group in its checklist, matching that file's structure. Note near each copy that the canonical lives in `security-review/SKILL.md` (mirroring the architecture-checklist convention).

**File ownership:** Modify: `skills/requesting-code-review/code-reviewer.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [ ] `- Security concerns?` no longer appears; both `**Security:**` groups byte-match the canonical; existing checklist content otherwise untouched.

### Task 5: adversarial trio line

**Files:**
- Modify: `skills/codex-cli/adversarial-prompt.txt`, `skills/claude-cli/adversarial-prompt.txt`, `skills/grok-cli/adversarial-prompt.txt`

**Interfaces:**
- Consumes: the ATTACK SURFACE line from Global Constraints.
- Produces: security-weighted adversarial prompts, still trio-synced.

**Contract inputs:** Append the line as the final bullet of the ATTACK SURFACE section in each file — byte-identical, all three in one change. Touch nothing else in these files.

**File ownership:** Modify: the three `adversarial-prompt.txt` files
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] `node --test tests/adversarial-prompt-sync.test.mjs` passes (trio guard proves sync); the line appears once per file, as the section's final bullet.

### Task 6: policy-gate sections

**Files:**
- Modify: `skills/codex-cli/SKILL.md` (after `## Defaults`, before `## Review Targeting` at ~line 33)
- Modify: `skills/claude-cli/SKILL.md` (after the Defaults block, before `## Review Targeting` at ~line 123)
- Modify: `skills/grok-cli/SKILL.md` (after `## Defaults`, before `## Pre-flight Check` at ~line 66)
- Modify: `skills/cursor-agent/SKILL.md` (after `## Defaults` at ~line 14, before `## Preflight`)
- Modify: `skills/cross-model-convergence/SKILL.md` (before `## Setup (Round 0)` at line 16)
- Modify: `skills/pre-merge-review/SKILL.md` (add to Pre-conditions list + one gate sentence in `## Step 2: Dispatch the chosen reviewer`)
- Modify: `skills/requesting-code-review/SKILL.md` (inside `## Mode 2: Standalone Review` at ~line 37, adjacent to the dispatch table)

**Interfaces:**
- Consumes: the Policy-gate section shape and provider mapping from Global Constraints.
- Produces: the seven references Task 2's presence check asserts.

**Contract inputs:** Section shape from Global Constraints, one provider per skill per the mapping; cross-model-convergence states "every participating model's provider must be allowed"; pre-merge-review and requesting-code-review reference "the dispatched CLI's provider". Reference `razorback:security-review` — do not inline the procedure.

**File ownership:** Modify: the seven SKILL.md files listed above
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [ ] All seven files carry the section with the right provider; `node --test tests/claude-cli-docs.test.mjs` stays green (no non-canonical `--tools` text introduced).

### Task 7: morning report + README

**Files:**
- Modify: `skills/finishing-a-development-branch/morning-report-template.md` (External review section)
- Modify: `README.md` (skill table, after the grok-cli row at ~line 226)

**Interfaces:**
- Consumes: `{{policy_status}}` values from Global Constraints.
- Produces: the placeholder Task 2 asserts; the README row.

**Contract inputs:** Add `- **External-model policy:** {{policy_status}}` to the External review section with an HTML comment listing the three documented values. README row: `| security-review | Security lane: secrets-scan + dependency-audit branch-gate scopes, security review checklist, external-model policy gate |`.

**File ownership:** Modify: `skills/finishing-a-development-branch/morning-report-template.md`, `README.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] Placeholder and README row present; template's comment lists the three values.

## Completion

After Batch A review + commit, Task 2 review + commit, and the branch gate: pre-merge external review per the approved reviewer choice, then `razorback:finishing-a-development-branch` (push, PR, morning report — including this run's own `{{policy_status}}` line, which will read `no policy declared` unless this repo adds a policy block first).
