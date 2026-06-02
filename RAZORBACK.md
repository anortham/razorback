# Razorback

This file is the source of truth for razorback-specific workflow policy while
developing Razorback. Do not duplicate this policy in `AGENTS.md`, `CLAUDE.md`,
or `GEMINI.md`; point to this file when a harness-specific doc needs to mention
razorback behavior.

## Model Routing

**Default policy:** Use the cheapest tier that can do the work safely. Escalate
on ambiguity, repeated failure, weak tests, hidden invariants, or high blast
radius.

| Tier | Use for | Codex | Claude | OpenCode |
|---|---|---|---|---|
| Strategy | Planning, architecture, decomposition, lead review, finding triage | gpt-5.5 medium/high | Opus or Sonnet, based on risk | Strongest available reasoning model |
| Implementation | Bounded worker tasks from a clear plan | gpt-5.4-mini xhigh | Sonnet or Haiku for boxed-in edits | Fast implementation model |
| Mechanical | Docs, fixtures, rote edits, formatting, manifests with no gate ownership | gpt-5.4-mini low/medium | Haiku or Sonnet low-cost equivalent | Fastest reliable model |
| Coupled implementation | Bounded but cross-file work with some coupling | gpt-5.4-mini xhigh only when coupling is shallow and each file verifies independently; otherwise gpt-5.4 high/xhigh (files must change together, shared invariants, or tool-heavy debugging) | Sonnet high or Opus | Stronger implementation model |
| Gate review | Plan plus failing test, replay, metric, or diff triage | gpt-5.4 high | Opus or Sonnet high | Strong review model |
| Escalation | Code review, gate interpretation, subtle correctness, high-blast-radius refactors, weak tests, repeated worker failure | gpt-5.4 high for review or first escalation; gpt-5.5 high/xhigh for top-risk correctness or planning failure | Opus | Strongest available reasoning model |

If a harness cannot choose models or reasoning per agent, use `inherit` and note
that limitation in the plan or worker report.

For Codex, this routing table is a clear task-specific reason to pass
`spawn_agent(model=..., reasoning_effort=...)` when the current session supports
per-agent selection. Do not leave `model` unset when a supported route exists.
Inherit only when the route itself says `inherit`, no route exists, or the
harness cannot select the mapped model or reasoning effort.

For Codex review routing, use `gpt-5.4 high` for adversarial review,
gate-interpretation review, code review, and failed-worker diagnosis. Use
`gpt-5.4 xhigh` for terminal-heavy bug fixing or repeated failed-worker
diagnosis. Use `gpt-5.5 high/xhigh` when the failure suggests the plan,
architecture, public API contract, security posture, or verification strategy
is wrong.

## Gate Ownership

Do not assign mechanical-tier workers any task that owns a failing test, replay,
metric, or acceptance gate. A docs task stays mechanical only when it records
already-decided evidence. If the task must decide what the evidence means, split
that interpretation into a gate-review, strategy, or escalation lane.

For replay, metric, and acceptance-evidence tasks, the prompt and report must
state:

- the invariant the gate enforces
- which metric or assertion is a hard gate
- which metric is report-only
- whether the assigned verification passed or failed

Assigned verification failure is not usable evidence. The worker must stop and
report the failure unless the plan explicitly says to update that gate.

## Worker Eligibility

Use implementation-tier workers only when all are true:

- The task has clear acceptance criteria.
- File ownership is narrow and non-overlapping.
- The expected change is local.
- The relevant behavior has a narrow verification scope.
- The task does not depend on hidden shared invariants.
- The task does not require interpreting replay, metric, or acceptance-gate
  semantics.

Do not use implementation-tier workers unattended for:

- shared workspace lifecycle behavior
- hook, install, or cross-harness bootstrap behavior
- public plugin manifest contracts
- weak or missing tests
- review findings involving subtle correctness
- replay, metric, or acceptance-gate interpretation

## Coupled Lanes

For coupled but still bounded implementation, choose one:

- use the coupled implementation tier for the worker
- keep the work in the lead session
- split strategy-tier investigation from implementation-tier edits

`gpt-5.4-mini` may take a coupled lane only when the coupling is shallow enough
that the task still satisfies every Worker Eligibility rule — narrow,
non-overlapping file ownership, a local expected change, and per-file
verification that does not depend on cross-file state. The moment the files must
change together, the change rides a shared invariant the worker cannot see
locally, or diagnosis turns tool-heavy, route to `gpt-5.4` or keep the work in
the lead session. Do not let a mini worker discover the coupling mid-task; the
lead decides the tier up front and does not hand `mini` cross-file work on the
assumption it will escalate itself.

## Lead Duties

The lead must:

- assign disjoint write scopes
- provide worker verification ceilings
- require workers to state the invariant enforced by each assigned gate
- review assumptions, not only diffs
- inspect tests for meaningful assertions
- run affected-change verification after batches
- keep branch-gate and expensive-specialist verification lead-owned
- enforce architecture-quality decisions and reject worker-local redesigns
- do final integration review on the strategy tier

## Escalation Triggers

Escalate to strategy or escalation tier when:

- two worker attempts fail review
- one worker failure reveals hidden invariants
- tests pass but the lead sees a plausible second-order bug
- a fix touches shared state, lifecycle, hook behavior, install behavior, or
  public plugin contracts
- assigned verification fails and the plan does not say to update that gate
- the plan no longer matches codebase reality

## Verification

Use the verification hierarchy from the plan and current project docs. Workers
run the assigned narrow scope. The lead owns affected-change, specialist, and
branch-gate verification.

Workers must report the invariant, scope label, command, commit SHA, result,
and timestamp for assigned verification. For replay or metric evidence, they
must also label hard-gate metrics and report-only metrics. If assigned
verification fails, they stop and report instead of committing or presenting the
failure as acceptance evidence, unless the plan says to update that gate.
