# Workflow decision evaluation

The workflow evaluator measures whether a fresh agent chooses safe, useful actions in ten conflict-prone situations. It is provider-neutral: preparation and grading are local Node.js commands, while any native agent harness can answer the blind packets.

The checked-in scenario manifest contains facts and relevant workflow file paths. Preparation reads those files from either an explicit git revision or the working tree, records their SHA-256 hashes, and creates a content-bound `packet_id` for each case. The generated packet includes the complete action vocabulary and answer schema but excludes all grading predicates.

## Prepare baseline and revised packets

From the repository root, prepare the historical baseline from an explicit commit:

```sh
node scripts/workflow-eval.mjs prepare \
  --repo . \
  --source 464d4d317c206335e0b67ffdbc4f45a8e962b5e8 \
  --output /tmp/razorback-workflow-baseline-packets.json
```

Prepare the revised workflow from the current working tree:

```sh
node scripts/workflow-eval.mjs prepare \
  --repo . \
  --source worktree \
  --output /tmp/razorback-workflow-revised-packets.json
```

Do not edit a generated packet between preparation and collection. A changed source revision or workflow file produces a different packet ID, so answers from one run cannot be graded as evidence for another.

## Run fresh native agents

Give each fresh agent the unchanged packet bundle, or one case plus the bundle's `source`, `action_vocabulary`, and `answer_schema`. Tell it to return structured JSON only. Run baseline and revised packets in separate fresh sessions so earlier answers cannot influence later decisions.

The answer file must contain exactly one case for every packet case:

```json
{
  "schema_version": 1,
  "evidence_kind": "agent-run",
  "cases": [
    {
      "id": "approval",
      "packet_id": "copy the supplied case packet_id",
      "actions": [
        "choose action_vocabulary values in execution order"
      ],
      "terminal_state": "awaiting_user",
      "user_questions": 1
    }
  ]
}
```

Valid terminal states use the boundary of the scenario being evaluated:

- `active`: the evaluated sequence reached its safe boundary and the larger workflow continues later.
- `awaiting_user`: the next safe action requires a user answer or authority.
- `blocked`: no safe available action can continue the evaluated sequence.
- `complete`: the evaluated sequence and its required evidence are finished.

`user_questions` is a non-negative integer. Do not add fields to a case. Include an optional `metrics` object only when the native harness supplied genuine measurements:

```json
{
  "metrics": {
    "measurement_source": "native harness run identifier",
    "latency_ms": 1200,
    "input_tokens": 800,
    "output_tokens": 160
  }
}
```

Omitted measurements are reported as `unavailable`; the evaluator never estimates cost, latency, or token savings.

## Grade collected decisions

Grade each answer file against the packet that agent received:

```sh
node scripts/workflow-eval.mjs grade \
  --packets /tmp/razorback-workflow-baseline-packets.json \
  --answers /tmp/razorback-workflow-baseline-answers.json \
  --output /tmp/razorback-workflow-baseline-report.json

node scripts/workflow-eval.mjs grade \
  --packets /tmp/razorback-workflow-revised-packets.json \
  --answers /tmp/razorback-workflow-revised-answers.json \
  --output /tmp/razorback-workflow-revised-report.json
```

Grading uses the checked-in trusted expectation manifest; packets and answer files cannot replace it. The report records that manifest's SHA-256 hash, gives failure reasons for every scenario, and exits 1 when any decision fails. Invalid CLI arguments, malformed JSON, tampered packets, or an incompatible case set exit 2.

The grader rejects missing, duplicate, or unknown cases; unknown, duplicate, disallowed, or forbidden actions; missing required choices; unsafe terminal states or question counts; required actions in the wrong order; and answers whose `packet_id` does not match the supplied source packet. Scenario expectations may require an exact question count or a small allowed range when both choices are safe.

## Interpret evidence

`npm run test:workflow-eval` tests packet preparation and deterministic grading without network or model access. Its checked-in valid decisions use `evidence_kind: deterministic-fixture`. A green test proves the evaluator recognizes declared decisions; it is not evidence that an agent made those decisions.

Only answers collected from a real fresh-agent run use `evidence_kind: agent-run`. Compare their per-case reports directly. Treat latency and token usage as unavailable unless the harness produced those measurements for the same run.
