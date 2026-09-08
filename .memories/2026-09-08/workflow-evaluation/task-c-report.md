# Workflow evaluation handoff

## Prepare

```sh
node scripts/workflow-eval.mjs prepare --repo . --source 464d4d317c206335e0b67ffdbc4f45a8e962b5e8 --output /tmp/razorback-workflow-baseline-packets.json
node scripts/workflow-eval.mjs prepare --repo . --source worktree --output /tmp/razorback-workflow-revised-packets.json
```

Each output is a blind bundle with ten cases, the finite `action_vocabulary`, `answer_schema`, source revision and content hashes, and a content-bound `packet_id` per case. Keep each generated packet bundle unchanged during its run.

## Agent answer schema

```json
{
  "schema_version": 1,
  "evidence_kind": "agent-run",
  "cases": [
    {
      "id": "approval",
      "packet_id": "copy from that case in the supplied packet bundle",
      "actions": ["action_vocabulary values in execution order"],
      "terminal_state": "active|awaiting_user|blocked|complete",
      "user_questions": 0,
      "metrics": {
        "measurement_source": "omit metrics unless supplied by the real harness",
        "latency_ms": 0,
        "input_tokens": 0,
        "output_tokens": 0
      }
    }
  ]
}
```

Return exactly one case for every supplied packet case. Omit `metrics` unless the native harness supplied genuine measurements. Do not add prose or fields to case objects.

## Grade

```sh
node scripts/workflow-eval.mjs grade --packets /tmp/razorback-workflow-baseline-packets.json --answers /tmp/razorback-workflow-baseline-answers.json --output /tmp/razorback-workflow-baseline-report.json
node scripts/workflow-eval.mjs grade --packets /tmp/razorback-workflow-revised-packets.json --answers /tmp/razorback-workflow-revised-answers.json --output /tmp/razorback-workflow-revised-report.json
```

The grader uses only the checked-in trusted expectation manifest. Exit 0 means every case passed; exit 1 writes per-case decision failures; exit 2 means CLI or input validation failed.

## Current verification

- `npm run test:workflow-eval`: 25 passed, 0 failed.
- TDD RED was observed first: the initial 9 tests failed because `scripts/workflow-eval.mjs` did not exist. The working-tree symlink regression then failed against the first implementation before the path boundary was fixed.
- Historical git-ref preparation was verified to read the committed blob even when the current working tree replaces that path with an external symlink.
- Git ref resolution and reads use argv-only subprocess calls with `--end-of-options`.
- Ordering tests require pre-commit checkpoints before staging and interrupted-work reconciliation before completion.
- Question-count tests allow zero or one Miller restoration question while retaining exactly one publication approval question.
- Planned delegation simulations accept `active` or `complete`; push recovery still requires the full sequence from the failed attempt.
- Safe optional continuations are data-driven: selected commits require their checkpoint/staging prerequisites, and optional completion follows the scenario's evidence.
- Missing Miller accepts either a direct blocked outcome or one restoration request with matching `awaiting_user` state and question count.
- A response may report the Miller blocker and ask once for restoration together; the request still requires `awaiting_user` and one question.
- Grade reports include the SHA-256 hash of the trusted expectation manifest used for that run.
- Final scorer-consistency checks graded both frozen answer sets successfully under the same rubric. This validates the scorer's accepted alternatives; it is not a compliance-improvement result.
- `/tmp/razorback-workflow-formal-baseline-report.json` is retained as rubric-calibration evidence. Its 2/10 result predates these predicate corrections and is not evidence of workflow improvement.
- These tests are deterministic grader evidence, not measured agent behavior.

## Worktree state

- Path: `/home/murphy/.config/razorback/worktrees/razorback/workflow-consistency`
- Branch: `codex/workflow-consistency`
- Base commit: `464d4d317c206335e0b67ffdbc4f45a8e962b5e8`
- Miller workspace: `d2bb477b5209eb1a2a1ece920177905b318d91327c329ee37c73e123471f8f75`
