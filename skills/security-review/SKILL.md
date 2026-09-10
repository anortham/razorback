---
name: security-review
description: Use when running a security review, a secrets scan, or a dependency/CVE audit, when the branch gate needs its security scopes, when checking or declaring the external-model policy, or when asking "can I send this diff to codex/claude/grok/cursor".
---

# Security Review

Canonical home of razorback's security lane: two scan scopes at the branch gate, the external-model policy gate every outbound dispatch checks, the outbound redaction helper, and the checklist blocks other skills copy verbatim.

**Core principle:** Nothing ships with a secret in it, and no diff leaves the machine against the repo's policy.

## Scan Scopes

The plan declares the real commands for each scope or writes `none declared`; silence is not allowed, and `none declared` is rendered in the morning report. Both scopes run at the branch gate before push or PR. The quick-fix tier (razorback:fixing-small-issues) already defers suite-level verification to the branch gate.

For a missing declared scanner or a security finding, diagnose, repair, and rerun the failed scope while a safe, plan-consistent recovery path remains, with the branch kept local (no push, no PR). Missing tooling becomes blocker taxonomy #1, and a non-converging finding becomes the applicable blocker, only after safe, plan-consistent recovery paths are exhausted. Recovery never weakens the gates below or substitutes an unapproved scanner skip.

### `security-secrets` — whole-tree secrets scan

Example default: `gitleaks detect`. **Any finding is a HARD GATE: no push, no PR.** Suppress false positives only in the tool's own baseline/ignore mechanism and record each suppression in the morning report as a judgment call.

### `security-deps` — dependency/CVE audit

Example default: `osv-scanner`; per-ecosystem alternates: `npm audit`, `pip-audit`, `cargo audit`, `dotnet list package --vulnerable`. **HARD GATE on critical/high severity; report-only below**, rendered into the morning report.

## External-Model Policy Gate

Read from the target repo's project instructions (CLAUDE.md / AGENTS.md):

```markdown
## External model policy
Allowed providers: anthropic, openai
Reviewer choices permitted: codex, claude
```

- `Allowed providers:` is a comma list from `anthropic, openai, xai, cursor, google`, or `any`.
- `Reviewer choices permitted:` is a subset of `codex, claude`, or `none`.

The policy governs any external dispatch that carries repo content, delegation with write sandboxes as much as reviews.

### Provider mapping

| Skill | Provider |
|-------|----------|
| claude-cli | anthropic |
| codex-cli | openai |
| grok-cli | xai |
| cursor-agent | cursor |
| agy-cli | google |

cross-model-convergence requires every participating model's provider to be allowed.

### Check procedure

Run at every enforcement point, every time, before repo content leaves the machine:

1. Read the policy block from the target repo's project instructions.
2. Block present and the provider is allowed → proceed.
3. Block present and the provider is denied → refuse the dispatch, name an allowed alternative, and record the refusal in the morning report. On an autonomous run where the user explicitly chose the denied provider, this is blocker taxonomy #4 — STOP; do not silently substitute another provider.
4. When no policy block exists, proceed, and add the loud morning-report note: `no external-model policy declared — diff sent to <provider>`.

**Reviewer dispatches (pre-merge review and standalone review):** re-read the policy at dispatch time; validation at plan approval does not carry forward. When a policy block exists, the provider must be allowed. When a policy block exists, the chosen reviewer must also appear in `Reviewer choices permitted:` for pre-merge review dispatches. Standalone reviewer CLI dispatches (`agy-cli`, `grok-cli`, `codex-cli`, `claude-cli`) are authorized by their mapped provider in `Allowed providers:`. A denial follows step 3, including blocker taxonomy #4 on an autonomous run. With no block, step 4 applies; do not manufacture an allowlist requirement.

**Security pass:** whenever a reviewer is chosen for a run, pre-merge review runs a dedicated security pass built from this skill's `security-adversarial-prompt.txt`; mechanics live in razorback:pre-merge-review.

## Outbound Payload Redaction

`skills/security-review/scripts/redact-outbound` reads the fully constructed prompt, diff, or report on stdin and writes the same shape with sensitive matches replaced by `<REDACTED>`; it never prints matched material. Every enforcement point runs it immediately before dispatch and sends only the redacted artifact. A nonzero status is a failed dispatch: remove temporary artifacts, report the generic failure, and stop before invoking the provider. Do not log the original payload or any matched value.

```bash
PAYLOAD_FILE=$(mktemp)
REDACTED_PAYLOAD_FILE=$(mktemp)
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < "$PAYLOAD_FILE" > "$REDACTED_PAYLOAD_FILE"; then
  rm -f -- "$PAYLOAD_FILE" "$REDACTED_PAYLOAD_FILE"
  echo "outbound redaction failed" >&2
  exit 1
fi
```

Write the final payload to `PAYLOAD_FILE`, dispatch from `REDACTED_PAYLOAD_FILE`, and remove both after the provider returns.

## Security Checklist

Canonical five questions, duplicated verbatim (test-guarded) at `skills/requesting-code-review/code-reviewer.md` and `skills/subagent-driven-development/code-quality-reviewer-prompt.md`. Edit here and update both copies to match.

**Security:**
- No secrets, credentials, tokens, or connection strings in the diff?
- Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
- Authorization checked on new or changed routes/APIs?
- New dependencies vetted (source, maintenance, known CVEs)?
- No sensitive data written to logs or error messages?

## Redact

Canonical three rules, duplicated verbatim (test-guarded) at `skills/systematic-debugging/SKILL.md`. Edit here and update that copy to match.

**Redact:**
- Redact every secret in anything you show, quote, or send — write `<REDACTED>` in its place.
- Build loops against env vars so the credential stays in the environment rather than in displayed output.
- From captured artifacts, quote only the lines that carry the signal.

## Anti-Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The diff is tiny, skip the scan" | Secrets ship in one-line diffs. |
| "Internal repo, no policy needed" | The policy block is how "internal" becomes a checked fact instead of a guess. No block → the loud no-policy note, every time. |
| "The reviewer model is trustworthy" | Trust is not the question. The policy decides where repo content may go; the org decides the policy, not the model's reputation. |
| "The scan is slow, run it after the PR" | After the PR the secret is already in the remote's history. The gate sits before push because push is the point of no return. |
| "It's a false positive, just ignore it" | Suppress it in the tool's own baseline/ignore mechanism and record the judgment call. An untracked suppression is an unscanned line. |

## Integration

**Policy gate callers:** razorback:codex-cli, razorback:claude-cli, razorback:grok-cli, razorback:agy-cli, razorback:cursor-agent, razorback:cross-model-convergence, razorback:pre-merge-review, razorback:requesting-code-review Mode 2.

**Scan scope callers:** razorback:writing-plans requires the Security scope line in every plan and validates the chosen pre-merge reviewer at plan approval; razorback:finishing-a-development-branch runs the scopes at the branch gate and renders `{{policy_status}}` and the `none declared` note in the morning report.
