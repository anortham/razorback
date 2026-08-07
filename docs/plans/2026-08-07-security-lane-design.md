# Security Lane Design

**Status:** Draft for user review (brainstormed 2026-08-07; decisions confirmed via structured Q&A)
**Origin:** 2026-08-07 assessment follow-ups #2 (security lane) and #3 (data governance) — see `docs/plans/2026-08-07-claude-reviewer-allowlist-drift.md` Context section and checkpoint `checkpoint_4aceb150`.

## Why

Razorback's flow has one "Security concerns?" bullet in the review checklist and the adversarial prompts' attack-surface list. Nothing scans secrets or dependencies, and nothing governs which external model providers may receive a diff. For a regulated org (hospital), both gaps block adoption as a code-quality/security convention.

## Confirmed decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | What razorback ships | Process + named default tools. Skills define the scopes and name example tools; each repo's plan declares the real commands (same split as the existing branch gate). |
| 2 | Where the lane runs | All three touchpoints: branch-gate scan scope, review checklists, adversarial prompt trio. |
| 3 | Policy home | A documented policy block in the repo's project instructions (CLAUDE.md / AGENTS.md). |
| 4 | Default without policy | Allow (today's behavior) plus a loud morning-report note naming the provider that received the diff. |

## Design

### 1. New skill: `skills/security-review/SKILL.md`

The lane's home. Contents:

- **Two mechanical scopes** with named defaults:
  - `security-secrets` — whole-tree secrets scan. Example default: `gitleaks detect`. Any finding is a **hard gate**: no push, no PR. False positives are suppressed in the tool's own baseline/ignore mechanism, and each suppression is a judgment call recorded in the morning report.
  - `security-deps` — dependency/CVE audit. Example default: `osv-scanner` (language-neutral); per-ecosystem alternates (`npm audit`, `pip-audit`, `cargo audit`, `dotnet list package --vulnerable`) may be declared instead. **Hard gate on critical/high severity; report-only below**, rendered into the morning report.
- **When they run:** as part of the plan's branch gate, before push/PR. The quick-fix tier is unchanged — it already defers suite-level verification to the branch gate.
- **The external-model policy block**: canonical format, provider mapping, and the check procedure every external-model skill follows (section 4).
- Anti-rationalization table (e.g. "the diff is tiny, skip the scan" → "secrets ship in one-line diffs").

### 2. `writing-plans` Verification Strategy template

Add one required line to the template block:

```markdown
**Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]
```

Silence is not allowed: a plan must either name the commands or write `none declared` explicitly. When declared, the branch gate includes the security scope. `finishing-a-development-branch` renders `none declared` into the morning report's Tests section so the opt-out is visible.

`writing-plans` execution handoff additionally validates the chosen pre-merge reviewer against the policy block (section 4) at plan-approval time, where a human is present.

### 3. Review content

- **`skills/requesting-code-review/code-reviewer.md`:** replace the single "Security concerns?" bullet with a compact security checklist:
  - No secrets, credentials, tokens, or connection strings in the diff?
  - Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
  - Authorization checked on new or changed routes/APIs?
  - New dependencies vetted (source, maintenance, known CVEs)?
  - No sensitive data written to logs or error messages?
- **`skills/subagent-driven-development/code-quality-reviewer-prompt.md`:** the same five questions duplicated **verbatim** (the lead's inline review), following the intentional test-guarded duplication pattern the architecture-quality checklist already uses. The canonical copy lives in `security-review/SKILL.md`; the SKILL.md states the copy locations, mirroring `architecture-quality`'s convention.
- **Adversarial prompt trio** (`skills/{codex,claude,grok}-cli/adversarial-prompt.txt`): add one line to the shared ATTACK SURFACE section, byte-identical in all three:
  `- Secrets in code or logs, injection surfaces, and missing authorization checks`
  The existing trio byte-sync guard (`tests/adversarial-prompt-sync.test.mjs`) automatically enforces the sync; no new test needed for this piece.

### 4. Data-governance gate (external-model policy)

**Canonical block**, documented in `security-review/SKILL.md` and read from the target repo's CLAUDE.md / AGENTS.md:

```markdown
## External model policy
Allowed providers: anthropic, openai
Reviewer choices permitted: codex, claude
```

- `Allowed providers:` a comma list from `anthropic, openai, xai, cursor`, or `any`.
- `Reviewer choices permitted:` a subset of `codex, claude`, or `none`.

**Provider mapping** (documented in the skill): `claude-cli` → anthropic, `codex-cli` → openai, `grok-cli` → xai, `cursor-agent` → cursor. `cross-model-convergence` requires every participating model's provider to be allowed.

**Check procedure** at every enforcement point, before any diff or code content leaves the machine:

1. Read the policy block from the target repo's project instructions.
2. Block present, provider allowed → proceed.
3. Block present, provider not allowed → refuse the dispatch, name an allowed alternative, record the refusal in the morning report. During an autonomous run where the user explicitly chose the disallowed provider (e.g. reviewer choice), this is a **blocker** (taxonomy #4, safety-critical ambiguity): stop, do not push, report — do not silently substitute a different provider.
4. No block → proceed, and add the loud note to the morning report: `no external-model policy declared — diff sent to <provider>`.

**Enforcement points (all get a short "Policy gate" section referencing `razorback:security-review`):** `codex-cli`, `claude-cli`, `grok-cli`, `cursor-agent`, `cross-model-convergence`, `pre-merge-review`, and the `requesting-code-review` Mode 2 dispatch table.

**Morning report:** `finishing-a-development-branch/morning-report-template.md` External review section gains a `{{policy_status}}` placeholder (values: `policy honored (<providers>)`, `no policy declared — <provider> received the diff`, or `refused: <provider> not allowed`).

### 5. Guard tests

- `tests/security-checklist-sync.test.mjs` (new):
  - The five-question security checklist is byte-identical across its canonical home (`security-review/SKILL.md`) and both copies (`code-reviewer.md`, `code-quality-reviewer-prompt.md`) — twin-sections pattern.
  - `writing-plans/SKILL.md` template contains the `**Security scope:**` line.
  - `morning-report-template.md` contains `{{policy_status}}`.
  - `security-review/SKILL.md` contains the canonical policy block, the provider mapping, and both scope definitions.
  - Every enforcement-point skill file contains a policy-gate reference to `razorback:security-review`.
- Existing trio sync guard covers the adversarial prompt line; no change.

## Edge cases and blocker semantics

- **Declared scanner missing/not installed** → branch-gate failure on environmental grounds = blocker taxonomy #1. Stop; do not push.
- **`Security scope: none declared`** → allowed; rendered visibly in the morning report.
- **Policy added or changed mid-run** so the approved reviewer becomes disallowed → blocker taxonomy #4; stop and report (the plan's approval predates the policy).
- **Delegation vs review:** the policy governs *any* external dispatch that carries repo content, including grok/cursor delegation with write sandboxes, not only reviews.

## File inventory

- Create: `skills/security-review/SKILL.md`
- Create: `tests/security-checklist-sync.test.mjs`
- Modify: `skills/writing-plans/SKILL.md` (template line + reviewer-choice validation at handoff)
- Modify: `skills/requesting-code-review/code-reviewer.md` (checklist)
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md` (checklist copy)
- Modify: `skills/codex-cli/adversarial-prompt.txt`, `skills/claude-cli/adversarial-prompt.txt`, `skills/grok-cli/adversarial-prompt.txt` (shared ATTACK SURFACE line, byte-identical)
- Modify: `skills/codex-cli/SKILL.md`, `skills/claude-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/requesting-code-review/SKILL.md` (policy-gate sections)
- Modify: `skills/finishing-a-development-branch/morning-report-template.md` (`{{policy_status}}`)
- Modify: `README.md` (skill table row)

## Acceptance criteria

- [ ] `security-review/SKILL.md` exists with both scopes, gate semantics, the canonical policy block, provider mapping, check procedure, and anti-rationalization table.
- [ ] `writing-plans` template requires an explicit `**Security scope:**` value; reviewer choice validated against policy at handoff.
- [ ] The five-question checklist appears verbatim in all three homes; sync test guards it.
- [ ] The ATTACK SURFACE line appears byte-identically in all three adversarial prompts; existing trio guard passes.
- [ ] All seven enforcement-point skills carry the policy-gate section; presence test guards them.
- [ ] `{{policy_status}}` placeholder present in the morning-report template; presence test guards it.
- [ ] `npm test` green including the new guard suite; `./scripts/bump-version.sh --audit` clean.
- [ ] No change to the instruction-tier ruleset, hooks, or manifests (version bump/release is a separate post-merge action).

## Out of scope (v1)

- Instruction-tier ruleset (Copilot floor) — revisit after the plugin-tier lane proves out.
- Bundled scanner scripts or wrappers.
- CI/DevOps PR-review pipeline template — separate follow-up (#1 in the assessment list).
- Machine-parsed policy file formats.

## Rejected alternatives

- **Env-var-only policy** — no committed audit trail; invisible on dev machines.
- **Default-deny without a policy block** — breaks every existing razorback user and personal-project flow.
- **Dedicated policy file (`.razorback/policy.json`)** — razorback is prose; inventing a parsed format adds a runtime it does not have.
- **Bundled tooling** — breaks the zero-dependency, language-agnostic posture and adds razorback itself as a supply-chain surface.

## Architecture Quality

**Affected modules:** skills only (one new skill, one new test, fifteen files edited); no runtime code.
**Caller-facing interface:** the policy block format, the `Security scope:` template field, the `{{policy_status}}` placeholder, and the checklist canonical-copy locations.
**Depth/locality check:** each enforcement point gets a short reference to the canonical skill, not an inlined copy — the two checklist duplications are the deliberate, test-guarded exceptions.
**Test surface:** guard tests assert the invariants through the same files agents read.
**Rejected shortcuts:** inlining the policy procedure into each of the seven skills (would create seven drift sites — the exact failure class fixed in PR #8).
**Architecture risk:** low-medium — breadth of copies, mitigated by sync/presence guards.
