# Workflow consistency evidence

The baseline and revised native Sol runs each passed ten decision scenarios under the same final rubric. This sample does not establish a compliance improvement. No token or latency measurement was available from the agent harness.

The final answers are untouched model output. Both use the same checked-in scenario definitions and final expectation manifest. The revised workflow packet content matched the final source files before commit. Packets include the exact workflow text and source hashes, so they remain auditable after later source changes.

Early calibration reports are retained separately: their failing scores reflected overstrict scoring of safe extra steps and ambiguous task boundaries, not measured workflow regressions. The final grader accepts those safe alternatives while retaining explicit unsafe-action, checkpoint, ordering, identity, and completeness checks. This is a simulated decision test, not a live-host bootstrap or real git-operation smoke test.

## Replay grading

Run from the repository revision containing this evidence and use a private temporary directory for decompressed packets:

```sh
gzip -dc .memories/2026-09-08/workflow-evaluation/baseline-packets.json.gz > /tmp/workflow-baseline-packets.json
gzip -dc .memories/2026-09-08/workflow-evaluation/revised-packets.json.gz > /tmp/workflow-revised-packets.json
node scripts/workflow-eval.mjs grade --packets /tmp/workflow-baseline-packets.json --answers .memories/2026-09-08/workflow-evaluation/baseline-answers.json --output /tmp/workflow-baseline-report.json
node scripts/workflow-eval.mjs grade --packets /tmp/workflow-revised-packets.json --answers .memories/2026-09-08/workflow-evaluation/revised-answers.json --output /tmp/workflow-revised-report.json
```

Both commands should exit zero and name the same expectation manifest hash as the saved final reports. The compressed branch-gate log records 419 passing tests. The usage guide is `docs/workflow-evaluation.md`.
