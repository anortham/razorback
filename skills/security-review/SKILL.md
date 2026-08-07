---
name: security-review
description: Use when running a security review, a secrets scan, or a dependency/CVE audit, when the branch gate needs its security scopes, when checking or declaring the external-model policy, or when asking "can I send this diff to codex/claude/grok/cursor".
---

# Security Review

The canonical home of razorback's security lane: two mechanical scan scopes at the branch gate, the external-model policy gate every outbound dispatch checks, and the canonical security checklist that review touchpoints copy verbatim.

**Core principle:** Nothing ships with a secret in it, and no diff leaves the machine against the repo's policy.

## Scan Scopes

Razorback owns the scope boundaries; the target repo's plan declares the real commands — the same split as the existing branch gate. A plan must declare its Security scope explicitly or write `none declared`. Silence is not allowed. `none declared` is rendered in the morning report so the opt-out stays visible.

Both scopes run at the branch gate, before push or PR. The quick-fix tier (razorback:fixing-small-issues) is unaffected — it already defers suite-level verification to the branch gate.

A declared scanner that is missing or not installed is a branch-gate failure on environmental grounds — blocker taxonomy #1. Stop; do not push.

### `security-secrets` — whole-tree secrets scan

Example default: `gitleaks detect`.

**Any finding is a HARD GATE: no push, no PR.** False positives are suppressed only in the tool's own baseline/ignore mechanism — never by skipping the scan or waving the finding through. Each suppression is recorded in the morning report as a judgment call.

### `security-deps` — dependency/CVE audit

Example default: `osv-scanner` (language-neutral). Per-ecosystem alternates: `npm audit`, `pip-audit`, `cargo audit`, `dotnet list package --vulnerable`.

**HARD GATE on critical/high severity; report-only below.** Report-only findings are rendered into the morning report.

## External-Model Policy Gate

The policy block is read from the target repo's project instructions (CLAUDE.md / AGENTS.md). Canonical format:

```markdown
## External model policy
Allowed providers: anthropic, openai
Reviewer choices permitted: codex, claude
```

- `Allowed providers:` is a comma list from `anthropic, openai, xai, cursor`, or `any`.
- `Reviewer choices permitted:` is a subset of `codex, claude`, or `none`.

The policy governs any external dispatch that carries repo content — delegation with write sandboxes as much as reviews.

### Provider mapping

| Skill | Provider |
|-------|----------|
| claude-cli | anthropic |
| codex-cli | openai |
| grok-cli | xai |
| cursor-agent | cursor |

cross-model-convergence requires every participating model's provider to be allowed.

### Check procedure

Run this before any diff or repo content leaves the machine — at every enforcement point, every time:

1. Read the policy block from the target repo's project instructions.
2. Block present and the provider is allowed → proceed.
3. Block present and the provider is denied → refuse the dispatch, name an allowed alternative, and record the refusal in the morning report. On an autonomous run where the user explicitly chose the denied provider, this is blocker taxonomy #4 — STOP; do not silently substitute another provider.
4. No block → proceed, and add the loud morning-report note: `no external-model policy declared — diff sent to <provider>`.

**Reviewer dispatches (pre-merge review and standalone review):** re-read the policy at dispatch time — validation at plan approval does not carry forward. The provider must be allowed AND the chosen reviewer must also appear in `Reviewer choices permitted:`. A reviewer absent from that list is a denial: follow step 3, including blocker taxonomy #4 on an autonomous run where the user explicitly chose that reviewer.

## Security Checklist

These five questions are the canonical security checklist. They are duplicated verbatim (test-guarded) at `skills/requesting-code-review/code-reviewer.md` (the standalone reviewer prompt) and `skills/subagent-driven-development/code-quality-reviewer-prompt.md` (the lead's inline review). If you edit the questions here, update those two copies to match — the same convention `skills/architecture-quality/SKILL.md` uses for its checklist.

**Security:**
- No secrets, credentials, tokens, or connection strings in the diff?
- Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
- Authorization checked on new or changed routes/APIs?
- New dependencies vetted (source, maintenance, known CVEs)?
- No sensitive data written to logs or error messages?

## Anti-Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The diff is tiny, skip the scan" | Secrets ship in one-line diffs. |
| "Internal repo, no policy needed" | The policy block is how "internal" becomes a checked fact instead of a guess. No block → the loud no-policy note, every time. |
| "The reviewer model is trustworthy" | Trust is not the question. The policy decides where repo content may go; the org decides the policy, not the model's reputation. |
| "The scan is slow, run it after the PR" | After the PR the secret is already in the remote's history. The gate sits before push because push is the point of no return. |
| "It's a false positive, just ignore it" | Suppress it in the tool's own baseline/ignore mechanism and record the judgment call. An untracked suppression is an unscanned line. |

## Integration

**Called from (policy gate):** razorback:codex-cli, razorback:claude-cli, razorback:grok-cli, razorback:cursor-agent, razorback:cross-model-convergence, razorback:pre-merge-review, and razorback:requesting-code-review Mode 2 — every point where a diff or repo content leaves the machine.

**Called from (scan scopes):** razorback:writing-plans requires the Security scope line in every plan and validates the chosen pre-merge reviewer against the policy block at plan approval; razorback:finishing-a-development-branch runs the scopes at the branch gate, renders `{{policy_status}}` in the morning report, and renders the `none declared` note when no scope was declared.
