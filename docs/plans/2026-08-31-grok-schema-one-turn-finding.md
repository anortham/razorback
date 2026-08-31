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

Grok-specific. Claude 2.1.251 under the same schema ran 4 turns and returned a
review the validator accepted. Codex was not measured.
