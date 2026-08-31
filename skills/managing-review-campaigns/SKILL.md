---
name: managing-review-campaigns
description: Use when a review may repeat after fixes, multiple reviewers or model CLIs participate, or an unattended goal requires a clean review.
---

# Managing Review Campaigns

## Overview

A reviewer invocation may run deeply, but the campaign around it must end. Rounds and total external reviewer invocations are hard-capped; the lead closes the campaign from recorded code and test evidence.

**REQUIRED SUB-SKILL:** Use razorback:receiving-code-review to verify findings before accepting them. Apply the blocker semantics from razorback:using-razorback.

## Start Once

Before the first review invocation, emit this immutable setup:

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

Setup fields are immutable; `round` and `external_invocations` counters only increase. Participants and budgets cannot grow mid-campaign. Each external CLI call counts as one external invocation, including separate general and security passes. There are no per-invocation turn/spend caps; that does not relax the campaign budget. Persist the setup and counters through compaction and continuation.

## Availability and Evidence

The lead always participates. Select others only when available, policy-allowed, and budgeted.

| Available evidence | Label | Rule |
|---|---|---|
| Lead only | `lead-only` | Ordinary review may complete; explicit external or cross-model requirements cannot. |
| Fresh isolated same-model session | `fresh-session` | Adds context independence; never reported as cross-model. |
| Lead plus external reviewer | `external-reviewed` | Adds independent evidence within the fixed campaign. |
| Lead plus a real different-model reviewer | `cross-model-reviewed` | Satisfies an explicit cross-model requirement. |

A reviewer is explicit when named by the user, required by repo instructions, or recorded in the approved plan. An explicit reviewer that is unavailable before completing its required discovery scope blocks. A required reviewer obligation is satisfied once usable evidence covers every declared required discovery scope. Failure of an optional confirmation after that point does not retroactively block; count the call when dispatched, do not retry or replace it, and let the lead confirm. An unavailable optional participant is omitted and recorded before setup. An optional participant lost mid-campaign is not retried or replaced; use the strongest evidence label already earned and continue within the original budget.

## Bounded Rounds

### Round 1 — discovery

- Review the declared scope broadly; each selected reviewer runs at most once per discovery scope.
- Verify and deduplicate findings, then the lead assigns `critical`, `high`, `medium`, or `low`.
- Freeze the accepted finding set after triage.

### Round 2 — scoped confirmation

- Mark every accepted finding `addressed`, `not addressed`, `contested`, or `deferred`.
- Inspect only the fix diff for new breakage. Observations outside the fix diff are recorded and cannot extend the campaign. A new medium/low observation may be fixed or deferred but cannot authorize another external sweep.
- A deferred finding at or above the severity floor remains open. A finding stops counting as open only when addressed, dismissed from evidence, or recorded outside the approved campaign scope.
- The lead confirms by default. At most one predeclared external confirmer may make one targeted invocation.

### Round 3 — exceptional targeted confirmation

Enter only when the lead verifies a new critical/high regression introduced inside the fix diff. Target only that regression and its fix; broad discovery is forbidden. Use at most one confirmer, or let the lead confirm when none is available. Reviewer disagreement is not a trigger. Push back once on the evidence, record any dispute, and stop after Round 3 regardless of outcome.

Extra reviewers never add rounds. They add Round 1 evidence and consume the predeclared invocation budget.

## Workflow Profiles

| Workflow | Discovery | Confirmation | Default external budget | Max rounds |
|---|---|---|---:|---:|
| Ordinary lead-only | Lead sweep | Lead | 0 | 2 |
| Standalone external | One selected reviewer | Lead | 1 | 2 |
| Standalone Grok completion | One selected reviewer | Lead | 2 | 2 |
| Pre-merge | General plus security once | Lead | 2 | 2 |
| Cross-model convergence | Selected reviewers once | At most one targeted external confirmer | selected reviewers + 1 | 3 |
| Exceptional regression | None | One targeted confirmer | +1 only when predeclared | 1 |

Callers may choose a stricter profile, never a looser one.

### Completion-aware Grok standalone calls

The Grok standalone completion profile spends both invocations on one review,
because Grok cannot review and emit the schema in the same call. Constrained by
`--json-schema`, it answers on its first turn with no tool use and no findings.
So invocation 1/2 is the free-form review and invocation 2/2 is the structuring
pass, which resumes the session the first call named with `--session-id` and
asks only for the schema. Both are required; neither is a retry, and the pair
buys no extra discovery. A resume that finds no session exits non-zero and
closes the campaign there. No third call is allowed. A rejected structured
result closes the campaign `blocked` or `capped` with the counters recorded at
`2/2`.

A review pass that returns after one turn inspected nothing. Treat it as a
failed invocation, not as evidence.

Sandbox startup failure creates no session and therefore cannot use the
structuring pass. The caller must close that campaign. `--sandbox read-only` and
`--sandbox strict` refuse to start where a container-runtime deny path cannot be
resolved; `--sandbox workspace` with a `Read,Grep,Glob` tool allowlist is the
supported recovery, and `--sandbox off` needs explicit user approval. `grok
inspect` is configuration output, not a sandbox capability probe.

## Close on Evidence

Canonical severity comes from `skills/codex-cli/schemas/review-output.schema.json`: `critical`, `high`, `medium`, or `low`. For every accepted finding, record its classification and canonical severity; file:line or symbol evidence; `red-to-green test`, `existing covering test`, or `inspection-only`; and the fix, dismissal, dispute, or deferral reason. Green tests on an uncovered path are inspection-only. Majority vote may raise confidence but cannot override code evidence, scope, or the campaign budget.

Terminal states are `clean` when nothing above the floor remains open in scope, `capped` when the maximum round ends or no permitted action remains while an above-floor finding is open, and `blocked` when a required discovery obligation cannot be satisfied or an unresolved critical/high finding meets the blocker taxonomy. An exhausted external budget stops external dispatch but does not prevent an already-permitted lead-only confirmation. Emit this block for every terminal state:

```text
REVIEW CAMPAIGN STATUS
state: clean | capped | blocked
evidence: lead-only | fresh-session | external-reviewed | cross-model-reviewed
round: 2/2
external_invocations: 3/3
open_critical_high: 0
open_medium_low: 2
open_above_floor: 1
campaign_closed: yes
```

`clean`, `capped`, and `blocked` are all terminal. Goal runners must treat `campaign_closed: yes` as terminal, even with remaining findings.

## Observed Rationalizations

| Excuse | Reality |
|---|---|
| “One more pair or review will probably be clean.” | The budget is a hard stop; close as `capped`. |
| “Inflate severity so this qualifies for Round 3.” | The lead verifies severity from code evidence; reviewer labels cannot buy a round. |
| “The majority vote says it is fixed.” | Model agreement is evidence, not closure authority. |
| “Reset the counters after compaction or continuation.” | Setup and counters are immutable campaign state. |

## Red Flags

- Dispatching beyond the declared external budget
- Reopening broad discovery in Round 2 or Round 3
- Adding rounds because more reviewers are available
- Letting a reviewer assign the campaign's canonical severity
- Resetting setup or counters after context loss
- Continuing after `campaign_closed: yes`; it is terminal

Any red flag means stop dispatching and emit the terminal status.
