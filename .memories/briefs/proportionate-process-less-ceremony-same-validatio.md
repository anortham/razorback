---
id: proportionate-process-less-ceremony-same-validatio
title: "Proportionate process: less ceremony, same validation"
status: active
created: 2026-11-09T20:46:45.304Z
updated: 2026-11-09T20:46:45.304Z
tags:
  - workflow
  - process-reduction
  - verification
  - skills
---

## Goal

Cut the process cost of razorback (stops, commits, repeated checks, repeated text) and keep each validation step that catches a defect.

## Why now

Runs took much longer than the work needed. A list of 11 small items became 11 PRs and 11 suite runs (2026-11-07). The toolkit reliability run stored 118 evidence files and needed six grading rounds (2026-11-04). Reductions shipped in 0.50.0 to 0.53.0, but no measurement shows what they saved.

## Constraints

- Keep the outcome checks: root cause before a fix, test first, review of completed changes, fresh evidence before a completion claim.
- Keep approval before push, publish, or release. Authority is never inferred.
- Keep the code-kb-first routing wording. The 2026-10 tests showed that agents skip code-kb when the wording gets weaker. Measure before any cut to the bootstrap.
- Each unfinished stop keeps its checkpoint trigger at the stop. The toolkit run showed that agents skip the checkpoint when the text is elsewhere.
- One home for each fact. A deliberate copy needs a guard test.
- A list of small items is one branch, one gate, one PR.
- Update `docs/site/` in the same branch as a workflow change.

## Success criteria

- An approved plan run ends at a PR with one approval and no further stop.
- A run makes one report commit and runs each gate one time.
- A wording edit that keeps the meaning breaks one test file at most.
- A measured comparison on real tasks shows that quality held and cost dropped (baseline `v0.44.4`).

## Status (2026-11-09)

Shipped: slow-suite tier (0.50.0), Batch mode (0.51.0), and in 0.53.0 the plan-path reduction, shared test helpers, and CI on Windows.

Open candidates, none started:

- The measured workflow comparison.
- The bootstrap toolchain section: 4.8 KB of the 10 KB that each session loads, and the skill calls it a fallback when code-kb sends its own routing. Measure first.
- The 46-line review preparation block, identical in the four CLI skills: move it to one script.
- `cross-model-convergence` repeats rules from `managing-review-campaigns`.
- 22 test files only pin wording (about 400 long patterns).
- Agent behavior with the 0.53.0 approval text is not measured.

## References

- `docs/plans/2026-09-24-workflow-comparison.md`
- `TODO.md`, section "Default workflow reduction"
- Checkpoints: 2026-11-08 Batch mode, 2026-11-09 plan path reduction
- Prior brief: `inner-loop-test-isolation` (completed)
