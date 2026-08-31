# Review payload transport

All diff-based reviewer skills use this contract for review payloads. The
complete redacted prompt is the source of truth; the CLI prompt is either that
prompt (small) or a static transport wrapper (large).

## Bundle

Build the complete review prompt in `PAYLOAD_FILE` before running
`skills/security-review/scripts/redact-outbound`. Put the full review
instruction and any user-supplied focus text in that file before the labelled
review bundle. The redacted result must contain these labelled sections, in
this order:

```text
<review instruction>
Focus area: <optional user focus>

Target: <scope and target metadata>
File stat:
<stat>
Commit log:
<log>
Diff:
<complete diff>
```

`REVIEW_ROOT` is the isolated, readable reviewer workspace. It is the exported
tree from `prepare-review-tree` (or the same root prepared by
`pre-merge-review`) and must not contain `.git` metadata. Never place a review
artifact in the live source checkout or an arbitrary host directory.

## Size decision

`prepare-review-artifact REVIEW_ROOT REDACTED_PAYLOAD_FILE` owns the single
large-review threshold: payloads over 128 KiB are large. It validates the bundle
sections, creates `.razorback-review/review-input.md` inside `REVIEW_ROOT` with
directory mode `0700` and file mode `0600`, and prints its absolute path. The
file is temporary, ignored by source control because the review root has no
`.git`, and contains the complete redacted bundle.

For a payload at or below the threshold, the helper prints `inline` and creates
no artifact. Keep the complete redacted prompt in its file and use that file as
the reviewer's normal prompt transport; it must already contain the review
instruction and optional focus.

```bash
if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" \
  "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$REDACTED_PAYLOAD_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "review artifact preparation failed" >&2
  exit 1
fi
if [ "$REVIEW_ARTIFACT" = inline ]; then
  REVIEW_PROMPT_FILE="$REDACTED_PAYLOAD_FILE"
else
  REVIEW_PROMPT_FILE=$(mktemp)
  printf '%s\n\n%s\n%s\n%s\n\n%s\n' \
    'Read and follow the complete redacted review bundle at:' \
    "$REVIEW_ARTIFACT" \
    'The bundle contains the complete review instructions; follow them.' \
    'Use the available read-only tools to inspect that file.' \
    'Return only the required completion schema with review_completed=true, files_inspected, commands_run, and concrete file/line evidence.' \
    > "$REVIEW_PROMPT_FILE"
fi
```

The large branch must pass only `REVIEW_PROMPT_FILE` to the CLI. That wrapper is
static except for the artifact path; it must not interpolate the instruction,
focus, or any other user-controlled text. Do not `cat`, reload, or interpolate
`REDACTED_PAYLOAD_FILE` into an argument, stdin, or `--prompt-file`.
`--prompt-file` is prompt transport, not a review-artifact mechanism. The
reviewer reads the complete redacted prompt from `REVIEW_ROOT` using its
read-only `Read,Grep,Glob` tools. Do not add Bash to work around payload size.

Remove the prompt files and the large `REVIEW_ARTIFACT` after each result is
parsed when another pass will reuse the same `REVIEW_ROOT`:

```bash
if [ "$REVIEW_ARTIFACT" != inline ]; then rm -f -- "$REVIEW_ARTIFACT"; fi
```

Remove the shared `REVIEW_ROOT` after all passes. The bounded Grok continuation
reuses the same artifact and sends only a short completion instruction; it does
not rebuild or resend the bundle.
