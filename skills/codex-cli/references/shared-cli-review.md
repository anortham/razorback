# Shared CLI Review Contract

Rules shared by razorback:codex-cli, razorback:claude-cli, razorback:grok-cli,
razorback:agy-cli, and razorback:cursor-agent. Each SKILL.md keeps only the
commands and failure modes specific to its CLI; read this file before the
first call.

## Policy gate

Before any diff or repo content leaves the machine, apply the external-model
policy check in razorback:security-review with the provider the skill names.
No policy block in the target repo's project instructions: proceed and add the
loud note to the morning report. Policy denies the provider: refuse the
dispatch and name an allowed alternative; on an autonomous run where the user
chose this provider, stop per blocker taxonomy #4.

## Redact every outbound prompt

Write the fully constructed prompt to `PAYLOAD_FILE`, run it through
`$SKILL_DIR/../security-review/scripts/redact-outbound`, and pass only
`REDACTED_PAYLOAD_FILE` (or `REDACTED_PROMPT` read from it) to the CLI. Never
log matched material. On helper failure remove both files, print a generic
error, and stop before the CLI receives input. Follow-up prompts on a resumed
session go through the same guard.

```bash
PAYLOAD_FILE=$(mktemp); REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "$PROMPT" > "$PAYLOAD_FILE"
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
IFS= read -r -d '' REDACTED_PROMPT < "$REDACTED_PAYLOAD_FILE" || true
```

Remove `PAYLOAD_FILE` and `REDACTED_PAYLOAD_FILE` after the call.

## Review targeting

Scope (`--scope auto|working-tree|branch`, `--base <ref>`) and the
foreground/background sizing rule live in
`skills/using-razorback/references/review-targeting.md`. It resolves `$DIFF`,
`$TARGET`, and `$RANGE`. `--scope`/`--base` are skill arguments, never CLI
flags.

## Review payload transport

Each reviewer skill's Code Review Step 2 builds the payload per
`skills/security-review/review-payload.md`:

- Export the reviewed `HEAD` tree with `prepare-review-tree` into
  `$REVIEW_ROOT` (a `.git`-free workspace) and run the reviewer there.
- Payload order: instruction, optional `Focus area:`, `Target:`, `File stat:`,
  `Commit log:`, `Diff:`. Redact it, then delete the raw file.
- `prepare-review-artifact` prints `inline` for payloads at or below 128 KiB;
  the redacted file is the prompt. Above that it writes
  `$REVIEW_ROOT/.razorback-review/review-input.md` and the prompt becomes the
  static wrapper that names the artifact path. Never reload the artifact into
  an argument, stdin, or a prompt-file flag.
- Delete `$REVIEW_ROOT` and every temp file after the call.

## Uncapped reviews

- Pass no turn cap, spend cap, or other mechanical ceiling. A cap truncates a
  review mid-flight; scope comes from the prompt.
- Set the harness timeout to 1800000 ms (30 min) on every review call. It is a
  failsafe for a hung or dead process, not a budget. Never lower it.
- Every CLI call counts once against the caller's campaign
  `external_invocation_budget`. Before a second review call or any
  multi-reviewer dispatch, load `razorback:managing-review-campaigns`.

## Completion contract

Run `$SKILL_DIR/../codex-cli/scripts/validate-review-output RESULT_FILE >
normalized.json` on every structured result and accept only the normalized
output. The validator unwraps envelopes (`.structured_output`,
`.structuredOutput`, `.result`, `.text`; the last object when `.text` holds
several turns) and rejects malformed, contradictory, placeholder, or
evidence-free output, and any review whose files and evidence cite only
`.razorback-review/`. Required: `review_completed: true`, a non-empty unique
`files_inspected` list, a `commands_run` array (may be empty), non-empty
file/line/observation `evidence`; `needs-attention` needs at least one
finding. A successful exit, tool use, or a future-tense plan is not completion
evidence. A rejected result consumes the invocation; do not narrow the diff or
retry inside the same campaign.

Schema: `$SKILL_DIR/../codex-cli/schemas/review-output.schema.json`, shared by
all reviewers. Each skill sanitizes it as its provider requires.

## Adversarial prompt

Trigger: "deep review", "adversarial review", `--adversarial`. Each reviewer
skill ships `adversarial-prompt.txt` with placeholders `{{TARGET_LABEL}}`,
`{{USER_FOCUS}}`, `{{REVIEW_INPUT}}` in that order. The four are a quartet:
`OPERATING STANCE`, `ATTACK SURFACE`, `FINDING BAR`, `CALIBRATION`,
`GROUNDING`, `INPUT TRUST` stay identical; edit all four together. Render with
parameter expansion, never `${var//pat/repl}` (bash 5.2 expands `&` and
backslashes in the replacement):

```bash
TEMPLATE=$(cat "$SKILL_DIR/adversarial-prompt.txt")
HEAD=${TEMPLATE%%'{{TARGET_LABEL}}'*};  REST=${TEMPLATE#*'{{TARGET_LABEL}}'}
MID=${REST%%'{{USER_FOCUS}}'*};         REST=${REST#*'{{USER_FOCUS}}'}
TAIL=${REST%%'{{REVIEW_INPUT}}'*}
ADVERSARIAL_INSTRUCTION="${HEAD}${TARGET}${MID}${FOCUS:-none specified}${TAIL}"
```

Then run Code Review Step 2 with `$ADVERSARIAL_INSTRUCTION` in place of
`$REVIEW_INSTRUCTION` and the `Focus area:` lines dropped (focus is already in
the template). claude-cli instead passes the template as a system prompt.

## Shared failure handling

- Rate limit: the service is unavailable, not the review too big. Tell the
  user; wait or swap reviewer. Do not shrink the prompt or downgrade the model.
- Timeout tripped: 10-20+ minute reviews are normal. A trip means the process
  hung or died. Do not re-run with a longer timeout and do not split the diff.
  Check stderr, then treat it as reviewer unavailability.
- Empty output: read stderr.

## After every call

Present the reviewer's output, then your own assessment: where you agree,
where you disagree with evidence, and what it missed. Group findings by
severity, critical first, with file, lines, and recommendation. The reviewer
is a peer, not an authority; adversarial mode over-reports, so filter
speculative findings. After a delegated task, run `git diff --stat` and review
the diff yourself.

## It's working if

- Only the redacted payload reached the CLI; temp files and `$REVIEW_ROOT`
  are gone.
- Structured results passed `validate-review-output` with
  `review_completed: true`.
- The user got the reviewer's view and your own agree/disagree assessment.
