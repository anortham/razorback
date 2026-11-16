---
id: proportionate-process-less-ceremony-same-validatio
title: "Proportionate process: less ceremony, same validation"
status: active
created: 2026-11-09T20:46:45.304Z
updated: 2026-11-16T20:29:58.040Z
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
- razorback does not name code-kb or any code index tool (owner decision, 2026-11-16). Skills name the evidence, not the tool. `tests/workflow-tool-contracts.test.mjs` guards this.
- Each unfinished stop keeps its checkpoint trigger at the stop. The toolkit run showed that agents skip the checkpoint when the text is elsewhere.
- One home for each fact. A deliberate copy needs a guard test.
- A list of small items is one branch, one gate, one PR.
- Update `docs/site/` in the same branch as a workflow change.

## Success criteria

- An approved plan run ends at a PR with one approval and no further stop.
- A run makes one report commit and runs each gate one time.
- A wording edit that keeps the meaning breaks one test file at most.
- A measured comparison on real tasks shows that quality held and cost dropped (baseline `v0.44.4`).

## Status (2026-11-16)

Shipped: slow-suite tier (0.50.0), Batch mode (0.51.0), and in 0.53.0 the plan-path reduction, shared test helpers, and CI on Windows.

On branch `remove-code-kb` (not committed, not pushed on 2026-11-16): code-kb removed from all active files; the session bootstrap dropped from 10 KB to 6.5 KB; small-fix path no longer loads three skills in full; plan ticks ride in the task commit; one validation per reviewer pass; direct yes or no push question at approval.

Open candidates from the 2026-11-16 audits, none started:

- One gate per reviewed run: today the gate runs before external review and again after review fixes. The secret scan must stay before the external call.
- The 44-line review preparation block, byte-identical in the four CLI skills: move it to one script beside `security-review`.
- Four adversarial prompt files differ in 3 lines: one template.
- `pre-merge-review` requires `managing-review-campaigns` (9 KB) but already holds both campaign blocks.
- `cross-model-convergence` repeats rules from `managing-review-campaigns` (about 2 KB).
- The lead-built `$SOURCE_EVIDENCE` bundle for external reviewers: its reason was the reviewer's lack of the index tool.
- Ten unverified conflicts in the CLI review skills (stderr handling, Codex plain review not validated, Claude cleanup on reject, working-tree scope, severity names).
- The measured workflow comparison.
- 22 test files only pin wording (about 400 long patterns).

## References

- `docs/plans/2026-09-24-workflow-comparison.md`
- `TODO.md`, section "Default workflow reduction"
- Checkpoints: 2026-11-08 Batch mode, 2026-11-09 plan path reduction, 2026-11-16 code-kb removal
- Prior brief: `inner-loop-test-isolation` (completed)
