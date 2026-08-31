# External review completion and payload transport

**Goal:** Prevent Grok placeholder responses from being accepted as completed code reviews, allow one bounded continuation of the same session when the first model turn stops after planning, and keep large review payloads out of command-line arguments without granting reviewers Bash.

## Architecture quality

**Affected modules:** shared review-output schema, one executable output validator, Grok review orchestration, bounded review-campaign policy, and Claude review payload transport.

**Caller-facing interfaces:** `validate-review-output RESULT_FILE` writes one normalized completed-review JSON object to standard output or exits nonzero without accepting the result. Review payloads move through temporary files and standard input, never as large positional arguments.

**Depth/locality check:** Completion semantics stay in the shared schema and validator. Grok owns only prompt construction, one-session continuation, and campaign accounting.

**Test surface:** Tests invoke the validator with complete, contradictory, and placeholder envelopes; documentation guards verify full-diff construction and the bounded continuation contract.

**Rejected shortcuts:** Prompt-only wording, future-tense keyword matching, transcript-internal parsing, `--no-plan`, an unprovable sandbox probe, and granting reviewers unrestricted Bash only to run Git.

**Architecture risk:** Medium. The shared schema changes every structured reviewer, while the continuation path is Grok-specific.

## Design

Extend `skills/codex-cli/schemas/review-output.schema.json` with required completion evidence:

- `review_completed` is exactly `true`.
- `files_inspected` is a non-empty unique list of repository paths.
- `commands_run` is a list and may be empty when the complete diff was reviewed directly.
- `evidence` is a non-empty list of file, line range, and concrete observation objects.
- `needs-attention` requires at least one finding. Empty findings remain valid only with `approve`.

Add `skills/codex-cli/scripts/validate-review-output`. It accepts a Grok result-envelope file, normalizes `.structuredOutput` or the JSON object encoded in `.text`, enforces the completion contract, writes the normalized object on success, and exits nonzero on malformed, contradictory, or incomplete output. It never inspects Grok's private transcript format.

The Grok review recipe must embed the complete resolved diff in the initial prompt. A branch range or instruction to inspect later is not a review payload. After the first CLI call, the validator decides whether the required discovery scope completed.

Large review inputs use files as transport. Grok keeps `--prompt-file`; Codex keeps standard input; Claude writes the final redacted prompt to a temporary file and redirects that file to `claude -p`. Pre-merge review must not load the redacted payload back into a shell variable or pass it as a positional argument. This avoids command-line argument limits while preserving `Read,Grep,Glob` as the Claude tool allowlist. Reviewers receive the complete diff, stat, and commit log without gaining Bash or access to live Git metadata.

Standalone Grok campaigns predeclare two external invocations and two rounds. The second invocation is permitted only when the first created a session but failed completion validation. It resumes that same current-directory session with `-c`, omits `--sandbox`, repeats the schema, and asks only for completion of the existing review. It is not a fresh sweep or post-fix re-review. A second invalid result closes the campaign blocked or capped with no third call.

Sandbox startup failures remain terminal for their campaign because no session exists to resume. Grok 1.0.13 exposes no model-free command that resolves the Bubblewrap plan. `grok inspect` reports configuration but is not a sandbox capability probe. The existing explicit new-campaign `--sandbox off` fallback remains the only supported recovery.

## Files

- Modify `skills/codex-cli/schemas/review-output.schema.json`.
- Create `skills/codex-cli/scripts/validate-review-output`.
- Modify `skills/grok-cli/SKILL.md`.
- Modify `skills/managing-review-campaigns/SKILL.md`.
- Modify `skills/claude-cli/SKILL.md` and `skills/pre-merge-review/reviewer-prompts/claude.md` so large payloads use temporary files and standard input.
- Modify reviewer prompt documentation that enumerates the shared output fields.
- Add focused validator, Grok workflow, and Claude payload-transport tests.

## Acceptance criteria

- [x] A complete clean review with evidence validates.
- [x] `needs-attention` with empty findings is rejected.
- [x] Missing or empty inspected-file and evidence lists are rejected.
- [x] Malformed envelopes and malformed `.text` are rejected without partial output.
- [x] Grok code review embeds the complete diff and does not treat `--no-plan` or tool use as completion proof.
- [x] One invalid placeholder may resume the same session once; no fresh sweep or third invocation is allowed.
- [x] Sandbox startup failure cannot consume the continuation path and `grok inspect` is not presented as a capability probe.
- [x] Claude standalone and pre-merge review never pass the full diff as a positional argument.
- [x] Large redacted Claude payloads are supplied through a temporary file on standard input while `Bash` remains absent from the tool allowlist.
- [x] Existing Codex, Claude, and pre-merge structured-output contracts stay compatible with the expanded schema.
- [x] Focused tests show RED before implementation and GREEN afterward.
