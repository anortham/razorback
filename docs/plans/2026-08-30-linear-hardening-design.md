# Razorback Linear hardening design

**Date:** 2026-08-30
**Status:** Approved in conversation; pending written-spec review
**Issues:** BRE-44 through BRE-50, excluding parked BRE-26

## Goal

Close the actionable Razorback Linear backlog with one focused hardening change: prevent SDD workspace collisions, redact constructed outbound payloads, dogfood the external-model policy, reduce live-worktree exposure during pre-merge review, and repair the four recorded workflow-contract drifts.

## Scope decisions

- BRE-44 uses a readable plan key: the plan basename plus a 12-character SHA-256 digest of its normalized repository-relative path.
- BRE-45 adds one executable redaction helper and requires all seven outbound enforcement points to use it: `claude-cli`, `codex-cli`, `grok-cli`, `cursor-agent`, `cross-model-convergence`, `pre-merge-review`, and `requesting-code-review` Mode 2.
- BRE-46 adds the repository policy block with `Allowed providers: anthropic, openai` and `Reviewer choices permitted: codex, claude`.
- BRE-47 uses a temporary exported review tree instead of the live worktree. Branch-controlled instructions and configuration remain review material but are not auto-loaded. The design reduces exposure; it does not claim portable filesystem confinement against absolute-path reads.
- BRE-48 is satisfied by the live CLI verification already completed for Claude 2.1.251 and by adopting `--safe-mode` in the Claude reviewer path alongside the existing read-only tool allowlist and strict MCP configuration.
- BRE-49 closes only the four named consistency gaps.
- BRE-50 archives the superseded Goldfish brief. It adds no `RAZORBACK.md`, model pins, or new verification policy.
- BRE-26 remains parked until real Explore-agent noise supplies its trigger.

## Architecture quality

**Affected modules:** SDD artifact scripts and contracts; outbound reviewer/delegation skills; pre-merge reviewer prompts; repository policy instructions; workflow consistency guards.

**Caller-facing interfaces:**

- `sdd-workspace PLAN_FILE` continues to return one artifact directory. Only the deterministic directory key changes.
- The redaction helper accepts an outbound payload on standard input and emits the sanitized payload on standard output. Dispatch skills call it immediately before invoking an external model.
- Pre-merge review prepares one temporary exported tree and passes that path to both reviewer adapters. Each adapter keeps its existing structured-output contract.

**Depth and locality:** Path normalization and hashing live only in `sdd-workspace`. Redaction rules live only in the helper. Review-tree preparation lives only in pre-merge review. Callers state the contract and invoke these entry points instead of copying implementations.

**Test surface:** Script behavior is tested through temporary repositories and controlled payloads. Skill guards verify that every declared enforcement point invokes the shared contracts. Reviewer fixtures prove the live worktree and branch-controlled customizations are not used as the review execution context.

**Rejected shortcuts:** Basename-only SDD keys remain collision-prone. Copied redaction regexes would drift. Treating a temporary tree as full read confinement would overstate the guarantee. Mandatory containers or OS-specific sandboxes are outside this issue set.

**Architecture risk:** Medium. The interfaces stay small, but mistakes in redaction or reviewer setup affect security-sensitive workflows.

## Detailed design

### SDD plan keys

`sdd-workspace` resolves the plan to a canonical path inside the repository, converts it to a normalized repository-relative path, and rejects plans outside the repository. It computes SHA-256 through Node.js so Linux, macOS, and Git Bash use one implementation. The resulting key is `<basename>-<12 lowercase hex characters>`.

The helper checks containment before creating directories. A legacy basename-only directory may be reused only when its ledger identity names the same plan, preserving in-flight work without letting a different same-named plan share it.

Tests cover two same-named plans in different directories, multiple path spellings for one plan, outside-repository rejection, legacy-ledger reuse, and the existing symlink-escape case without creating anything outside the repository.

### Outbound redaction

A dependency-free Node.js helper redacts:

- exact values from sensitive environment variables whose names contain token, key, secret, password, credential, or connection-string markers;
- private-key blocks and common provider token formats;
- credential-bearing URL authority and common assignment forms.

Every replacement is the literal `<REDACTED>`. The helper never prints the matched value or a partial secret. It fails closed on read or processing errors.

The contract covers the constructed prompt, diff, or report sent by a dispatch skill. It does not claim that independently readable repository files were rewritten. Whole-tree secret scanning remains the branch-gate control for tracked files.

One guard owns the seven-entry enforcement-point list so redaction coverage and external-model policy coverage cannot drift apart.

### Repository policy

`CLAUDE.md` receives the canonical external-model policy block. `AGENTS.md` is a symlink, so both harness instruction surfaces receive the same policy without duplication.

The chosen provider list intentionally permits the two reviewer providers used by Razorback's pre-merge workflow. Grok and Cursor skills remain available as product capabilities, but this repository does not send its own content to those providers under the dogfood policy.

### Practical reviewer isolation

Pre-merge review exports the tracked target state into a temporary directory outside the repository. The export has no live `.git` metadata or untracked files. Tracked symlinks are not materialized as links that can escape the export root.

Reviewer adapters run from the exported directory. Claude adds `--safe-mode`, retains `--tools "Read,Grep,Glob"`, and retains `--strict-mcp-config`. Codex adds `--skip-git-repo-check`, `--ignore-user-config`, and `--ignore-rules` while retaining its read-only sandbox. These flags prevent branch-controlled instructions, hooks, plugins, rules, and MCP configuration from becoming reviewer control input.

The temporary root is created once by pre-merge review, passed explicitly across steps, and deleted explicitly at the end. It does not rely on one persistent shell or an `EXIT` trap surviving between harness tool calls.

Fixtures prove that:

- untracked and excluded files do not appear in the review tree;
- a tracked external symlink cannot be followed through the review tree;
- a branch-controlled Claude hook or settings marker does not execute under `--safe-mode`;
- Codex runs successfully in the non-git export with configuration and rules ignored.

The skill states the residual risk plainly: these controls reduce exposure and remove branch-controlled startup behavior, but they are not portable host-wide read confinement.

### Consistency repairs

BRE-49 makes four bounded edits:

1. Add the canonical mutation-check requirement to the standalone code-reviewer's Testing checklist.
2. Point `requesting-code-review`, `cursor-agent`, and the blocker taxonomy at SDD's three-way cap adjudication contract.
3. Replace the spec-reviewer prompt's inline task-text placeholder with the canonical task-brief path wording.
4. Require a Miller workspace refresh after a completed batch of file writes and before the next dispatch.

Focused guards assert these contracts without widening the issue into unrelated review cleanup.

### Stale brief and issue state

The Goldfish brief `agent-tier-delegation-gate-policy-feedback` is archived as superseded. Current planning and SDD skills already encode worker gate ownership, invariant reporting, hard-gate versus report-only metrics, and stop-on-assigned-failure behavior. Current model selection intentionally follows harness defaults unless the user overrides it.

After implementation and verification, the completed Linear issues move to Done. BRE-26 remains Backlog/Parked.

## Verification

- TDD for script behavior: each new behavior must fail first in a focused test, then pass after implementation.
- Worker scope: the focused test file owned by each task.
- Affected-change scope: all touched Razorback guard tests plus `git diff --check`.
- Branch gate: `npm test` and `./scripts/bump-version.sh --audit`.
- Security scope: `gitleaks detect --redact=100`; dependency audit remains `none declared` unless a new dependency is added.
- Live CLI checks: Claude 2.1.251 flag compatibility and a no-content Codex non-git startup probe. These checks validate command shape, not model output quality.

## Acceptance criteria

- [ ] Same-named plans in different repository directories resolve to different SDD workspaces.
- [ ] Equivalent path spellings of one plan resolve to the same SDD workspace.
- [ ] All seven outbound dispatch points redact constructed payloads through one helper.
- [ ] Razorback declares and follows its Anthropic/OpenAI external-model policy.
- [ ] Pre-merge review runs from a temporary exported tree and does not auto-load branch-controlled reviewer customizations.
- [ ] Claude reviewer commands use the verified `--safe-mode` combination.
- [ ] All four BRE-49 consistency gaps have focused guard coverage.
- [ ] The superseded agent-tier brief is archived without adding model pins or `RAZORBACK.md`.
- [ ] BRE-26 remains parked.
- [ ] Focused, affected-change, branch, and declared security verification pass.

