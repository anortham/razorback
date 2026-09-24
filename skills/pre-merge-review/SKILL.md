---
name: pre-merge-review
description: Use after all tasks are complete and branch verification passes, before finishing-a-development-branch, when a pre-merge external reviewer was chosen for the run (codex or claude).
---

# Pre-Merge External Review

The chosen reviewer (codex / claude) gets one general adversarial pass and one security pass over the full branch diff: two invocations, ever. Each pass runs once; fixes get local confirmation without a post-fix external re-review. The lead verifies every finding against current source, classifies it, then fixes, dismisses with a written reason, or flags it for human judgment, and emits the morning-report block.

**REQUIRED SUB-SKILL:** razorback:managing-review-campaigns.

## Pre-conditions

Called by `razorback:executing-plans` Step 3 and `razorback:subagent-driven-development` Step 4a. Skip entirely when the reviewer choice is `none`. Abort and surface the gap when any of these fails:

- All plan tasks complete; the verification ledger has a passing `branch-gate` entry for HEAD (or the caller runs it now).
- Branch not pushed, no PR.
- Reviewer is `codex` or `claude`.
- External-model policy check in razorback:security-review passes: provider (`codex` → `openai`, `claude` → `anthropic`) allowed and reviewer listed in `Reviewer choices permitted:`. When no external-model policy block exists, proceed and add the loud morning-report note.

## Campaign Setup

Emit before either external call:

```text
REVIEW CAMPAIGN
scope: full branch diff against merge base
workflow: pre-merge
participants: lead, <chosen reviewer>
required_reviewers: <chosen reviewer>
evidence_target: external-reviewed
severity_floor: medium
discovery_scopes: general, security
external_invocation_budget: 2
max_rounds: 2
round: 0/2
external_invocations: 0/2
```

A dispatch consumes its invocation even when output is unusable. A required reviewer that fails either pass closes the campaign `blocked`.

## Step 1: Build diff + review tree

Inspect changed symbols, trace callers of changed public APIs, and identify relevant tests with native search and file reads, or code-kb when useful; summarize that as `$SOURCE_EVIDENCE`. The external reviewer does not run code-kb; it reads the bundle and the exported tree and reports missing evidence when they cannot support a conclusion.

```bash
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROJECT_DIR=$(git rev-parse --show-toplevel)
REVIEW_REF=HEAD
REVIEW_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/razorback-review-tree.XXXXXX")
if ! "$SKILL_DIR/scripts/prepare-review-tree" "$PROJECT_DIR" "$REVIEW_REF" "$REVIEW_ROOT" >/dev/null; then
  rm -rf -- "$REVIEW_ROOT"
  exit 1
fi
DIFF=$(git diff "$BASE"..HEAD --no-ext-diff)
FILE_STAT=$(git diff --stat "$BASE"..HEAD)
COMMIT_LOG=$(git log --oneline "$BASE"..HEAD)
PLAN_PATH="docs/plans/<YYYY-MM-DD>-<feature>.md"
SOURCE_EVIDENCE="<compact summary of changed symbols, public-API references, and likely tests>"
```

`prepare-review-tree` exports tracked content of the ref only (no `.git`, no untracked files, no symlinks that escape the root) and rejects an output path inside the repo. Include a user focus only when the plan carried one. Use the CLI's default model unless one was explicitly selected.

## Step 2: Dispatch two passes

Apply the razorback:security-review policy check and re-read the policy immediately before each pass; a denial fails closed (blocker taxonomy #4 on an autonomous run where the user chose this reviewer). Both passes run from `$REVIEW_ROOT` with the same CLI and the shared schema (`razorback:codex-cli` `schemas/review-output.schema.json`; claude strips `$schema`). Dispatch the general pass, then the security pass:

1. **General** — adversarial prompt per the reviewer-prompts file. Record `external_invocations: 1/2` immediately after the call.
2. **Security** — `razorback:security-review` `security-adversarial-prompt.txt`, per the `## Security pass` section of the same file. Record `external_invocations: 2/2` immediately after.

Follow [`reviewer-prompts/codex.md`](reviewer-prompts/codex.md) (`codex-exec … -s read-only`) or [`reviewer-prompts/claude.md`](reviewer-prompts/claude.md) (`claude -p --safe-mode --tools "Read,Grep,Glob" --strict-mcp-config`, no `--max-turns`, no `--max-budget-usd`). The reviewer never edits code.

Count calls even when parsing later fails. Never dispatch a scope twice. If a dispatch fails, `rm -rf -- "$REVIEW_ROOT"` before returning the blocker.

### Redact each pass payload

Build the complete prompt (instruction, optional focus, labelled Target / File stat / Commit log / Lead source evidence / Diff bundle), then filter it and apply the `review-payload.md` contract from razorback:security-review. Payloads over 128 KiB become a review artifact inside `$REVIEW_ROOT`; the prompt file then carries only the bounded static wrapper. Never load the artifact into a shell variable or positional argument.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
printf '%s' "$RENDERED_PROMPT" > "$PAYLOAD_FILE"   # claude: $DIFF_AND_CONTEXT; codex: $ADVERSARIAL_PROMPT_WITH_DIFF
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "outbound redaction failed" >&2
  exit 1
fi
rm -f -- "$PAYLOAD_FILE"
if ! REVIEW_ARTIFACT=$("$SKILL_DIR/../security-review/scripts/prepare-review-artifact" "$REVIEW_ROOT" "$REDACTED_PAYLOAD_FILE"); then
  rm -f -- "$REDACTED_PAYLOAD_FILE"
  rm -rf -- "$REVIEW_ROOT"
  echo "review artifact preparation failed" >&2
  exit 1
fi
REVIEW_PROMPT_FILE="$REDACTED_PAYLOAD_FILE"
if [ "$REVIEW_ARTIFACT" != inline ]; then
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

Use `$REVIEW_PROMPT_FILE` for one pass, then remove the payload files and the artifact path before building the next pass in the same `$REVIEW_ROOT`.

### Step 3: Run and parse each pass

Capture the output directly to `$OUT_DIR/reviewer-output-general.json` and `$OUT_DIR/reviewer-output-security.json` (`$OUT_DIR` is a fresh mktemp directory outside both `$PROJECT_DIR` and `$REVIEW_ROOT`). Validate each output per [`../codex-cli/references/shared-cli-review.md`](../codex-cli/references/shared-cli-review.md); validate each pass against `schemas/review-output.schema.json` via:

```bash
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/reviewer-output-general.json"
"$SKILL_DIR/../codex-cli/scripts/validate-review-output" "$OUT_DIR/reviewer-output-security.json"
```

Do not gate on `jq -e '.findings[]'`; it exits 4 on a valid empty array. Malformed, incomplete, or schema-invalid output is a failed required-reviewer pass: close `blocked` with the consumed count, no retry. Merge both outputs into one list, tagging each finding `general` / `security`. Cost: claude sums `.total_cost_usd` and `.usage` across both passes; codex reports no per-request counts, so note the absence.

After both outputs are parsed (or on any failure path), run `rm -rf -- "$REVIEW_ROOT"` explicitly; do not rely on an `EXIT` trap surviving between harness calls. This is practical reviewer isolation, not host-wide read confinement: a reviewer process can still read absolute host paths its CLI permits.

## Step 4: Verify and classify

Full protocol with examples: [`verification-protocol.md`](verification-protocol.md). Verify every finding against current source with native tools or code-kb and classify:

| Class | Action |
|---|---|
| real-bug | Fix, mandatory |
| real-improvement | Fix unless it expands scope beyond the plan |
| false-positive | Dismiss with a written, evidence-citing reason |
| out-of-scope | Dismiss: "out of scope, filed as follow-up" |

Dedupe: both passes flagging the same file, lines, and root issue collapse into one `dual-flagged` finding; classify, fix, and count it once. No silent dismissals. A real finding whose fix needs human input (architecture, priority trade-off, security boundary) is flagged with a "why uncertain" note, not fixed.

## Step 5: Apply fixes

Evidence first either way. With delegation: one fresh implementer per finding, or one per file when findings cluster, using [`fix-dispatch-prompt.md`](fix-dispatch-prompt.md); parallel only across disjoint files. Without delegation: fix inline, one finding (or one file batch) at a time, using the same template as a checklist. Fresh workers carry no implementation-phase bias.

## Step 6: Local confirmation

After fixes are committed, run the smallest project-defined scope that covers them and inspect only the fix diff. Re-run the branch-gate scope if the fixes invalidate the prior ledger entry; reuse a passing entry for the same HEAD. No external reviewer is dispatched. On failure: one focused fix round, then blocker taxonomy #5 (`razorback:using-razorback` `references/blocker-taxonomy.md`). Do not push a red branch.

## Step 7: Emit the summary

Fill every External review placeholder in `../finishing-a-development-branch/morning-report-template.md`: per-pass counts as returned, total after dedupe, fixed findings with commit SHAs and a one-line summary each, dismissed findings with a reason each, flagged findings with a why-uncertain each, and the one-line cost note. Then the terminal block (`clean`: nothing above the floor open; `capped`: budget exhausted with non-blocking findings open; `blocked`: reviewer failed or an unresolved critical/high meets the taxonomy):

```text
REVIEW CAMPAIGN STATUS
state: clean | capped | blocked
evidence: external-reviewed
round: <current>/2
external_invocations: <used>/2
open_critical_high: <count>
open_medium_low: <count>
open_above_floor: <count>
campaign_closed: yes
```

`campaign_closed: yes` is terminal; the caller hands the block to `finishing-a-development-branch` and dispatches no further reviewer.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "One more review pass will catch what the fixes changed" | The budget is two invocations, ever. Fixes get local confirmation, never a re-review. |
| "Cap the reviewer so this run costs less" | A cap truncates the review mid-flight, and a truncated review gets re-run in full. Scope lives in the prompt. |
| "The reviewer output was garbage — dispatch again" | The invocation is consumed. Malformed output closes the campaign `blocked`. |
| "Skip the security pass, the general pass covered it" | Half a review silently downgrades an explicit user choice. Both passes, or blocked. |
| "The finding is probably right, just fix it" | Verify it against current source first. Reviewers emit noise; rubber-stamping cuts both ways. |

## Red flags

**Never:**

- **Loop external review.** Each pass runs once. Leftover real findings the lead cannot fix get flagged and the PR proceeds.
- **Re-run a burned attempt.** Every call consumes one of the two invocations; malformed output blocks. A long run is working, not stuck.
- **Cap the reviewer.** No `--max-turns`, `--max-budget-usd`, or shortened timeout. The 30-minute timeout is a hung-process failsafe.
- **Let the reviewer edit code.** codex: `-s read-only`; claude: `--tools "Read,Grep,Glob" --strict-mcp-config`.
- **Silently dismiss findings.** Every dismissal carries a written reason the user can override on PR review.
- **Skip verification after fixes.** Never push a branch whose latest verification excludes the fix commits.
- **Ship a PR without the chosen reviewer.** Unavailability in either pass (auth, rate limit, timeout, empty stdout, schema violation) is a blocker: no push, no PR, partial morning report with `Status: Blocked` and the failure in `Blockers hit`.

## It's working if

- Exactly two external invocations were recorded, none after `campaign_closed: yes`.
- Every finding ended fixed, dismissed with a written reason, or flagged with a why-uncertain note.
- The fix diff passed the required verification scope before Step 7.
- `$REVIEW_ROOT` and every payload temp file are gone.
