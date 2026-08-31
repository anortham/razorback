# Grok returns one turn under `--json-schema`

**Date:** 2026-08-31
**Status:** Measured; fix shipped in `skills/grok-cli/SKILL.md`
**Supersedes the transport conclusion in:** `docs/plans/2026-08-31-grok-review-completion-design.md`

## What we believed

A 254,965-byte review prompt made Grok return future-tense planning placeholders
instead of a review. The fix moved large bundles into a reviewer-local artifact
so the prompt stayed small.

## What is actually true

Payload size was not the cause. `--json-schema` constrains Grok to emit
conforming JSON on its **first** turn, so the agent loop never runs. Grok fills
the required fields with its intent and stops.

Measured on Grok 1.0.13 / grok-4.x against a synthetic repository:

| Call | Transport | Prompt bytes | `num_turns` | Tool calls | Findings |
|---|---|---:|---:|---:|---:|
| `--json-schema` | artifact | 384 | 1 | 0 | 0 |
| `--json-schema` | inline | 933 | 1 | 0 | 0 |
| no schema | inline | 933 | 7 | yes | 5 real |
| no schema, then resume with schema | inline | 933 | 6 + 1 | yes | 6 real |

The artifact transport works: a 182,516-byte redacted bundle produced a
384-byte prompt. It just never fixed the failure it was written for.

Under the schema, Grok satisfied the completion contract dishonestly. It set
`review_completed: true`, listed the review bundle itself as the only inspected
file, and cited line 1 of that bundle as its only evidence.

## What changed

- The Grok review and adversarial recipes run free-form first, then resume the
  same session with `--json-schema` for a structuring pass only. Both
  invocations are predeclared; neither is a retry.
- A review pass returning `num_turns < 2` is a failed invocation, not evidence.
- `validate-review-output` rejects a review whose `files_inspected` and
  `evidence` cite only the `.razorback-review/` bundle.
- `validate-review-output` reads the last JSON object when `.text` holds one
  object per turn. Before this it rejected every multi-turn envelope as
  malformed, whatever the final turn said.
- `--sandbox read-only` and `--sandbox strict` refuse to start where a
  container-runtime deny path cannot be resolved. `--sandbox workspace` plus a
  `Read,Grep,Glob` allowlist is the supported recovery, not `--sandbox off`.

## Scope

The one-turn collapse is Grok-specific. Claude 2.1.251 under the same schema ran
4 turns and returned a review the validator accepted.

## Codex has a different failure

Codex does not collapse to one turn. It never reaches the model at all.

OpenAI structured outputs accept a restricted JSON Schema subset, and the
canonical schema's `uniqueItems` — added by `90a90bf`, shipped in 0.35.0 —
fails the request with HTTP 400 `invalid_json_schema`. `minItems`, `minLength`,
and `minimum` fail the same way once `uniqueItems` is removed. Every
schema-constrained Codex review has failed since that commit.

`skills/codex-cli/scripts/openai-schema` strips the rejected keywords and leaves
the canonical schema expressive for Claude and Grok, which accept it. Nothing is
lost: `validate-review-output` already enforces each stripped constraint on the
returned object, including the uniqueness of `files_inspected`.

Measured after the fix: Codex returned 4 findings across 2 files with real tool
use, accepted by the validator.
