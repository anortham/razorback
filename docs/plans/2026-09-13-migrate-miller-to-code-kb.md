# Migrate from Miller to code-kb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development whenever delegation is available and permitted, including for one task; serialize dependent tasks. Use razorback:executing-plans only when delegation is unavailable or the user/session explicitly selected single-agent execution.

**Goal:** Migrate Razorback's orientation and code-intelligence layer from Miller MCP to the `code-kb` MCP engine (`~/source/code-kb`), updating all active skills, prompts, host rule copies, hooks, manifests, docs, and test guards while leaving historical archives intact.

**Architecture:** Standardize all exploration and code intelligence on `code-kb`'s 10 discrete MCP tools (`codebase_outline`, `file_skeleton`, `find_symbol`, `search_symbols`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`, `find_structural_facts`, `replace_symbol_body`). Remove all `workspace_id` parameters. Update the canonical instruction-tier ruleset and sync byte-identically across the 5 host rule copies via `scripts/check-rule-copies.mjs`.

**Tech Stack:** Node.js 22 test runner, Bash, Markdown, JSON, `code-kb` (Rust / SQLite WAL MCP server).

**Architecture Quality:**
- Affected modules: Toolchain layer (`skills/using-razorback/`, host rule copies, `scripts/check-rule-copies.mjs`), prompt templates (`skills/subagent-driven-development/`, `skills/pre-merge-review/`, `agents/code-reviewer.md`), lead-facing skills, hooks (`hooks/subagent-start`, `hooks/session-start`), plugin manifests, documentation, and test guards.
- Caller-facing interface: 10 discrete `code-kb` MCP tools with zero workspace parameters.
- Architecture risk: Low.

## Global Constraints

- Never modify historical plans in `docs/plans/` (except the current migration design and plan) or historical logs in `.memories/`.
- The canonical instruction-tier file `skills/using-razorback/references/instruction-tier.md` must sync byte-identically across all 5 host copies (`.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`) once host-specific frontmatter is stripped.
- All 10 load-bearing invariant phrases in `scripts/check-rule-copies.mjs` must appear verbatim in `instruction-tier.md`, `using-razorback/SKILL.md`, and `subagent-toolchain.md`.
- No `workspace_id` or `workspace operation=...` parameters may be required or referenced.
- External CLI reviewers in `pre-merge-review` run without MCP under a read-only allowlist; the lead builds a sanitized `code-kb` evidence bundle and verifies findings via `code-kb`.
- Every task must end with the repository building and worker-scope verification green.

---

## Verification Strategy

**Project source of truth:** `AGENTS.md`, `scripts/check-rule-copies.mjs`, `package.json`, and `tests/*.test.mjs`.

**Worker red/green scope:** Focused node test runs (`node --test tests/<specific>.test.mjs`) and `node scripts/check-rule-copies.mjs`.

**Worker ceiling:** Per-task test file and sync scripts (`node --test tests/<name>.test.mjs`).

**Worker gate invariant:** Targeted test file passes with 0 failures and zero regressions.

**Lead affected-change scope:** `node scripts/check-rule-copies.mjs && node --test tests/rule-copies.test.mjs tests/subagent-hook.test.mjs tests/session-start.test.mjs tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs tests/upstream-consistency.test.mjs tests/workflow-eval.test.mjs`.

**Branch gate:** `npm test` (full 423+ test suite) and `./scripts/bump-version.sh --check`.

**Security scope:** `none declared`.

**Replay/metric evidence:** `node scripts/check-rule-copies.mjs` exits 0; `npm test` passes all tests.

**Escalation triggers:** Drift in rule copies, failure in hook JSON escaping, or fixture regression in `workflow-eval`.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp.

---

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Core Instruction Tier & Host Rule Copies | Batch A | `scripts/check-rule-copies.mjs`, `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md`, `.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`, `tests/rule-copies.test.mjs` | Yes | Establishes the canonical code-kb toolchain floor and invariants that subsequent tasks build upon. |
| Task 2: Hooks & Session Start Verification | Batch B | `hooks/subagent-start`, `skills/using-razorback/references/codex-tools.md`, `tests/subagent-hook.test.mjs`, `tests/session-start.test.mjs` | Yes | Depends on Task 1 canonical subagent-toolchain and instruction-tier definitions. |
| Task 3: Dispatched Subagent & Reviewer Prompts | Batch C | `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/verification-protocol.md`, `agents/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `tests/upstream-consistency.test.mjs` | Yes | Updates worker and reviewer prompts to reference code-kb tools established in Task 1. |
| Task 4: Lead-Facing Skills & Debt Audit | Batch D | `skills/brainstorming/SKILL.md`, `skills/brainstorming/spec-document-reviewer-prompt.md`, `skills/writing-plans/SKILL.md`, `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/executing-plans/SKILL.md`, `skills/harvesting-debt/SKILL.md`, `skills/architecture-quality/SKILL.md`, `skills/architecture-quality/analysis-heuristics.md`, `skills/architecture-quality/deepening.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md`, `skills/verification-before-completion/SKILL.md`, `skills/diagnosing-performance/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/fixing-small-issues/SKILL.md`, `skills/prototyping/SKILL.md`, `skills/prototyping/UI.md`, `skills/prototyping/LOGIC.md`, `skills/cross-model-convergence/SKILL.md`, `tests/debt-marker.test.mjs`, `tests/workflow-tool-contracts.test.mjs` | Yes | Updates lead exploration skills and debt auditing to use code-kb tools. |
| Task 5: Manifests, Documentation, Workflow Eval & Branch Gate | Batch E | `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/adding-a-harness.md`, `docs/README.codex.md`, `docs/README.opencode.md`, `docs/site/index.html`, `package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `tests/fixtures/workflow-eval/scenarios.json`, `tests/fixtures/workflow-eval/expectations.json`, `tests/fixtures/workflow-eval/valid-decisions.json`, `tests/workflow-eval.test.mjs`, `tests/codex-plugin-manifest.test.mjs` | Yes | Final reconciliation of documentation, plugin manifests, evaluation fixtures, and full branch test gate. |

---

### Task 1: Core Instruction Tier & Host Rule Copies

**Files:**
- Modify: `scripts/check-rule-copies.mjs`
- Modify: `skills/using-razorback/references/instruction-tier.md`
- Modify: `skills/using-razorback/references/subagent-toolchain.md`
- Modify: `skills/using-razorback/SKILL.md`
- Modify: `.clinerules/razorback.md`
- Modify: `.cursor/rules/razorback.mdc`
- Modify: `.github/copilot-instructions.md`
- Modify: `.kiro/steering/razorback.md`
- Modify: `.windsurf/rules/razorback.md`
- Test: `tests/rule-copies.test.mjs`

**Interfaces:**
- Consumes: `code-kb` MCP tool definitions from `~/source/code-kb/README.md`.
- Produces: Synced canonical instruction tier and invariants across all 5 host copies and runtime references.

**Contract inputs:**
- Invariant phrase: `'code-kb MCP is available and MUST be used'` (replaces `'Miller MCP is available and MUST be used'`).
- The other 9 invariants remain intact:
  - `'Do NOT fall back to Glob → Read → Grep chains'`
  - `"List a file's symbols before reading it in full"`
  - `'Inspect a symbol before modifying it'`
  - `"Find a symbol's references before changing it"`
  - `'Do not infer or invent API shapes'`
  - `'choose the safest plan-consistent path'`
  - `'Restricted external CLI reviewers'`
  - `'Do not rerun any scope on an unchanged tree'`
  - `'rerun only the failing test ids'`
- External model policy: Explicit user instruction added xai and google to allowed providers in CLAUDE.md / AGENTS.md (`Allowed providers: anthropic, openai, xai, google`).

**File ownership:** `scripts/check-rule-copies.mjs`, `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md`, `.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`, `tests/rule-copies.test.mjs`.

**Serialization required:** Yes.

**Dependency reason:** Establishes the canonical code-kb toolchain floor and invariants that subsequent tasks build upon.

**Step 1: Write the failing test**
Update `scripts/check-rule-copies.mjs` line 39 to expect `'code-kb MCP is available and MUST be used'`.

**Step 2: Run test to verify it fails**
Run: `node scripts/check-rule-copies.mjs`
Expected: FAIL reporting missing rule invariant in `instruction-tier.md`, `SKILL.md`, and `subagent-toolchain.md`.

**Step 3: Write minimal implementation**
- Update `skills/using-razorback/references/instruction-tier.md`:
  - Replace Miller tool table with `code-kb` MCP tools (`codebase_outline`, `file_skeleton`, `find_symbol`, `search_symbols`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`, `find_structural_facts`, `replace_symbol_body`).
  - Update exploration rules to cite `code-kb`.
- Propagate the canonical body to:
  - `.clinerules/razorback.md`
  - `.cursor/rules/razorback.mdc` (preserving frontmatter)
  - `.github/copilot-instructions.md`
  - `.kiro/steering/razorback.md` (preserving frontmatter)
  - `.windsurf/rules/razorback.md`
- Update `skills/using-razorback/references/subagent-toolchain.md` with the `code-kb` toolchain table and rules.
- Update `skills/using-razorback/SKILL.md` (lines 70–100) with the `code-kb` toolchain table and rules, removing `workspace operation=...` guidance.

**Step 4: Run test to verify it passes**
Run: `node scripts/check-rule-copies.mjs && node --test tests/rule-copies.test.mjs`
Expected: PASS with "5 rule copies match skills/using-razorback/references/instruction-tier.md; 10 rule invariants present in all 3 sources".

**Step 5: Apply commit mode**
`serial-worker-commit`: stage owned files and commit with message:
`refactor: migrate instruction tier and rule copies to code-kb`

**Acceptance criteria:**
- [x] `node scripts/check-rule-copies.mjs` exits 0.
- [x] `node --test tests/rule-copies.test.mjs` passes with 0 failures.
- [x] Worker-scope verification passes and change is committed.

---

### Task 2: Hooks & Session Start Verification

**Files:**
- Modify: `hooks/subagent-start`
- Modify: `skills/using-razorback/references/codex-tools.md`
- Modify: `tests/subagent-hook.test.mjs`
- Modify: `tests/session-start.test.mjs`

**Interfaces:**
- Consumes: `skills/using-razorback/references/subagent-toolchain.md` and `skills/using-razorback/SKILL.md`.
- Produces: Claude Code `SubagentStart` hook payload and multi-platform `SessionStart` payload injecting `code-kb`.

**Contract inputs:**
- `hooks/subagent-start` injects `subagent-toolchain.md` into dispatched subagents.
- `hooks/session-start` injects `skills/using-razorback/SKILL.md`.

**File ownership:** `hooks/subagent-start`, `skills/using-razorback/references/codex-tools.md`, `tests/subagent-hook.test.mjs`, `tests/session-start.test.mjs`.

**Serialization required:** Yes.

**Dependency reason:** Depends on Task 1 canonical subagent-toolchain and instruction-tier definitions.

**Step 1: Write the failing test**
Update `tests/subagent-hook.test.mjs` and `tests/session-start.test.mjs` to assert that output contains `code-kb MCP is available and MUST be used` and `codebase_outline` instead of `Miller MCP is available` and `context(query)`.

**Step 2: Run test to verify it fails**
Run: `node --test tests/subagent-hook.test.mjs tests/session-start.test.mjs`
Expected: FAIL matching assertions for `code-kb`.

**Step 3: Write minimal implementation**
- Ensure `hooks/subagent-start` properly escapes and outputs `subagent-toolchain.md`.
- Update `skills/using-razorback/references/codex-tools.md` to map `code-kb` MCP tools for Codex CLI/desktop app.
- Update `tests/subagent-hook.test.mjs` test titles and assertions to test the `code-kb`-first ruleset.
- Update `tests/session-start.test.mjs` test titles and assertions to assert the `code-kb` toolchain table.

**Step 4: Run test to verify it passes**
Run: `node --test tests/subagent-hook.test.mjs tests/session-start.test.mjs`
Expected: PASS with 0 failures.

**Step 5: Apply commit mode**
`serial-worker-commit`: stage owned files and commit with message:
`feat: update hooks and session-start tests for code-kb`

**Acceptance criteria:**
- [x] `node --test tests/subagent-hook.test.mjs` passes with 0 failures.
- [x] `node --test tests/session-start.test.mjs` passes with 0 failures.
- [x] Worker-scope verification passes and change is committed.

---

### Task 3: Dispatched Subagent & Reviewer Prompts

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/fix-prompt.md`
- Modify: `skills/subagent-driven-development/spec-reviewer-prompt.md`
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/pre-merge-review/SKILL.md`
- Modify: `skills/pre-merge-review/fix-dispatch-prompt.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/claude.md`
- Modify: `skills/pre-merge-review/verification-protocol.md`
- Modify: `agents/code-reviewer.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/requesting-code-review/code-reviewer.md`
- Test: `tests/upstream-consistency.test.mjs`

**Interfaces:**
- Consumes: `code-kb` MCP tool catalog.
- Produces: Concrete prompt templates directing subagents and reviewers to use `code-kb`.

**Contract inputs:**
- Subagent implementers must name `code-kb` tools inline (`file_skeleton`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`).
- Pre-merge review: lead provides a sanitized `code-kb`-backed evidence bundle; external reviewers run without MCP.

**File ownership:** `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/verification-protocol.md`, `agents/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `tests/upstream-consistency.test.mjs`.

**Serialization required:** Yes.

**Dependency reason:** Updates worker and reviewer prompts to reference code-kb tools established in Task 1.

**Step 1: Write the failing test**
Update `tests/upstream-consistency.test.mjs` to check for `code-kb` refresh between write batches instead of Miller refresh.

**Step 2: Run test to verify it fails**
Run: `node --test tests/upstream-consistency.test.mjs`
Expected: FAIL matching assertions.

**Step 3: Write minimal implementation**
- In `implementer-prompt.md` and `fix-prompt.md`: replace references to `inspect(target=...)`, `trace(target)`, and `workspace operation=...` with `code-kb` tools (`file_skeleton`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`).
- In `spec-reviewer-prompt.md` and `code-quality-reviewer-prompt.md`: require AST-backed evidence from `code-kb`.
- In `pre-merge-review`: specify that the lead supplies a sanitized `code-kb`-backed evidence bundle and verifies findings with `code-kb`.
- In `requesting-code-review/SKILL.md` and `agents/code-reviewer.md`: update reviewer instructions to use `code-kb`.

**Step 4: Run test to verify it passes**
Run: `node --test tests/upstream-consistency.test.mjs tests/harness-neutral-prompts.test.mjs`
Expected: PASS with 0 failures.

**Step 5: Apply commit mode**
`serial-worker-commit`: stage owned files and commit with message:
`refactor: update subagent and reviewer prompts for code-kb`

**Acceptance criteria:**
- [x] `node --test tests/upstream-consistency.test.mjs` passes with 0 failures.
- [x] `node --test tests/harness-neutral-prompts.test.mjs` passes with 0 failures.
- [x] Worker-scope verification passes and change is committed.

---

### Task 4: Lead-Facing Skills & Debt Audit

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/brainstorming/spec-document-reviewer-prompt.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/writing-plans/plan-document-reviewer-prompt.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/harvesting-debt/SKILL.md`
- Modify: `skills/architecture-quality/SKILL.md`
- Modify: `skills/architecture-quality/analysis-heuristics.md`
- Modify: `skills/architecture-quality/deepening.md`
- Modify: `skills/systematic-debugging/SKILL.md`
- Modify: `skills/systematic-debugging/root-cause-tracing.md`
- Modify: `skills/verification-before-completion/SKILL.md`
- Modify: `skills/diagnosing-performance/SKILL.md`
- Modify: `skills/cursor-agent/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`
- Modify: `skills/grounding-in-current-docs/SKILL.md`
- Modify: `skills/fixing-small-issues/SKILL.md`
- Modify: `skills/prototyping/SKILL.md`
- Modify: `skills/prototyping/UI.md`
- Modify: `skills/prototyping/LOGIC.md`
- Modify: `skills/cross-model-convergence/SKILL.md`
- Modify: `tests/debt-marker.test.mjs`
- Modify: `tests/workflow-tool-contracts.test.mjs`

**Interfaces:**
- Consumes: `code-kb` MCP tools.
- Produces: Updated lead workflows for brainstorming, planning, debt harvesting, architecture review, and debugging.

**Contract inputs:**
- `skills/harvesting-debt/SKILL.md`: Scans through `code-kb` (`search_symbols` / FTS5 BM25 or `find_symbol`).
- `tests/debt-marker.test.mjs` asserts debt audit is code-kb-only.
- `tests/workflow-tool-contracts.test.mjs` asserts debt audit and external review contracts with `code-kb`.

**File ownership:** `skills/brainstorming/SKILL.md`, `skills/brainstorming/spec-document-reviewer-prompt.md`, `skills/writing-plans/SKILL.md`, `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/executing-plans/SKILL.md`, `skills/harvesting-debt/SKILL.md`, `skills/architecture-quality/SKILL.md`, `skills/architecture-quality/analysis-heuristics.md`, `skills/architecture-quality/deepening.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md`, `skills/verification-before-completion/SKILL.md`, `skills/diagnosing-performance/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/fixing-small-issues/SKILL.md`, `skills/prototyping/SKILL.md`, `skills/prototyping/UI.md`, `skills/prototyping/LOGIC.md`, `skills/cross-model-convergence/SKILL.md`, `tests/debt-marker.test.mjs`, `tests/workflow-tool-contracts.test.mjs`.

**Serialization required:** Yes.

**Dependency reason:** Updates lead exploration skills and debt auditing to use code-kb tools.

**Step 1: Write the failing test**
Update `tests/debt-marker.test.mjs` and `tests/workflow-tool-contracts.test.mjs` to expect `code-kb` tool references and assertions instead of Miller.

**Step 2: Run test to verify it fails**
Run: `node --test tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs`
Expected: FAIL matching assertions.

**Step 3: Write minimal implementation**
- Update `brainstorming/SKILL.md`: orientation uses `code-kb` (`codebase_outline`, `file_skeleton`, `find_symbol`, `find_references`).
- Update `writing-plans/SKILL.md` and `plan-document-reviewer-prompt.md`: orientation and symbol inspection use `code-kb`.
- Update `harvesting-debt/SKILL.md`: debt marker scans use `code-kb` (`search_symbols` / FTS5 BM25 or `find_symbol`).
- Update `architecture-quality/SKILL.md` and supporting files: analysis heuristics and sweeps use `code-kb`.
- Update `systematic-debugging/SKILL.md` and `root-cause-tracing.md`: call tracing uses `find_references`.
- Update `verification-before-completion/SKILL.md`, `executing-plans/SKILL.md`, `cursor-agent/SKILL.md`, `dispatching-parallel-agents/SKILL.md`, and other lead skills to replace Miller mentions with `code-kb`.

**Step 4: Run test to verify it passes**
Run: `node --test tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs tests/quick-fix-tier.test.mjs tests/diagnosing-performance.test.mjs`
Expected: PASS with 0 failures.

**Step 5: Apply commit mode**
`serial-worker-commit`: stage owned files and commit with message:
`refactor: update lead-facing skills and debt audit for code-kb`

**Acceptance criteria:**
- [x] `node --test tests/debt-marker.test.mjs` passes with 0 failures.
- [x] `node --test tests/workflow-tool-contracts.test.mjs` passes with 0 failures.
- [x] Worker-scope verification passes and change is committed.

---

### Task 5: Manifests, Documentation, Workflow Eval & Branch Gate

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/adding-a-harness.md`
- Modify: `docs/README.codex.md`
- Modify: `docs/README.opencode.md`
- Modify: `docs/site/index.html`
- Modify: `package.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.cursor-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `tests/fixtures/workflow-eval/scenarios.json`
- Modify: `tests/fixtures/workflow-eval/expectations.json`
- Modify: `tests/fixtures/workflow-eval/valid-decisions.json`
- Modify: `tests/workflow-eval.test.mjs`
- Modify: `tests/codex-plugin-manifest.test.mjs`

**Interfaces:**
- Consumes: Complete codebase state from Tasks 1–4.
- Produces: Fully synchronized plugin manifests, clean documentation, passing scenario evaluations, and green branch test suite.

**Contract inputs:**
- Manifest descriptions updated to cite `code-kb`.
- `workflow-eval` fixtures updated to test `code-kb` blocker questions and actions.

**File ownership:** `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/adding-a-harness.md`, `docs/README.codex.md`, `docs/README.opencode.md`, `docs/site/index.html`, `package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `tests/fixtures/workflow-eval/scenarios.json`, `tests/fixtures/workflow-eval/expectations.json`, `tests/fixtures/workflow-eval/valid-decisions.json`, `tests/workflow-eval.test.mjs`, `tests/codex-plugin-manifest.test.mjs`.

**Serialization required:** Yes.

**Dependency reason:** Final reconciliation of documentation, plugin manifests, evaluation fixtures, and full branch test gate.

**Step 1: Write the failing test**
Update `tests/workflow-eval.test.mjs` and `tests/codex-plugin-manifest.test.mjs` to assert `code-kb` descriptions and scenario grading.

**Step 2: Run test to verify it fails**
Run: `node --test tests/workflow-eval.test.mjs tests/codex-plugin-manifest.test.mjs`
Expected: FAIL matching assertions.

**Step 3: Write minimal implementation**
- In `AGENTS.md` and `CLAUDE.md`: replace "Miller MCP Integration Pattern" with "code-kb MCP Integration Pattern"; update dependency statements to `code-kb MCP is a hard requirement`.
- In `README.md`, `docs/site/index.html`, `docs/adding-a-harness.md`, `docs/README.codex.md`, `docs/README.opencode.md`: update overview and architecture descriptions to describe `code-kb`.
- In `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`: update descriptions to reference `code-kb`.
- In `tests/fixtures/workflow-eval/`: update scenario descriptions, actions, and expectations from Miller to `code-kb`.
- Verify manifest synchronization: `./scripts/bump-version.sh --check`.

**Step 4: Run test to verify it passes**
Run: `npm test && ./scripts/bump-version.sh --check`
Expected: PASS (all 423+ tests passing, manifests synchronized).

**Step 5: Apply commit mode**
`serial-worker-commit`: stage owned files and commit with message:
`docs: update manifests, documentation, and workflow evaluations for code-kb`

**Acceptance criteria:**
- [x] `npm test` passes 100% with 0 failures across all 423+ tests.
- [x] `./scripts/bump-version.sh --check` exits 0.
- [x] No uncommitted or unstaged changes remain.
- [x] Worker-scope verification passes and change is committed.
