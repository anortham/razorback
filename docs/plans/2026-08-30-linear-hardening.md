# Razorback Linear hardening implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Close the actionable Razorback Linear backlog with collision-proof SDD workspaces, shared outbound redaction, practical reviewer isolation, repository policy dogfooding, and bounded workflow-contract repairs.

**Architecture:** Keep each new behavior behind one small script interface. `sdd-workspace` alone owns plan-key normalization and compatibility, `security-review/scripts/redact-outbound` alone owns payload sanitization, and `pre-merge-review/scripts/prepare-review-tree` alone owns temporary review-tree preparation. Skills invoke those interfaces and tests exercise the scripts through controlled inputs.

**Tech Stack:** Bash, Node.js 22 built-ins, `node:test`, Markdown skill contracts, Git, Goldfish, Linear MCP.

**Architecture Quality:** Medium risk. The caller-facing interfaces are one-input/one-output scripts; security-sensitive policy stays local, and tests use the same script interfaces that skills call. No container layer, new dependency, or speculative adapter is introduced.

## Global Constraints

- Follow `docs/plans/2026-08-30-linear-hardening-design.md` exactly.
- Keep BRE-47 practical: reduce live-worktree and branch-customization exposure without claiming host-wide filesystem confinement.
- Keep BRE-26 parked.
- Use Node.js built-ins only; add no package dependency.
- Use the literal `<REDACTED>` for every outbound replacement and never print a matched secret.
- The SDD key format is `<basename>-<12 lowercase SHA-256 hex characters>` derived from the normalized repository-relative plan path.
- External-model policy values are exactly `Allowed providers: anthropic, openai` and `Reviewer choices permitted: codex, claude`.
- Verified local CLI surfaces: Claude Code 2.1.251 supports `--safe-mode` with `--tools "Read,Grep,Glob" --strict-mcp-config`; Codex CLI 0.151.0 supports `--skip-git-repo-check`, `--ignore-user-config`, and `--ignore-rules`.
- Apply razorback:test-driven-development and `skills/test-driven-development/writing-good-tests.md` to every changed or new test.

## Verification Strategy

**Project source of truth:** `CLAUDE.md`, `package.json`, `.github/workflows/test.yml`, and `.version-bump.json`.

**Worker red/green scope:** Run the owned focused test file with `node --test <owned-test-file>` and show the expected RED failure before implementation, then GREEN after implementation.

**Worker ceiling:** The focused tests named by the task. Workers do not run `npm test`, the version audit, gitleaks, or live external-model review calls.

**Worker gate invariant:** Each focused test proves its owned caller-facing script behavior or workflow contract. Every worker report names the realistic mutation each test catches.

**Lead affected-change scope:** After each coherent batch, run the touched focused tests together plus `git diff --check`.

**Branch gate:** Run `npm test` and `./scripts/bump-version.sh --audit` at current HEAD.

**Security scope:** `security-secrets`: `gitleaks detect --redact=100`. `security-deps`: `none declared` because the plan adds no dependency.

**Replay/metric evidence:** No replay or metric gates. Test failures are hard gates; test duration is report-only.

**Escalation triggers:** Run the live no-content CLI flag probes only if documented command shape changes or focused fixtures reveal a startup failure. Do not send repository content during worker verification.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp. If the same HEAD already has a passing ledger entry for the required scope, reuse it instead of rerunning the same gate.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Collision-proof SDD plan keys | Batch A | `skills/subagent-driven-development/scripts/sdd-workspace`, `skills/subagent-driven-development/scripts/task-brief`, `skills/subagent-driven-development/scripts/review-package`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `tests/sdd-workspace.test.mjs`, `tests/borrowed-superpowers.test.mjs` | No | None - safe parallel batch. |
| Task 2: Temporary reviewer tree and safe-mode wiring | Batch A | Create `skills/pre-merge-review/scripts/prepare-review-tree`, create `tests/pre-merge-review-isolation.test.mjs`, modify `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `tests/claude-cli-docs.test.mjs` | No | None - safe parallel batch. |
| Task 3: Shared outbound redaction and repository policy | None - serial | Create `skills/security-review/scripts/redact-outbound`, create `tests/outbound-redaction.test.mjs`, modify `skills/security-review/SKILL.md`, `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/requesting-code-review/SKILL.md`, `CLAUDE.md`, `tests/security-checklist-sync.test.mjs` | Yes | Depends on Task 2's final pre-merge command and payload flow; overlaps `skills/pre-merge-review/SKILL.md`. |
| Task 4: Close the four consistency drifts | None - serial | Create `tests/upstream-consistency.test.mjs`, modify `skills/requesting-code-review/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/using-razorback/references/blocker-taxonomy.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md` | Yes | Depends on Tasks 1 and 3 because it overlaps their active workflow files and must describe the final contracts. |
| Task 5: Close durable project state | None - lead integration | Goldfish brief `agent-tier-delegation-gate-policy-feedback`; Linear issues BRE-44 through BRE-50 | Yes | Lead-owned strategic and integration action after the branch gate passes; BRE-26 remains untouched. |

### Task 1: Collision-proof SDD plan keys

**Files:**
- Modify: `skills/subagent-driven-development/scripts/sdd-workspace`
- Modify: `skills/subagent-driven-development/scripts/task-brief`
- Modify: `skills/subagent-driven-development/scripts/review-package`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/fix-prompt.md`
- Test: `tests/sdd-workspace.test.mjs`
- Test: `tests/borrowed-superpowers.test.mjs`

**Interfaces:**
- Consumes: a committed plan file path accepted by `sdd-workspace PLAN_FILE`.
- Produces: one worktree-local artifact directory keyed as `<basename>-<12 lowercase hex>`; existing task-brief and review-package callers continue to consume the returned path.

**Contract inputs:** Node.js 22 `node:fs`, `node:path`, and `node:crypto`; ledger identity header `# Razorback SDD ledger — plan: <plan file path>`; repository containment and symlink guards.

**File ownership:** `skills/subagent-driven-development/scripts/sdd-workspace`, `skills/subagent-driven-development/scripts/task-brief`, `skills/subagent-driven-development/scripts/review-package`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `tests/sdd-workspace.test.mjs`, `tests/borrowed-superpowers.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Replace basename-only keying with canonical repository-relative path normalization plus a 12-character SHA-256 suffix. Reject outside-repository plans, perform containment checks before creating directories, and reuse a legacy basename directory only when its ledger identity belongs to the same plan.

**Approach:** Write behavior tests first for same-basename separation, equivalent-path stability, outside-root rejection, legacy resume, and the no-outside-write symlink case. Keep hashing and path normalization inside `sdd-workspace`; update help text and active skill contracts from `<plan-basename>` to `<plan-key>` without editing historical plans.

**Acceptance criteria:**
- [x] Two `plan.md` files under different repository directories resolve to different artifact directories.
- [x] Absolute, relative, and normalized spellings of one plan resolve to the same directory.
- [x] A plan outside the repository exits 2 without creating an artifact directory.
- [x] A matching legacy ledger resumes safely; a mismatched ledger is never shared.
- [x] A pre-planted outside symlink remains completely untouched.
- [x] Worker-scope verification passes and the change is handed to the lead per `parallel-lead-commit`.

### Task 2: Temporary reviewer tree and safe-mode wiring

**Files:**
- Create: `skills/pre-merge-review/scripts/prepare-review-tree`
- Create: `tests/pre-merge-review-isolation.test.mjs`
- Modify: `skills/pre-merge-review/SKILL.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/claude.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md`
- Modify: `tests/claude-cli-docs.test.mjs`

**Interfaces:**
- Consumes: repository path, reviewed Git ref, and an explicit output directory outside the repository.
- Produces: an exported tracked tree with no live `.git`, no untracked files, and no escaping symlinks; pre-merge reviewer adapters run from this path.

**Contract inputs:** Existing two-pass structured-output contract; Claude 2.1.251 `--safe-mode`; Codex 0.151.0 `--skip-git-repo-check`, `--ignore-user-config`, and `--ignore-rules`; practical-isolation residual-risk wording from the approved design.

**File ownership:** Create `skills/pre-merge-review/scripts/prepare-review-tree`, create `tests/pre-merge-review-isolation.test.mjs`, modify `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `tests/claude-cli-docs.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Add a tested export helper and make pre-merge review create, pass, and explicitly clean one temporary review root across both reviewer passes. Claude uses safe mode with its existing read-only allowlist and strict MCP config. Codex accepts the non-git export and ignores user/project rules and configuration.

**Approach:** Test the helper through temporary Git repositories. Prove untracked files are absent, external symlinks are neutralized, the output root is outside the source repository, and cleanup does not rely on one shell's `EXIT` trap. Guard exact live-verified CLI flags without making an external model call.

**Acceptance criteria:**
- [ ] Reviewer execution uses the exported tree rather than the live worktree.
- [ ] The export contains tracked review material but no live `.git`, untracked files, or escaping symlink.
- [ ] Claude reviewer commands include the verified safe-mode combination.
- [ ] Codex reviewer commands support the non-git export and ignore rules/config.
- [ ] The skill states that practical isolation is not host-wide read confinement.
- [ ] Worker-scope verification passes and the change is handed to the lead per `parallel-lead-commit`.

### Task 3: Shared outbound redaction and repository policy

**Files:**
- Create: `skills/security-review/scripts/redact-outbound`
- Create: `tests/outbound-redaction.test.mjs`
- Modify: `skills/security-review/SKILL.md`
- Modify: `skills/claude-cli/SKILL.md`
- Modify: `skills/codex-cli/SKILL.md`
- Modify: `skills/grok-cli/SKILL.md`
- Modify: `skills/cursor-agent/SKILL.md`
- Modify: `skills/cross-model-convergence/SKILL.md`
- Modify: `skills/pre-merge-review/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `CLAUDE.md`
- Test: `tests/security-checklist-sync.test.mjs`

**Interfaces:**
- Consumes: an outbound prompt, diff, or report on standard input plus the current process environment.
- Produces: the same payload shape with sensitive matches replaced by `<REDACTED>`; failure returns nonzero and dispatch does not proceed.

**Contract inputs:** Canonical seven-entry `ENFORCEMENT_POINTS`; sensitive environment-name markers; private-key blocks; provider token forms; credential URL authority; common assignment forms; canonical external-model policy block.

**File ownership:** Create `skills/security-review/scripts/redact-outbound`, create `tests/outbound-redaction.test.mjs`, modify `skills/security-review/SKILL.md`, `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/grok-cli/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/requesting-code-review/SKILL.md`, `CLAUDE.md`, `tests/security-checklist-sync.test.mjs`

**Serialization required:** Yes

**Dependency reason:** Depends on Task 2's final pre-merge command and payload flow; overlaps `skills/pre-merge-review/SKILL.md`.

**What to build:** Implement dependency-free deterministic redaction and wire it immediately before every external dispatch. Extend the existing enforcement-point guard so policy and redaction coverage share the same seven-entry source. Add the exact repository policy block to `CLAUDE.md`.

**Approach:** Start with table-driven literal fixtures that name the leak each case catches. Include multiple occurrences, empty input, ordinary lookalikes that must survive, secret values from environment variables, private keys, tokens, URLs, and assignments. Never log original matches, and fail closed if input processing fails.

**Acceptance criteria:**
- [ ] Every supported secret form is replaced with exactly `<REDACTED>` and benign input remains unchanged.
- [ ] Exact sensitive environment values are redacted without printing those values elsewhere.
- [ ] All seven enforcement points invoke the helper on the constructed outbound payload.
- [ ] Dispatch halts on redaction failure.
- [ ] `CLAUDE.md` contains the exact approved provider and reviewer policy values.
- [ ] Focused worker verification passes and the worker commits owned files per `serial-worker-commit`.

### Task 4: Close the four consistency drifts

**Files:**
- Create: `tests/upstream-consistency.test.mjs`
- Modify: `skills/requesting-code-review/code-reviewer.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/cursor-agent/SKILL.md`
- Modify: `skills/using-razorback/references/blocker-taxonomy.md`
- Modify: `skills/subagent-driven-development/spec-reviewer-prompt.md`
- Modify: `skills/subagent-driven-development/SKILL.md`

**Interfaces:**
- Consumes: canonical mutation-check wording, the SDD three-way cap adjudication contract, task-brief path wording, and Miller workspace refresh semantics.
- Produces: consistent active workflow instructions and one focused drift guard.

**Contract inputs:** Three cap outcomes are `contested`, `real-but-deferred`, and `real-and-load-bearing`; only the load-bearing outcome stops. The task brief is the single source of requirements. Refresh Miller after a completed write batch and before the next dispatch.

**File ownership:** Create `tests/upstream-consistency.test.mjs`, modify `skills/requesting-code-review/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/using-razorback/references/blocker-taxonomy.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md`

**Serialization required:** Yes

**Dependency reason:** Depends on Tasks 1 and 3 because it overlaps their active workflow files and must describe the final contracts.

**What to build:** Make only the four BRE-49 consistency edits and add a focused guard that fails when any one drifts. Do not widen this task into reviewer-output naming, historical plan cleanup, or unrelated checklist changes.

**Approach:** Write the guard first with one assertion per named gap. Use canonical wording or a direct cross-reference instead of copying the whole cap contract. Keep Miller refresh in the parallel-dispatch flow where file-write batches actually occur.

**Acceptance criteria:**
- [ ] The standalone reviewer Testing checklist requires the mutation check.
- [ ] Requesting-code-review, cursor-agent, and blocker taxonomy point to the three-way cap contract.
- [ ] The spec-reviewer prompt points to the task brief instead of embedding full task text.
- [ ] SDD requires Miller refresh after a write batch and before another dispatch.
- [ ] No unrelated cleanup enters the diff.
- [ ] Focused worker verification passes and the worker commits owned files per `serial-worker-commit`.

### Task 5: Close durable project state

**Files:**
- Modify through Goldfish: brief `agent-tier-delegation-gate-policy-feedback`
- Modify through Linear: BRE-44, BRE-45, BRE-46, BRE-47, BRE-48, BRE-49, BRE-50

**Interfaces:**
- Consumes: passing branch-gate and security evidence at current HEAD.
- Produces: the stale brief archived as superseded and completed Linear issues moved to Done; BRE-26 remains Backlog/Parked.

**Contract inputs:** User-approved resolution for BRE-50; final task/verification ledger; exact Linear issue identifiers.

**File ownership:** Goldfish brief and Linear issue state only; no repository files.

**Serialization required:** Yes

**Dependency reason:** Lead-owned strategic and integration action after the branch gate passes; BRE-26 remains untouched.

**What to build:** No code. The lead archives the superseded brief and updates only the completed Linear issues after all repository acceptance criteria and security gates pass.

**Approach:** Re-read the brief before archiving it. Add concise completion comments or state updates that point to the verified branch outcome. Do not close BRE-26.

**Acceptance criteria:**
- [ ] The stale agent-tier brief is no longer active and records that current model-neutral verification ownership superseded it.
- [ ] BRE-44 through BRE-50 are Done only after their acceptance criteria pass.
- [ ] BRE-26 remains parked.
- [ ] Lead records the state changes in the final report.
