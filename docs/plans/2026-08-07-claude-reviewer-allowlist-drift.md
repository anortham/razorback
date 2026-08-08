# Claude Reviewer Allowlist Drift Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Make every document that describes the claude pre-merge reviewer state the enforced read-only allowlist (`Read,Grep,Glob`), and add guard tests so this class of copy drift fails CI.

> **Completed; flag summary superseded (v0.29.0, 2026-08-08).** The allowlist fix this plan shipped still stands. The flag summary it prescribes below no longer does: v0.29.0 removed `--max-turns 15` and `--max-budget-usd 5.00` from every review recipe, so the current summary is `--tools "Read,Grep,Glob" --strict-mcp-config --system-prompt-file …`. `tests/reviewer-uncapped.test.mjs` now guards that.

**Architecture:** Documentation alignment plus two guard-test surfaces. The canonical claude invocation (`reviewer-prompts/claude.md` "validated baseline flags") is already correct; four doc sites drifted from it. Tests assert the invariants mechanically instead of relying on "keep in sync" prose.

**Tech Stack:** Markdown skill docs, Node.js built-in test runner (`node:test`), zero dependencies.

**Architecture Quality:** No Architecture Impact — doc alignment and content-invariant tests; no module boundary, interface, or behavior change.

## Global Constraints

- The canonical claude reviewer tool allowlist is exactly `--tools "Read,Grep,Glob"`, always paired with `--strict-mcp-config`. Source of truth: the "validated baseline flags" list in `skills/pre-merge-review/reviewer-prompts/claude.md` (line 59). That file is already correct — do not change its invocation.
- The string `Read,Bash` may appear in exactly one place in the repo's claude documentation: the anti-pattern warning in `skills/claude-cli/SKILL.md` ("Do NOT treat `--tools "Read,Bash"` as read-only…"). It must appear nowhere in `skills/pre-merge-review/`.
- The claude adversarial prompt's REVIEW METHOD tool sentence becomes exactly: `Investigate read-only with the Read, Grep, and Glob tools. Do not modify files.`
- Do NOT modify `skills/codex-cli/adversarial-prompt.txt` or `skills/grok-cli/adversarial-prompt.txt`. Codex enforces read-only via `-s read-only` sandbox; grok's tool-neutral shell wording is correct for its sandbox.
- Preserve the placeholder set and order in `skills/claude-cli/adversarial-prompt.txt`: `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, `{{REVIEW_INPUT}}`.
- No version bump and no release in this plan. Release is a separate post-merge action with its own approval.

## Context — 2026-08-07 assessment findings (preserved here so they are not lost)

Full assessment: Goldfish checkpoint `checkpoint_4aceb150` (`.memories/2026-08-07/114631_4ace.md`, committed with this branch).

### Drift defects this plan fixes

| # | Site | Defect |
|---|------|--------|
| 1 | `skills/pre-merge-review/SKILL.md:109` | Claude reviewer flag summary says `--tools "Read,Bash"` and omits `--strict-mcp-config`. Contradicts the canonical invocation and the file's own red-flags section (line 199). Followed literally, it runs a write-capable "read-only" reviewer under `--dangerously-skip-permissions`. |
| 2 | `skills/pre-merge-review/SKILL.md:109` and `:111` | Claims the reviewer-prompts files are "self-contained" / "inline the schema content". Both files actually read the canonical schema (and claude the canonical adversarial prompt) from the plugin at dispatch time. |
| 3 | `skills/claude-cli/adversarial-prompt.txt:28` | REVIEW METHOD tells the reviewer to use Bash. The claude invocation allowlist blocks Bash. Wording predates the hardening of the invocation to `Read,Grep,Glob`. |
| 4 | `skills/claude-cli/SKILL.md:286` and `skills/pre-merge-review/reviewer-prompts/codex.md:115` | Both describe the claude prompt variant as "referencing/naming Claude's `Read`/`Bash` tools" — the documented divergence that seeded defect 3. |
| 5 | No guard test | Nothing lints these copies. The 2026-07-26 grok-cli incident checkpoint proposed a guard for exactly this drift class; it was never built. |

### Deferred follow-ups (out of scope here; recorded so they survive)

1. **CI/DevOps PR reviewer** — pipeline template (Azure DevOps + GitHub Actions) that runs the existing adversarial reviewer + shared `review-output.schema.json` against a PR diff and posts findings as PR comments. Razorback already owns the schema, prompts, and validated headless invocations.
2. **Security lane at the branch gate** — secrets scan, dependency/CVE audit, security-weighted adversarial prompt. Today's flow has one "Security concerns?" bullet plus the adversarial attack-surface list.
3. **Data-governance precondition** — org-configurable provider allowlist and data-classification check before any diff leaves the machine (pre-merge-review, codex-cli, grok-cli, claude-cli, cross-model-convergence). No skill mentions sensitive data today.
4. **Org rollout kit** — internal marketplace mirror, pinned razorback/Miller/Goldfish versions, install-check script, PR template requiring the morning-report block.
5. **Example-command linter vs. CLI `--help`** — the broader guard from the 2026-07-26 incident. Needs the CLIs installed in CI; this plan ships the narrower content-invariant guards instead.
6. **Memories data-classification note** — policy for what may not enter committed `.memories/` checkpoints.

## Verification Strategy

**Project source of truth:** `CLAUDE.md` ("`npm test` runs the guard suite in `tests/*.test.mjs`"); CI (`.github/workflows/test.yml`) runs `npm test` then `./scripts/bump-version.sh --audit`.

**Worker red/green scope:** `node --test tests/claude-cli-docs.test.mjs tests/adversarial-prompt-sync.test.mjs`

**Worker ceiling:** `npm test`

**Worker gate invariant:** Before the doc fixes, the new no-`Read,Bash` guard and the new prompt-tool-sentence guard FAIL, each naming the defective file. The new bash-block-allowlist guard and trio-sync guard PASS before and after (they are regression guards for already-correct content). After the doc fixes, all guards pass.

**Lead affected-change scope:** `npm test`

**Branch gate:** `npm test && ./scripts/bump-version.sh --audit`

**Replay/metric evidence:** Not applicable — no runtime behavior in this repo.

**Escalation triggers:** Any needed edit to `codex-cli/adversarial-prompt.txt`, `grok-cli/adversarial-prompt.txt`, or any rule-copy-guarded file (`tests/rule-copies.test.mjs` set) is a plan mismatch — stop and report.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp for the red run, the green run, and the branch gate.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Guard tests + doc alignment | None - serial | Modify: `skills/pre-merge-review/SKILL.md`, `skills/claude-cli/adversarial-prompt.txt`, `skills/claude-cli/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `tests/claude-cli-docs.test.mjs`. Create: `tests/adversarial-prompt-sync.test.mjs` | Not applicable - single task. | Not applicable - single task. |

## Task 1: Guard tests + doc alignment (one TDD slice)

**Files:**
- Modify: `skills/pre-merge-review/SKILL.md:104-111` (Step 2 reviewer bullets + schema paragraph)
- Modify: `skills/claude-cli/adversarial-prompt.txt:22-29` (REVIEW METHOD)
- Modify: `skills/claude-cli/SKILL.md:281-290` ("Adversarial Prompt Template" section)
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md:113-115` ("Adversarial prompt template" section)
- Test: `tests/claude-cli-docs.test.mjs` (extend)
- Test: `tests/adversarial-prompt-sync.test.mjs` (create)

**Interfaces:**
- Consumes: current file contents verified 2026-08-07 at the line numbers above; the canonical flag list at `reviewer-prompts/claude.md:59`.
- Produces: doc invariants later work can rely on — the allowlist string `--tools "Read,Grep,Glob"` + `--strict-mcp-config` is the only tool configuration named for claude reviewer invocations, and the guard tests enforce it.

**Contract inputs:** Exact replacement strings from `## Global Constraints`. Existing test helpers in `tests/claude-cli-docs.test.mjs` (`read()`, `commandBlockHasBare()`); follow that file's assertion style (`node:assert/strict`, message strings that explain the failure and the fix).

**File ownership:** Modify: `skills/pre-merge-review/SKILL.md`, `skills/claude-cli/adversarial-prompt.txt`, `skills/claude-cli/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `tests/claude-cli-docs.test.mjs`. Create: `tests/adversarial-prompt-sync.test.mjs`

**Serialization required:** Not applicable - single task.

**Dependency reason:** Not applicable - single task.

**What to build:** Write the four guard tests first and watch the two defect-targeting guards fail (red), then apply the four doc edits and watch everything pass (green). TDD applies; the guards ARE the failing tests for the doc defects.

**Approach — guard tests:**

Extend `tests/claude-cli-docs.test.mjs` with two tests:

1. *Bash-block allowlist guard:* extract every fenced ```` ```bash ```` block from `skills/claude-cli/SKILL.md`, `skills/pre-merge-review/SKILL.md`, and `skills/pre-merge-review/reviewer-prompts/claude.md`. In every block that contains both `claude -p` and `--tools`, assert the tools flag is exactly `--tools "Read,Grep,Glob"` and the block also contains `--strict-mcp-config`. (Passes pre-fix — regression guard for the already-correct invocations.)
2. *No-`Read,Bash` guard:* assert `Read,Bash` appears nowhere in `skills/pre-merge-review/SKILL.md` or `skills/pre-merge-review/reviewer-prompts/claude.md`, and in `skills/claude-cli/SKILL.md` only on lines matching `/Do NOT treat/`. (FAILS pre-fix on `pre-merge-review/SKILL.md:109` — this is the red test for defect 1.)

Create `tests/adversarial-prompt-sync.test.mjs` with two tests:

3. *Claude prompt tool-sentence guard:* `skills/claude-cli/adversarial-prompt.txt` must not match `/\bBash\b/`, must contain the exact sentence `Investigate read-only with the Read, Grep, and Glob tools. Do not modify files.`, and must keep the placeholder order `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, `{{REVIEW_INPUT}}`. (FAILS pre-fix — the red test for defect 3.)
4. *Trio-sync guard:* across `skills/{codex-cli,claude-cli,grok-cli}/adversarial-prompt.txt`, the `OPERATING STANCE`, `ATTACK SURFACE`, `FINDING BAR`, `CALIBRATION`, and `GROUNDING` sections are byte-identical, and line 1 differs only in the model name (`Codex`/`Claude`/`Grok`). This mechanically enforces the "keep the three in sync" instruction in `claude-cli/SKILL.md`. (Passes pre-fix and post-fix — REVIEW METHOD is intentionally per-variant and stays excluded.)

**Approach — doc edits (apply after red is confirmed):**

- `skills/pre-merge-review/SKILL.md:109`: in the claude bullet, change the flag summary to `--tools "Read,Grep,Glob" --strict-mcp-config --max-turns 15 --max-budget-usd 5.00`, and replace "The reviewer-prompts file is self-contained (schema + adversarial system prompt are inlined)" with wording stating the file reads the canonical schema and claude-cli's canonical adversarial prompt from the plugin at dispatch time.
- `skills/pre-merge-review/SKILL.md:111`: replace "The reviewer-prompts files inline the schema content so invocations need no install-path knowledge." with "Both reviewer-prompts files read the schema from that canonical file at dispatch time (claude strips the `$schema` key its validator rejects)."
- `skills/claude-cli/adversarial-prompt.txt:28-29`: replace "Use Read to inspect files and Bash for read-only investigation (grep, git log, diff). Do not modify files." with the exact sentence from Global Constraints.
- `skills/claude-cli/SKILL.md:286-287`: change "the only Claude-specific adaptation is the REVIEW METHOD line referencing `Read` and `Bash` (Claude's native tool names)" to reference "`Read`, `Grep`, and `Glob` (the invocation's allowlisted tools)".
- `skills/pre-merge-review/reviewer-prompts/codex.md:115`: change "naming Claude's `Read`/`Bash` tools" to "naming Claude's `Read`/`Grep`/`Glob` tools".

**Acceptance criteria:**
- [x] Red confirmed: guards 2 and 3 fail before the doc edits, each failure message naming the defective file; guards 1 and 4 pass. (Run 2026-08-07: 8 pass / 2 fail — exactly the two defect guards.)
- [x] All five doc edits applied exactly as specified; no other content changed in those files.
- [x] Green confirmed: `node --test tests/claude-cli-docs.test.mjs tests/adversarial-prompt-sync.test.mjs` passes (10/10).
- [x] Branch gate passes: `npm test` 175/175 (169 pre-existing + 6 new, 0 failures) and `./scripts/bump-version.sh --audit` clean at 0.26.2.
- [x] `Read,Bash` absent from `skills/pre-merge-review/`; present in `skills/claude-cli/SKILL.md` only in the anti-pattern warning line (proven by the passing guard).
- [x] Worker-scope verification passes and the change is committed per commit mode (`serial-worker-commit`), with `.memories/2026-08-07/114631_4ace.md` and a fresh pre-commit checkpoint included in the commit.
