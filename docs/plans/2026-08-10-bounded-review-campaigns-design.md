# Bounded Review Campaigns Design

**Date:** 2026-08-10
**Status:** Approved in conversation; pending written-spec review
**Origin:** A plan-completion run executed 26 pairs of Claude CLI and Grok CLI reviews and stopped only after manual intervention.

## Why

Razorback 0.29.0 deliberately removed turn and spend caps from each reviewer invocation so a useful review is not truncated. That change did not authorize repeated invocations: `pre-merge-review` already forbids external re-review, and `cross-model-convergence` already has a round cap. The boundary is nevertheless too local and too easy to misread. Reviewer CLI skills say “no caps,” while the campaign-level stopping rules live only in selected orchestrators.

Razorback needs one universal contract that keeps each invocation deep while making the surrounding campaign finite. It must work when the lead has no other model, one external model, or several external models.

## Confirmed decisions

| # | Decision | Ruling |
|---|----------|--------|
| 1 | Invocation versus campaign | Reviewer turns and spend remain uncapped inside one invocation. Rounds and total reviewer invocations are hard-capped outside it. |
| 2 | Model availability | One model is sufficient for ordinary review. Extra models add evidence inside the same campaign; they never add rounds. |
| 3 | Closure authority | The lead closes the campaign from recorded code and test evidence. Reviewer voting does not decide. |
| 4 | Round shape | One discovery round, one scoped confirmation round, and one exceptional targeted round only for a lead-verified critical/high fix regression. |
| 5 | Explicit reviewer requirements | A reviewer required by the user, repo policy, or approved plan remains a blocker when unavailable. Razorback never silently downgrades an explicit requirement. |
| 6 | Evidence honesty | Lead-only, fresh-session, external-reviewed, and cross-model-reviewed results are labeled differently. A one-model result is never called cross-model convergence. |

## Baseline evidence

Three pressure scenarios were run against the current skills before designing the change:

- **One model:** the agent blocked because `cross-model-convergence` requires a different-model reviewer. This is correct for an explicit cross-model request but too restrictive as a universal review policy.
- **Two models:** the agent stopped at the existing four-round convergence cap and rejected a fifth review.
- **Three models:** the agent stopped at the cap, rejected majority voting, and treated reviewer disagreement as evidence to adjudicate.

The existing cap works when the correct skill is loaded. The missing behavior is a universal trigger and a model-count-neutral contract.

## Design

### 1. Canonical campaign skill

Create `skills/managing-review-campaigns/SKILL.md` as the canonical home for repeated-review closure. Its description triggers when:

- a review is about to be repeated after fixes;
- multiple reviewers or model CLIs are participating;
- an unattended goal requires a clean review;
- a lead is considering another broad sweep because the last sweep found something.

The skill is a process module, not another reviewer. It owns campaign setup, budgets, round semantics, evidence labels, and terminal states. Reviewer CLI skills retain invocation mechanics. `cross-model-convergence`, `pre-merge-review`, and plan execution retain their specialized scopes but consume the campaign contract.

Standard per-task inline review stays under `subagent-driven-development` and its existing four-attempt fix cap. It becomes a review campaign only when the lead reopens broad discovery or dispatches external reviewers.

### 2. Campaign setup

Before the first review invocation, record immutable setup:

```text
REVIEW CAMPAIGN
scope: <problem class and change range>
workflow: ordinary | pre-merge | convergence
participants: <lead and selected reviewers>
required_reviewers: <names or none>
evidence_target: lead-only | fresh-session | external-reviewed | cross-model-reviewed
severity_floor: <default medium>
discovery_scopes: <named scopes>
external_invocation_budget: <integer>
max_rounds: <1-3>
round: 0/<max>
external_invocations: 0/<budget>
```

Participants and budgets cannot grow mid-campaign. Each CLI call counts as one external invocation, including separate general and security passes. Removing `--max-turns` does not remove this budget.

### 3. Availability and evidence labels

The lead always participates. Other participants are selected only when available, policy-allowed, and within the declared budget.

| Available evidence | Label | Behavior |
|---|---|---|
| Lead only | `lead-only` | Lead performs discovery and confirmation. Ordinary review may complete; explicit external/cross-model requirements cannot. |
| Fresh isolated session of the same model | `fresh-session` | Adds context independence, not model independence. Never reported as cross-model. |
| Lead plus one external reviewer | `external-reviewed` | Reviewer adds independent evidence within the same fixed rounds. |
| Lead plus a different-model reviewer | `cross-model-reviewed` | Satisfies cross-model evidence requirements when the provider/model distinction is real. |

An explicit reviewer requirement exists when the reviewer is named by the user for the run, required by repo instructions, or recorded as the approved plan reviewer. Its unavailability blocks. An optional participant unavailable before the campaign is omitted and recorded. An optional participant lost mid-campaign is not retried or replaced; the evidence label is degraded and the campaign continues within its original budget.

### 4. Round semantics

#### Round 1 — discovery

- Review the approved scope broadly.
- Each selected external reviewer runs at most once per declared discovery scope.
- Verify and deduplicate findings before accepting them.
- The lead assigns canonical severity: `critical`, `high`, `medium`, or `low`.
- Freeze the accepted finding set after triage.

#### Round 2 — scoped confirmation

- Verify every accepted finding as `addressed`, `not addressed`, `contested`, or `deferred`.
- Inspect the fix diff only for new breakage. The fix base and current head define the boundary.
- Observations outside the fix diff are recorded and cannot extend the campaign.
- A new medium/low observation may be fixed or deferred, but it cannot authorize another external sweep.
- The lead performs confirmation by default. At most one predeclared external confirmer may run one targeted invocation.

#### Round 3 — exceptional targeted confirmation

- Enter only when the lead verifies a new critical/high regression introduced inside the fix diff.
- Target only that regression and its fix. Broad discovery is forbidden.
- Use at most one confirmer. With no external model, the lead confirms on the record.
- Reviewer disagreement is not a trigger. Use one evidence push-back cycle, then record the dispute.
- Stop after the round regardless of outcome.

### 5. Invocation budgets by workflow

Rounds are a ceiling, not mandatory work. Each workflow may use a stricter profile.

| Workflow | Discovery | Confirmation | Default external budget |
|---|---|---|---:|
| Ordinary lead-only review | One lead sweep | Lead verifies fixes | 0 |
| Standalone external review | One selected reviewer | Lead verifies fixes | 1 |
| Pre-merge review | Existing general + security passes once | Lead verifies fixes locally | 2 |
| Cross-model convergence | All selected reviewers once | At most one targeted external confirmer | selected reviewers + 1 |
| Exceptional regression | No discovery | One targeted confirmer only | +1 only when predeclared |

Multiple reviewers increase Round 1 evidence and the declared integer budget. They do not multiply later rounds. A Claude+Grok campaign therefore runs both once in discovery, then designates at most one external confirmer; it does not run pairs repeatedly.

### 6. Closure on the record

The lead closes each accepted finding with:

- classification and canonical severity;
- file:line or symbol evidence;
- `red-to-green test`, `existing covering test`, or `inspection-only` evidence type;
- fix, dismissal, dispute, or deferral reason.

Tests alone are not a universal closer: green tests on an uncovered path are recorded as inspection-only unless a relevant red-to-green or covering test exists. Majority vote may raise confidence but cannot override code evidence, scope, or the campaign budget.

Campaign terminal states:

- `clean` — no accepted finding above the floor remains open within scope;
- `capped` — the round or invocation budget is exhausted; emit the final status with remaining findings;
- `blocked` — an explicit reviewer is unavailable, or an unresolved critical/high finding meets the blocker taxonomy.

At every terminal state, emit:

```text
REVIEW CAMPAIGN STATUS
state: clean | capped | blocked
evidence: lead-only | fresh-session | external-reviewed | cross-model-reviewed
round: 2/2
external_invocations: 3/3
open_critical_high: 0
open_medium_low: 2
campaign_closed: yes
```

Goal runners must treat `campaign_closed: yes` as terminal. A success-only “all reviewers clean” predicate is invalid because it can loop forever.

### 7. Skill integration

- **Reviewer CLI skills:** replace ambiguous “no caps” wording with “no per-invocation turn/spend caps”; require `managing-review-campaigns` before any repeated or multi-reviewer dispatch.
- **Cross-model convergence:** consume the universal setup/status format; reduce the default discovery ceiling to the approved campaign profile; preserve the distinct-model requirement only for explicit cross-model work.
- **Pre-merge review:** keep general and security passes single-run; count both invocations; keep post-fix verification local.
- **Subagent-driven development:** retain its scoped fix loop; point broad/external re-review to the campaign skill.
- **Executing plans and goal integration:** carry the immutable campaign state through Goldfish checkpoints so compaction cannot reset counters.
- **Morning report:** show terminal state, evidence label, rounds, invocation count, and remaining findings.

### 8. Guard and pressure tests

Add deterministic tests that require:

- every reviewer CLI skill to distinguish per-invocation caps from campaign caps;
- every repeat-review entry point to reference the canonical campaign skill;
- pre-merge review to retain its one general + one security invocation contract;
- convergence status to include both round and external-invocation counters;
- goal predicates to terminate on clean, capped, or blocked state;
- evidence labels and canonical severities to stay synchronized.

Re-run the one-, two-, and three-model pressure scenarios with the revised skill. Add combined-pressure cases for:

- “one more pair will probably be clean” at the cap;
- a reviewer inflating severity to buy Round 3;
- losing an optional reviewer mid-campaign;
- trying to call lead-only review cross-model convergence;
- trying to reset counters after compaction or a goal-driver continuation.

## Architecture Quality

**Affected modules:** one new campaign skill; reviewer CLI skills; convergence, pre-merge, execution, reporting, and guard tests.
**Caller-facing interface:** immutable campaign setup, canonical severity, evidence labels, invocation counter, and terminal status block.
**Depth/locality check:** campaign policy lives in one skill; callers retain only their workflow profile and invocation mechanics.
**Test surface:** guard tests read the same skills agents load, and pressure tests exercise one-, two-, and three-model decisions under autonomy pressure.
**Seams/adapters:** reviewer CLI skills adapt provider-specific invocations into one campaign counter; existing workflow-specific severity terms map at the campaign boundary.
**Rejected shortcuts:** majority voting, severity-only stopping without a hard cap, a universal three-round requirement that loosens pre-merge review, and duplicating the full policy across every CLI skill.
**Architecture risk:** medium — the contract spans several process entry points and changes autonomous termination behavior, but leaves reviewer invocation mechanics unchanged.

## File inventory

- Create: `skills/managing-review-campaigns/SKILL.md`
- Modify: `skills/cross-model-convergence/SKILL.md`
- Modify: `skills/pre-merge-review/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/claude-cli/SKILL.md`
- Modify: `skills/codex-cli/SKILL.md`
- Modify: `skills/grok-cli/SKILL.md`
- Modify: `skills/finishing-a-development-branch/morning-report-template.md`
- Modify or create focused guard tests under `tests/`

## Acceptance criteria

- [ ] Ordinary review can complete with only the lead, labeled `lead-only`.
- [ ] Explicit external or cross-model requirements still block when unavailable.
- [ ] One discovery round, one scoped confirmation round, and the objective Round 3 exception are enforced.
- [ ] Round 3 requires a lead-verified critical/high fix regression; reviewer labels or disputes cannot buy it.
- [ ] Every external CLI call increments an immutable predeclared budget.
- [ ] Extra reviewers never add rounds, and later rounds use at most one external confirmer.
- [ ] Pre-merge review remains exactly one general plus one security pass, with local post-fix verification.
- [ ] Reviewer CLI recipes remain internally uncapped and explicitly distinguish that from campaign repetition.
- [ ] Goal runners terminate on `clean`, `capped`, or `blocked`, including after compaction/resumption.
- [ ] Closure records evidence type and reasons for every accepted finding.
- [ ] One-, two-, and three-model pressure tests comply under combined pressure.
- [ ] Focused guard tests, `npm test`, `git diff --check`, and version audit pass.

## Out of scope

- Reintroducing `--max-turns`, spend caps, or shorter process timeouts.
- Requiring users to install multiple model CLIs.
- Treating model majority as proof of correctness.
- Changing provider-specific reviewer prompts or shared review JSON schema.
- Push, release, or publication.

## Rejected alternatives

- **Hard round cap only:** does not bound a round that fans out across reviewers and pass types.
- **Severity/stagnation stop only:** reviewers can keep inventing medium findings or inflate severity; no deterministic terminal state.
- **Three-model final vote:** correlated model opinions are not ground truth, and most users do not have three providers available.
- **Lead fills every role but calls it convergence:** hides the loss of independent evidence.
- **Uniform three external rounds for every workflow:** would loosen pre-merge review and multiply its general/security cost.
- **Restore per-invocation limits:** truncates the useful review and does not prevent the orchestrator from starting another invocation.
