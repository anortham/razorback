# Workflow comparison: lighter default vs current workflow

Notes for the comparison item in `TODO.md` under "Default workflow reduction".
The experiment has not started. This file records the fixed inputs first, so the
current-workflow arm stays reproducible after the skill defaults change.

## Baseline

- Current workflow: tag `v0.44.4`, commit `07335cf3a8878ffadbfc39b8ea2e86f812e4f4c1`.
- Pinned on 2026-09-24, before any skill edit for the workflow reduction.
- Commits after the tag and before this file change only `docs/site/`, its test,
  one `CLAUDE.md` line, and `.memories/`. No skill, hook, agent, or rule copy changed.
- Lighter default: the branch that carries the workflow reduction items. Record its
  commit here when the comparison starts.

## Fixed per run

Record each value once per run. Keep it the same across both arms.

| Input | Value |
|---|---|
| Model and effort | |
| Harness and version | |
| Repository and commit for the task | |
| Task input (prompt, verbatim) | |
| Acceptance checks | |
| Goldfish and code-kb availability and config | same in both arms |

## Task classes

Select 8 to 12 tasks. Start with existing transcripts, then add replays.

- Small repairs
- Changes in unfamiliar modules
- Cross-file changes
- Resumed work

## Measures

- Accepted outcome (yes/no) against the acceptance checks
- Defects found after acceptance
- Human corrections and review time
- Elapsed time
- Input, output, and cache tokens (actual, from logs)
- Documents generated that the task did not need

Workflow-evaluator scores show rule compliance, not software quality. Do not use
them as an outcome measure.

## Budget

Paid replays need an approved budget before they start. Transcript analysis needs none.

## Results

| Task | Class | Arm | Accepted | Defects | Human time | Elapsed | Tokens in/out/cache | Extra docs |
|---|---|---|---|---|---|---|---|---|

Report quality and cost by task class, including losses and inconclusive results.
