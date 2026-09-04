---
name: cross-model-convergence
description: >-
  Use when the user wants two models to check each other's work until clean — "have codex verify my findings and find more", "go back and forth until clean", "loop until you both agree there are no problems left" — when an audit should run to convergence under /loop or another goal-driven runner, or when a design decision needs adversarial challenge before building: "doubt this", "challenge this decision", or architecture risk rated medium/high.
---

# Cross-Model Convergence

## Overview

The lead and every selected external reviewer gather independent evidence in a bounded review campaign. At least one reviewer must be a different model from the lead, and every call reported as cross-model evidence must come from a different model. Calling your own model's CLI is self-review and cannot satisfy an explicit cross-model requirement.

**Core principle:** The setup block is immutable — participants, budget, and rounds are fixed before the first dispatch, and every terminal state closes the campaign for good.

**Violating the letter of the campaign contract is violating its spirit.**

**Announce at start:** "I'm using the cross-model-convergence skill with [selected reviewers] on [problem class]."

## When to Use

Use when the user asks two or more models to check each other's work to a stated end state, when an audit runs to convergence under `/loop` or another goal-driven runner, or when a design decision needs one adversarial refutation pass before building (the Doubt Pass below).

**Not here:** planned pre-merge external review — `razorback:pre-merge-review` owns that fixed two-pass budget. A single ad-hoc review with no convergence goal is `razorback:requesting-code-review`.

**REQUIRED SUB-SKILLS:** razorback:managing-review-campaigns, razorback:architecture-quality (Audit Mode), one or more reviewer channels (razorback:codex-cli, razorback:claude-cli, razorback:grok-cli, or razorback:cursor-agent in read-only mode) pointing at models that differ from the lead, razorback:receiving-code-review, razorback:test-driven-development, razorback:verification-before-completion.

## Policy Gate

Every participating model's provider must be allowed by the external-model policy check in razorback:security-review. Check every selected provider before campaign setup. No policy block in the target repo's instructions means proceed and add the loud note to the morning report. A denied reviewer named by the user or approved plan blocks under blocker taxonomy #4.

## Outbound Payload Redaction

Immediately before each participating reviewer dispatch, write the fully constructed campaign prompt to `PAYLOAD_FILE` and pass it through `skills/security-review/scripts/redact-outbound`. Use only `REDACTED_PAYLOAD_FILE` for the reviewer invocation. If redaction fails, remove both files, emit only a generic error, and stop before any provider receives campaign content.

Each harness-native reviewer call must receive the contents of `REDACTED_PAYLOAD_FILE`; do not pass the original findings, diff, or campaign prompt directly to a reviewer channel.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

## Campaign Setup

Select the different-model reviewers explicitly requested or deliberately chosen for this campaign before the first sweep. Availability and policy are gates, not reasons to enroll every installed model. Users may run with one selected external reviewer or several. Omit unavailable optional reviewers before setup and record the omission. A reviewer named by the user or approved plan is required; if unavailable, emit a `blocked` campaign status instead of substituting another model or degrading to same-model review.

When no different-model reviewer is available before setup, emit one auditable zero-call record instead of inventing a participant: the canonical setup block below with `participants: lead`, `required_reviewers: at least one different-model reviewer (unavailable)`, `external_invocation_budget: 0`, and `external_invocations: 0/0`, immediately followed by the terminal status block with `state: blocked`, `evidence: lead-only`, zero open counts, and `campaign_closed: yes`.

Do not start another campaign automatically if availability changes; a new campaign requires a new explicit user request.

Emit this immutable setup once:

```text
REVIEW CAMPAIGN
scope: <problem class and approved change range>
workflow: convergence
participants: lead, <selected different-model reviewers>
required_reviewers: <explicitly required selected reviewers or none>
evidence_target: cross-model-reviewed
severity_floor: <default medium>
discovery_scopes: <problem class>
external_invocation_budget: <selected external reviewers + 1>
max_rounds: 3
round: 0/3
external_invocations: 0/<budget>
```

Replace the budget placeholders with integers before dispatch: one selected external reviewer yields budget 2; two selected external reviewers yield budget 3. The participant list, evidence target, severity floor, discovery scope, external invocation budget, and maximum rounds cannot change after setup. Each external CLI call consumes one invocation whether it succeeds, fails, or returns content-free output. Exactly one invocation beyond the Round 1 reviewer count is reserved for at most one predeclared targeted confirmer. Reviewers added after setup never add budget or rounds.

## Round 1 — Discovery

1. Run the problem-class audit (Audit Mode for architecture). Verify the lead's findings with Miller `inspect`/`trace` evidence before dispatch.
2. Dispatch each selected reviewer exactly once, read-only: "Here are N verified findings: [list with file:line and evidence]. (a) Verify or refute each, naming what you checked. (b) Independently hunt for problems in the same class that this list misses. Verify and report only; do not modify any file."
3. Increment `external_invocations` after every call. After Round 1 discovery, the counter is `<selected external reviewers>/<budget>`. Diff-check the worktree for unauthorized edits after each dispatch.
4. Triage with `razorback:receiving-code-review`; the lead verifies, deduplicates, and assigns canonical severity. Freeze the accepted finding set after triage.
5. Present the merged list once for approval. In an unattended goal-driven run, the pre-approved setup plus a Goldfish checkpoint satisfies this gate.
6. Fix approved findings with TDD and verify them with `razorback:verification-before-completion`.

Reviewer proposals outside the approved scope are recorded for the final report and cannot extend the campaign. A required discovery obligation is satisfied once that reviewer supplies usable evidence for every declared required discovery scope. Unavailability, errors, or unusable output before then closes the campaign as `blocked`. An optional participant lost after setup follows Failure Handling below.

## Round 2 — Scoped Confirmation

Mark every accepted finding `addressed`, `not addressed`, `contested`, or `deferred`. The lead confirms fixes by default and inspects only the fix diff for new breakage. Observations outside the fix diff are recorded and cannot reopen broad discovery.

If setup predeclared targeted external confirmation, one selected reviewer may make one targeted call against the accepted finding set and fix diff. Increment `external_invocations` to `<budget>/<budget>` immediately after dispatch. The prompt must forbid a new sweep. Content-free approval is not clean evidence and cannot authorize another call. If this optional confirmer is unavailable or fails after supplying required discovery evidence, the later optional confirmation failure does not retroactively block; record the consumed call when dispatched and the lead completes confirmation.

A new medium/low observation may be fixed or deferred but cannot add a round or external invocation. Close `clean` when nothing above the floor remains open. Close `capped` when no permitted action remains with an above-floor finding still open, unless an unresolved critical/high finding meets the blocker taxonomy and requires `blocked`. Exhausting the external budget forbids another external call but does not prevent eligible lead-only Round 3 confirmation.

## Round 3 — Exceptional Targeted Confirmation

Enter only when the lead verifies a new critical/high regression introduced inside the Round 2 fix diff. Target only that regression and its fix; broad discovery is forbidden. The lead performs Round 3 confirmation when the one reserved external confirmation call was already used. If it was not used in Round 2, one predeclared confirmer may use it here and increments the counter to `<budget>/<budget>`.

Reviewer disagreement is not a Round 3 trigger. Push back once using code evidence, record the dispute, and stop after Round 3 regardless of outcome.

## Campaign Status and Goal Drivers

At the end of every round, print and checkpoint the full immutable setup, current counters, accepted findings with evidence and disposition, and the canonical terminal block when closed:

```text
REVIEW CAMPAIGN STATUS
state: clean | capped | blocked
evidence: <strongest label actually earned>
round: <current>/3
external_invocations: <used>/<budget>
open_critical_high: <count>
open_medium_low: <count>
open_above_floor: <count>
campaign_closed: yes
```

The goal predicate for `/loop`, Codex goals, or another until-condition runner is `campaign_closed: yes`. `clean`, `capped`, and `blocked` are all terminal. A goal runner must restore the immutable setup and counters after compaction and must never dispatch after terminal status.

## Failure Handling

- **Required reviewer unavailable or erroring before required discovery completes:** close `blocked`; an explicit reviewer requirement cannot be replaced or degraded.
- **Optional reviewer unavailable after setup:** record the consumed call when dispatched, do not retry or replace it, and degrade evidence. Close `blocked` if no usable different-model evidence remains.
- **Content-free response:** record the consumed invocation and close `blocked` when it supplies no usable required-reviewer evidence. Do not loop for compliments.
- **Disputed finding:** push back once with evidence. If still disputed, record it and let the lead assign its final disposition.
- **Fix-induced regression:** enter Round 3 only for a lead-verified new critical/high regression inside the fix diff.
- **User approves nothing:** close as an audit with the merged findings and terminal campaign status.

## Doubt Pass (pre-implementation)

A design doubt pass is a separate, stricter convergence campaign. Emit the canonical setup with the decision as scope, one different-model reviewer, `external_invocation_budget: 1`, `max_rounds: 1`, `round: 0/1`, and `external_invocations: 0/1`. Send one read-only refutation prompt, reconcile the result against repo evidence, revise the decision when a refutation survives, and close the campaign. It never implements code and never repeats broad discovery.

## Red Flags — STOP

| Rationalization | Reality |
|---|---|
| "One more review will probably be clean." | The immutable invocation budget is a hard stop. |
| "Add another model to break the tie." | Participants cannot grow after setup; the lead closes from code and test evidence. |
| "The reviewer said it looks great, so we are done." | Content-free praise is not evidence and does not buy another invocation. |
| "A new medium issue deserves Round 3." | Only a lead-verified fix-induced critical/high regression opens Round 3. |
| "Reset the counters after compaction." | Checkpoints preserve the setup and monotonically increasing counters. |
| "The campaign is capped, but the goal is not successful." | Every `campaign_closed: yes` state is terminal. |

## It's working if

- The setup block was emitted once and nothing in it changed afterward.
- `external_invocations` never exceeded the budget, and no dispatch happened after a terminal status.
- Every finding carried `file:line` evidence and a triaged disposition; praise bought nothing.
- A missing different-model reviewer produced a zero-call `blocked` record, not a same-model substitute.
