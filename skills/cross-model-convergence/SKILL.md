---
name: cross-model-convergence
description: >-
  Use when the user wants two models to check each other's work until clean — "have codex verify my findings and find more", "go back and forth until clean", "loop until you both agree there are no problems left" — when an audit should run to convergence under /loop or another goal-driven runner, or when a design decision needs adversarial challenge before building: "doubt this", "challenge this decision", or architecture risk rated medium/high.
---

# Cross-Model Convergence

The lead and every selected external reviewer gather independent evidence in one bounded review campaign. At least one reviewer must be a different model from the lead, and every call reported as cross-model evidence must come from a different model; calling your own model's CLI is self-review. The setup block is immutable and every terminal state closes the campaign for good.

**Announce at start:** "I'm using the cross-model-convergence skill with [selected reviewers] on [problem class]."

**Not here:** planned pre-merge external review (`razorback:pre-merge-review`); a single ad-hoc review with no convergence goal (`razorback:requesting-code-review`).

**REQUIRED SUB-SKILLS:** razorback:managing-review-campaigns, razorback:architecture-quality (Audit Mode), one or more reviewer channels (razorback:codex-cli, razorback:claude-cli, razorback:grok-cli, razorback:agy-cli, or razorback:cursor-agent read-only) pointing at models that differ from the lead, razorback:receiving-code-review, razorback:test-driven-development, razorback:verification-before-completion.

## Policy Gate

Every participating model's provider must pass the external-model policy check in razorback:security-review before setup. No policy block in the target repo means proceed and add the loud note to the morning report. A denied reviewer named by the user or approved plan blocks under blocker taxonomy #4.

## Outbound Payload Redaction

Immediately before each reviewer dispatch, write the fully constructed campaign prompt to `PAYLOAD_FILE`, filter it, and send only `REDACTED_PAYLOAD_FILE` to the reviewer channel; never pass raw findings, diff, or prompt directly.

```bash
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

## Campaign Setup

Select the different-model reviewers explicitly requested or deliberately chosen for this campaign before the first sweep; availability and policy are gates, not reasons to enroll every installed model. Omit unavailable optional reviewers before setup and record the omission. A reviewer named by the user or approved plan is required; if unavailable, emit a `blocked` status instead of substituting or degrading to same-model review.

When no different-model reviewer is available before setup, emit one auditable zero-call record: the setup block with `participants: lead`, `required_reviewers: at least one different-model reviewer (unavailable)`, `external_invocation_budget: 0`, `external_invocations: 0/0`, immediately followed by the terminal block with `state: blocked`, `evidence: lead-only`, zero open counts, and `campaign_closed: yes`. A new campaign requires a new explicit user request; never restart automatically when availability changes.

Emit once:

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

Replace placeholders with integers before dispatch: one selected external reviewer yields budget 2; two selected external reviewers yield budget 3. Nothing in the block changes after setup. Each external CLI call consumes one invocation whether it succeeds, fails, or returns content-free output. Exactly one invocation beyond the Round 1 reviewer count is reserved for at most one predeclared targeted confirmer.

## Round 1 — Discovery

1. Run the problem-class audit (Audit Mode for architecture). Verify the lead's findings against current source, using native tools or code-kb, before dispatch.
2. Dispatch each selected reviewer exactly once, read-only: "Here are N verified findings: [list with file:line and evidence]. (a) Verify or refute each, naming what you checked. (b) Independently hunt for problems in the same class that this list misses. Verify and report only; do not modify any file."
3. Increment `external_invocations` after every call (Round 1 ends at `<selected external reviewers>/<budget>`). Diff-check the worktree for unauthorized edits after each dispatch.
4. Triage with `razorback:receiving-code-review`: verify, deduplicate, assign canonical severity, freeze the accepted set.
5. Present the merged list once for approval. In an unattended goal-driven run, the pre-approved setup plus a Goldfish checkpoint satisfies this gate.
6. Fix approved findings with TDD; verify with `razorback:verification-before-completion`.

Out-of-scope reviewer proposals are recorded for the report and cannot extend the campaign. A required discovery obligation is satisfied once that reviewer supplies usable evidence for every declared required discovery scope; unavailability, errors, or unusable output before then closes the campaign `blocked`.

## Round 2 — Scoped Confirmation

Mark every accepted finding `addressed`, `not addressed`, `contested`, or `deferred`. The lead confirms by default and inspects only the fix diff; observations outside it are recorded and cannot reopen broad discovery.

If setup predeclared targeted external confirmation, one selected reviewer may make one targeted call against the accepted set and fix diff; increment to `<budget>/<budget>` immediately. The prompt must forbid a new sweep. Content-free approval is not clean evidence and buys no further call. If this optional confirmer fails after supplying required discovery evidence, the later optional confirmation failure does not retroactively block: record the consumed call and the lead completes confirmation.

A new medium/low observation may be fixed or deferred but adds no round or invocation. Close `clean` when nothing above the floor remains open; `capped` when no permitted action remains with an above-floor finding open; `blocked` when an unresolved critical/high meets the blocker taxonomy. An exhausted budget forbids external calls but not eligible lead-only Round 3 confirmation.

## Round 3 — Exceptional Targeted Confirmation

Enter only when the lead verifies a new critical/high regression inside the Round 2 fix diff. Target only that regression and its fix; broad discovery is forbidden. The lead confirms when the reserved call was used in Round 2; otherwise one predeclared confirmer may use it here. Reviewer disagreement is not a trigger: push back once with code evidence, record the dispute, and stop after Round 3 regardless of outcome.

## Campaign Status and Goal Drivers

At the end of every round, print and checkpoint the setup, counters, accepted findings with evidence and disposition, and when closed:

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

The goal predicate for `/loop`, Codex goals, or any until-condition runner is `campaign_closed: yes`; all three states are terminal. A goal runner restores setup and counters after compaction and never dispatches after terminal status.

## Failure Handling

- **Optional reviewer lost after setup:** record the consumed call, do not retry or replace, degrade evidence; `blocked` if no usable different-model evidence remains.
- **Content-free response:** consumed; `blocked` when it supplies no usable required-reviewer evidence. Do not loop for compliments.
- **User approves nothing:** close as an audit with the merged findings and terminal status.

## Doubt Pass (pre-implementation)

A design doubt pass is a stricter one-round campaign: setup with the decision as scope, one different-model reviewer, `external_invocation_budget: 1`, `max_rounds: 1`, `round: 0/1`, `external_invocations: 0/1`. Send one read-only refutation prompt, reconcile against repo evidence, revise the decision when a refutation survives, close. Never implements code, never repeats discovery.

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
