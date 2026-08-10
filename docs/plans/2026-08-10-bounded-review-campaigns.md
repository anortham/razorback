# Bounded Review Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Add a universal review-campaign contract that keeps individual reviewer invocations deep while hard-capping repeated discovery, confirmation rounds, and total external invocations across one-, two-, and multi-model setups.

**Architecture:** Create `razorback:managing-review-campaigns` as the canonical campaign interface. Reviewer CLI skills remain provider-specific invocation adapters; convergence, pre-merge, and execution skills consume workflow profiles from the campaign contract without loosening their existing stricter rules. Guard tests assert the same skill surfaces agents load, and pressure tests validate behavior under autonomy and sunk-cost pressure.

**Tech Stack:** Markdown skills, Node.js `node:test` guard suite, Goldfish checkpoints, Miller workspace index.

**Architecture Quality:** New deep process module with immutable setup/status vocabulary; medium risk because autonomous termination behavior spans reviewer and execution entry points. The test surface is the skill text and status blocks agents consume.

## Global Constraints

- Reviewer CLI recipes remain free of `--max-turns`, `--max-budget-usd`, and shortened timeout caps.
- “Uncapped review” always means one invocation only; it never waives the campaign round or external-invocation budget.
- Participant count is fixed at campaign setup. Extra participants never add rounds.
- Ordinary review may complete as `lead-only`; explicit user/repo/plan reviewer requirements still block when unavailable.
- Canonical severity is `critical | high | medium | low`, assigned by the lead for campaign control.
- Round 1 is discovery; Round 2 is accepted-findings plus fix-diff confirmation; Round 3 is targeted only to a lead-verified critical/high fix regression.
- Reviewer disagreement cannot open Round 3. One evidence push-back cycle ends in a recorded dispute.
- Pre-merge review remains one general plus one security external pass, with post-fix verification local.
- Every external CLI call counts against an immutable integer budget that survives compaction and goal continuation.
- Terminal states are `clean | capped | blocked`, and every emitted status includes `campaign_closed: yes`.
- Do not change provider-specific adversarial prompts or the shared review JSON schema.
- No external pre-merge reviewer is selected for this implementation plan (`reviewer_choice: none`).

## Verification Strategy

**Project source of truth:** Root `AGENTS.md`, `package.json`, `.github/workflows/test.yml`, and `.version-bump.json`.

**Worker red/green scope:** Run the exact focused `node --test <owned-test-file>` command named by each task. Each new guard must be observed failing for the missing campaign behavior before the owned skill text changes.

**Worker ceiling:** Owned focused test files only. Workers do not run `npm test`, version audit, or unrelated suites.

**Worker gate invariant:** Focused guards prove the canonical campaign interface, reviewer CLI boundary wording, or workflow integration assigned to that task.

**Lead affected-change scope:** `node --test tests/managing-review-campaigns.test.mjs tests/reviewer-uncapped.test.mjs tests/review-campaign-integration.test.mjs` after the parallel integration batch and after any loophole fix.

**Branch gate:** `npm test`, then `git diff --check`, then `./scripts/bump-version.sh --audit`.

**Security scope:** none declared.

**Replay/metric evidence:** Pressure scenarios are hard gates: one-model ordinary review closes honestly; explicit cross-model absence blocks; two- and three-model campaigns stop at immutable round/invocation caps; severity inflation, participant loss, and counter-reset attempts cannot extend a campaign.

**Escalation triggers:** Any change to shared adversarial prompts, review JSON schema, hook/bootstrap copies, provider command flags, or manifest versions requires the corresponding specialist guard suite in addition to the branch gate.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp. For pressure evidence, also record scenario, availability shape, chosen terminal state, and exact rationalization. Reuse passing evidence only for the same HEAD.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Canonical campaign contract | None - serial | Create `skills/managing-review-campaigns/SKILL.md`; create `tests/managing-review-campaigns.test.mjs`; modify `README.md` | Yes | Risk-first contract must be green before callers integrate it. |
| Task 2: Reviewer CLI boundary | Batch A | Modify `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `tests/reviewer-uncapped.test.mjs` | No | None - safe parallel batch after Task 1. |
| Task 3: Workflow integration | Batch A | Modify `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `skills/subagent-driven-development/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/finishing-a-development-branch/morning-report-template.md`; create `tests/review-campaign-integration.test.mjs` | No | None - safe parallel batch after Task 1. |
| Task 4: Pressure validation and loophole closure | None - serial | May modify every Task 1-3 owned skill/test file; modify this plan and its digest for final status | Yes | Requires the complete integrated behavior and runs after Batch A. |

### Task 1: Canonical campaign contract

**Files:**
- Create: `skills/managing-review-campaigns/SKILL.md`
- Create: `tests/managing-review-campaigns.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: canonical review severity from `skills/codex-cli/schemas/review-output.schema.json`; blocker semantics from `razorback:using-razorback`; evidence evaluation from `razorback:receiving-code-review`.
- Produces: immutable `REVIEW CAMPAIGN` setup, round definitions, evidence labels, external-invocation budget, closure record, and `REVIEW CAMPAIGN STATUS` terminal block.

**Contract inputs:** Global Constraints and the approved design at `docs/plans/2026-08-10-bounded-review-campaigns-design.md`.

**File ownership:** Create `skills/managing-review-campaigns/SKILL.md`; create `tests/managing-review-campaigns.test.mjs`; modify `README.md`.

**Serialization required:** Yes.

**Dependency reason:** Risk-first contract must be green before callers integrate it.

**What to build:** Write a concise discipline-enforcing skill triggered by repeated reviews, multiple reviewers, and clean-only goal runners. Define model-count-neutral availability behavior, immutable setup, three bounded rounds, invocation budgets, lead-owned severity and closure evidence, terminal states, anti-rationalization entries, and red flags. Add the skill to the README table.

**Approach:** Start with guards for the exact setup/status fields, evidence labels, Round 3 objective trigger, explicit reviewer blocker, and “extra reviewers never add rounds” invariant. Keep workflow-specific defaults out of the canonical skill except for a compact profile table; callers own stricter profiles.

**Acceptance criteria:**
- [x] Focused tests fail before the skill exists and pass after the minimal contract is written.
- [x] Ordinary lead-only review and explicit cross-model unavailability are both represented without contradiction.
- [x] The campaign skill distinguishes rounds from actual external-invocation count.
- [x] The skill contains an observed-rationalization table and red flags for “one more review,” severity inflation, majority vote, and counter reset.
- [x] README lists `managing-review-campaigns` with a concise purpose.
- [x] Worker-scope verification passes and the task is committed with `serial-worker-commit`.

### Task 2: Reviewer CLI boundary

**Files:**
- Modify: `skills/claude-cli/SKILL.md`
- Modify: `skills/codex-cli/SKILL.md`
- Modify: `skills/grok-cli/SKILL.md`
- Modify: `tests/reviewer-uncapped.test.mjs`

**Interfaces:**
- Consumes: `razorback:managing-review-campaigns` trigger and immutable external-invocation budget.
- Produces: provider-neutral wording that preserves uncapped invocation depth while requiring the campaign skill before repeats or multi-reviewer orchestration.

**Contract inputs:** Task 1 campaign skill; existing validated provider commands and 30-minute failsafe wording remain unchanged.

**File ownership:** Modify `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `tests/reviewer-uncapped.test.mjs`.

**Serialization required:** No.

**Dependency reason:** None - safe parallel batch after Task 1.

**What to build:** Replace ambiguous “No caps in review recipes” language with “No per-invocation turn/spend caps” in all three CLI skills. State that every CLI call counts against its caller’s campaign and that a second or multi-reviewer call requires the canonical campaign skill.

**Approach:** Extend the existing uncapped reviewer tests first. Preserve every command flag and timeout invariant; change only policy boundary wording and repeat-review routing.

**Acceptance criteria:**
- [x] Focused tests fail on current ambiguous wording and pass after all three skills align.
- [x] No recipe passes a turn or spend cap; all retain the 30-minute failsafe.
- [x] Each CLI skill routes repeated or multi-reviewer review through `razorback:managing-review-campaigns`.
- [x] Each CLI skill says one internally uncapped invocation does not waive the campaign budget.
- [x] Worker-scope verification passes; worker uses `parallel-lead-commit` and does not commit.

### Task 3: Workflow integration

**Files:**
- Modify: `skills/cross-model-convergence/SKILL.md`
- Modify: `skills/pre-merge-review/SKILL.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/claude.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/finishing-a-development-branch/morning-report-template.md`
- Create: `tests/review-campaign-integration.test.mjs`

**Interfaces:**
- Consumes: Task 1 setup/status vocabulary, workflow profiles, invocation counter, evidence labels, and terminal states.
- Produces: convergence campaign setup and cap; pre-merge two-invocation accounting; execution-state checkpoint propagation; morning-report campaign evidence.

**Contract inputs:** Task 1 campaign skill; pre-merge must retain exactly one general plus one security pass; SDD’s four-attempt scoped inline fix loop remains separate.

**File ownership:** Modify `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `skills/subagent-driven-development/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/finishing-a-development-branch/morning-report-template.md`; create `tests/review-campaign-integration.test.mjs`.

**Serialization required:** No.

**Dependency reason:** None - safe parallel batch after Task 1.

**What to build:** Make all broad/external review entry points consume the campaign contract. Cross-model convergence uses at most three rounds, runs every selected reviewer once in discovery, and declares an immutable budget of selected external reviewers plus one optional confirmer; pre-merge counts its two existing passes but does not add retries or external post-fix review; execution checkpoints carry counters across compaction; reports show terminal state, evidence label, rounds, and invocations.

**Approach:** Write focused integration guards first. Preserve existing twin-section and pre-merge single-pass invariants. Do not route routine SDD scoped fix re-review through the campaign unless it reopens broad discovery or dispatches an external reviewer.

**Acceptance criteria:**
- [x] Focused tests fail before integration and pass afterward.
- [x] Cross-model convergence cannot exceed three rounds or grow participants/budget mid-campaign.
- [x] Cross-model still blocks without a distinct reviewer when explicitly requested.
- [x] Pre-merge still runs general and security once each and verifies fixes locally.
- [x] Execution checkpoints and goal predicates preserve and terminate on campaign state.
- [x] Morning report exposes state, evidence label, round count, invocation count, and open severities.
- [x] Worker-scope verification passes; worker uses `parallel-lead-commit` and does not commit.

### Task 4: Pressure validation and loophole closure

**Files:**
- Modify if required: every Task 1-3 owned skill/test file
- Modify: `docs/plans/2026-08-10-bounded-review-campaigns.md`
- Modify: `docs/plans/2026-08-10-bounded-review-campaigns.html`

**Interfaces:**
- Consumes: integrated campaign behavior and the RED pressure scenarios recorded in Goldfish.
- Produces: GREEN pressure evidence, any observed-rationalization counters, final verification ledger, and completed plan status.

**Contract inputs:** Run fresh agents with raw scenarios only; do not leak the intended answer or prior diagnosis. Scenarios remain read-only.

**File ownership:** May modify every Task 1-3 owned skill/test file; modify this plan and its digest for final status.

**Serialization required:** Yes.

**Dependency reason:** Requires the complete integrated behavior and runs after Batch A.

**What to build:** Re-run one-, two-, and three-model pressure scenarios against the revised skills, plus severity-inflation, optional-participant-loss, and compaction-counter-reset cases. If a fresh agent finds a loophole, add the smallest explicit counter and deterministic guard, then re-run until compliant.

**Approach:** The lead dispatches fresh read-only validation agents. Closure requires correct terminal state, evidence label, immutable counters, and no invented quorum or extra reviewer call. After GREEN pressure evidence, run affected-change and branch gates and update plan/digest status.

**Acceptance criteria:**
- [ ] One-model ordinary review closes as `lead-only`; explicit cross-model absence blocks.
- [ ] Two- and three-model campaigns stop at the declared round and invocation caps.
- [ ] Severity inflation, reviewer disagreement, optional participant loss, and counter-reset attempts do not extend the campaign.
- [ ] Any new rationalization is countered in the skill and locked by a deterministic test.
- [ ] Lead affected-change scope passes on the integrated HEAD.
- [ ] `npm test`, `git diff --check`, and `./scripts/bump-version.sh --audit` pass.
- [ ] Plan and digest show completed status and the verification ledger is checkpointed.
- [ ] Task changes are committed with `serial-worker-commit` after checkpointing.
