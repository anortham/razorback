---
id: agent-tier-delegation-gate-policy-feedback
title: Agent Tier Delegation Gate Policy Feedback
status: active
created: 2026-05-01T20:34:47.658Z
updated: 2026-05-01T20:34:47.658Z
tags:
  - model-routing
  - delegation
  - verification
  - policy
---

## Context
Testing in `/Users/murphy/source/julie` showed that tiered workers were effective for bounded implementation tasks, but weak for tasks that owned acceptance evidence or replay interpretation.

## Policy Direction
- Mechanical-tier workers must not own any failing test, replay, metric, or acceptance gate.
- Any task that interprets verification evidence, replay invariants, metric semantics, or whether a gate should change needs implementation xhigh or strategy/escalation ownership.
- Bounded implementation workers can use `gpt-5.4-mini` at `xhigh` when the task has narrow ownership and clear tests.
- Add a `5.3-codex` high reviewer role for plan + failing test + diff triage, focused on deciding whether the test or implementation is wrong.
- Workers must stop and report assigned verification failure unless the spec tells them to update the gate.
- Workers should state the invariant enforced by each assigned test or gate.
- Replay and metric tasks must identify hard-gate metrics versus report-only metrics.
- Lead keeps final `affected-change`, `branch-gate`, and `expensive-specialist` gates.

## Likely Repo Changes
Create repo-root `RAZORBACK.md` as policy source, then update `skills/writing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/implementer-prompt.md`, `skills/using-razorback/references/codex-tools.md`, and public docs to point at it without policy duplication.
