# Code-KB Tool Name Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development whenever delegation is available and permitted, including for one task; serialize dependent tasks. Use razorback:executing-plans only when delegation is unavailable or the user/session explicitly selected single-agent execution.

**Goal:** Update Razorback skills, prompts, host rule copies, documentation, and test guards to reflect the upstream `code-kb` MCP tool rename (`find_symbol` → `lookup_symbol`, `get_context_slice` → `get_symbol_context`), sharpened descriptions, and CLI command mappings (`symbol`/`slice` → `lookup`/`context`).

**Architecture:** Update the canonical instruction-tier reference (`skills/using-razorback/references/instruction-tier.md`), propagate byte-identically to all 5 host copies, update lead/subagent/reviewer skills and prompt templates to prescribe `get_symbol_context` before edits and `lookup_symbol` for exact/prefix identifier lookup, update test regexes, and align documentation and project instructions.

**Tech Stack:** Node.js 22 test runner, Bash, Markdown, code-kb MCP.

**Spec:** User request with code-kb upstream changelog: `find_symbol` → `lookup_symbol` (identifier lookup only), `get_context_slice` → `get_symbol_context` (edit context), CLI commands `code-kb lookup` and `code-kb context`, sharpen boundaries to prescribe `get_symbol_context` before edits and `get_symbol_body` only for isolated code.

**Architecture Quality:** No Architecture Impact. This is a mechanical contract and naming synchronization with upstream `code-kb` MCP tools.

## Global Constraints

- Never modify historical plans in `docs/plans/` (except this new plan) or historical logs in `.memories/`.
- The canonical instruction-tier file `skills/using-razorback/references/instruction-tier.md` must sync byte-identically across all 5 host copies (`.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`) once host-specific frontmatter is stripped.
- All 10 load-bearing invariant phrases in `scripts/check-rule-copies.mjs` must appear verbatim in `instruction-tier.md`, `using-razorback/SKILL.md`, and `subagent-toolchain.md`.
- External CLI reviewers in `pre-merge-review` run without MCP under a read-only allowlist; the lead builds a sanitized `code-kb` evidence bundle and verifies findings via `code-kb`.
- Every task must end with the repository building and worker-scope verification green.

---

## Verification Strategy

**Project source of truth:** `CLAUDE.md`, `scripts/check-rule-copies.mjs`, `package.json`, and `tests/*.test.mjs`.

**Worker red/green scope:** Focused node test runs (`node --test tests/<specific>.test.mjs`) and `node scripts/check-rule-copies.mjs`.

**Worker ceiling:** Per-task test file and sync scripts (`node --test tests/<name>.test.mjs`).

**Worker gate invariant:** Targeted test file passes with 0 failures and zero regressions.

**Lead affected-change scope:** `node scripts/check-rule-copies.mjs && node --test tests/rule-copies.test.mjs tests/subagent-hook.test.mjs tests/session-start.test.mjs tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs tests/borrowed-superpowers.test.mjs tests/upstream-consistency.test.mjs`.

**Branch gate:** `npm test` (full 436+ test suite) and `./scripts/bump-version.sh --check`.

**Security scope:** `none declared`.

**Replay/metric evidence:** `node scripts/check-rule-copies.mjs` exits 0; `npm test` passes all tests.

**Escalation triggers:** Drift in rule copies, failure in hook JSON escaping, or broken rule invariant.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp.

---

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Core Instruction Tier, Host Rule Copies & Hook Tests | Batch A | `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md`, `.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`, `tests/session-start.test.mjs`, `tests/subagent-hook.test.mjs`, `tests/rule-copies.test.mjs` | Yes | Establishes the canonical code-kb toolchain floor and invariants that subsequent tasks build upon. |
| Task 2: Prompt Templates & Reviewer Agents | Batch B | `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/pre-merge-review/verification-protocol.md`, `agents/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/brainstorming/spec-document-reviewer-prompt.md` | Yes | Depends on canonical toolchain from Task 1. |
| Task 3: Lead-Facing Skills & Harvesting Debt | Batch C | `skills/brainstorming/SKILL.md`, `skills/writing-plans/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/harvesting-debt/SKILL.md`, `skills/architecture-quality/analysis-heuristics.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md`, `skills/verification-before-completion/SKILL.md`, `skills/diagnosing-performance/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/prototyping/LOGIC.md`, `skills/receiving-code-review/SKILL.md`, `tests/debt-marker.test.mjs` | Yes | Updates lead skills and debt harvesting to use new tool names and passes debt marker test. |
| Task 4: Manifests, Documentation, Project Instructions & Branch Gate | Batch D | `CLAUDE.md`, `README.md`, `docs/README.codex.md`, `docs/site/index.html`, `skills/using-razorback/references/codex-tools.md` | Yes | Final reconciliation of documentation, project guidelines, tool mappings, and full branch test gate. |

---

### Task 1: Core Instruction Tier, Host Rule Copies & Hook Tests

**Files:**
- Modify: `skills/using-razorback/references/instruction-tier.md:7-19`
- Modify: `skills/using-razorback/SKILL.md:76-88`
- Modify: `skills/using-razorback/references/subagent-toolchain.md:6-18`
- Modify: `.clinerules/razorback.md:7-19`
- Modify: `.cursor/rules/razorback.mdc:13-25`
- Modify: `.github/copilot-instructions.md:7-19`
- Modify: `.kiro/steering/razorback.md:12-24`
- Modify: `.windsurf/rules/razorback.md:7-19`
- Modify: `tests/session-start.test.mjs:135-148`
- Modify: `tests/subagent-hook.test.mjs:55-66`

**Interfaces:**
- Consumes: code-kb MCP tool rename specification (`find_symbol` → `lookup_symbol`, `get_context_slice` → `get_symbol_context`).
- Produces: Synced canonical instruction tier reference, identical host copies, and updated hook tests.

**Contract inputs:**
- Invariant rules from `scripts/check-rule-copies.mjs` must remain intact.
- Table rows:
  - `| **Exact / Prefix symbol lookup** | `lookup_symbol(query, path?)` |`
  - `| **Surgical context slice** — body + callee signatures + types + tests | `get_symbol_context(symbol_name, file_path?)` |`

**File ownership:** `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md`, `.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`, `tests/session-start.test.mjs`, `tests/subagent-hook.test.mjs`, `tests/rule-copies.test.mjs`

**Serialization required:** Yes

**Dependency reason:** Establishes the canonical code-kb toolchain floor and invariants that subsequent tasks build upon.

**Step 1: Write the failing test**
Update `tests/session-start.test.mjs` and `tests/subagent-hook.test.mjs` to assert `lookup_symbol(query, path?)` and `get_symbol_context(symbol_name, file_path?)`.

**Step 2: Run test to verify it fails**
Run: `node --test tests/session-start.test.mjs tests/subagent-hook.test.mjs`
Expected: FAIL asserting `lookup_symbol` or `get_symbol_context`.

**Step 3: Write minimal implementation**
1. Update tool table rows in `skills/using-razorback/references/instruction-tier.md`:
   - Replace `find_symbol(query, path?)` with `lookup_symbol(query, path?)` (Exact / Prefix symbol lookup).
   - Replace `get_context_slice(symbol_name, file_path?)` with `get_symbol_context(symbol_name, file_path?)`.
2. Update `skills/using-razorback/SKILL.md` toolchain table identically.
3. Update `skills/using-razorback/references/subagent-toolchain.md` toolchain table identically.
4. Sync the 5 host rule copies (`.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`) to match `instruction-tier.md` (preserving host frontmatter).

**Step 4: Run test to verify it passes**
Run: `node scripts/check-rule-copies.mjs && node --test tests/rule-copies.test.mjs tests/session-start.test.mjs tests/subagent-hook.test.mjs`
Expected: PASS with 0 errors.

**Step 5: Apply commit mode**
Apply `serial-worker-commit`: commit with message `feat(toolchain): update code-kb tools to lookup_symbol and get_symbol_context`.

**Acceptance criteria:**
- [x] `node scripts/check-rule-copies.mjs` exits 0.
- [x] `tests/rule-copies.test.mjs`, `tests/session-start.test.mjs`, and `tests/subagent-hook.test.mjs` pass.

---

### Task 2: Prompt Templates & Reviewer Agents

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md:45,130`
- Modify: `skills/subagent-driven-development/fix-prompt.md:35`
- Modify: `skills/subagent-driven-development/spec-reviewer-prompt.md:31`
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md:9`
- Modify: `skills/subagent-driven-development/SKILL.md:90`
- Modify: `skills/pre-merge-review/SKILL.md:127`
- Modify: `skills/pre-merge-review/fix-dispatch-prompt.md:43,78`
- Modify: `skills/pre-merge-review/verification-protocol.md:3`
- Modify: `agents/code-reviewer.md:12`
- Modify: `skills/requesting-code-review/SKILL.md:17`
- Modify: `skills/requesting-code-review/code-reviewer.md:29`
- Modify: `skills/writing-plans/plan-document-reviewer-prompt.md:34`
- Modify: `skills/brainstorming/spec-document-reviewer-prompt.md:33`

**Interfaces:**
- Consumes: `lookup_symbol` and `get_symbol_context` definitions from Task 1.
- Produces: Updated subagent, implementer, fix, and reviewer prompt templates prescribing `get_symbol_context` before edits and `lookup_symbol` for exact/prefix symbol checks.

**Contract inputs:**
- In `implementer-prompt.md`:
  - `get_symbol_context(symbol_name, file_path?)` (prefer before edits) or `get_symbol_body(symbol_name, file_path?)` (isolated code only).
  - report template: outline / skeleton / lookup / context / body / refs call.
- In `fix-dispatch-prompt.md`:
  - report template: skeleton / context / body / refs calls.
- In reviewer prompts:
  - `get_symbol_context` on modified symbols (`get_symbol_body` for change's core).

**File ownership:** `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md`, `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/pre-merge-review/verification-protocol.md`, `agents/code-reviewer.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/brainstorming/spec-document-reviewer-prompt.md`

**Serialization required:** Yes

**Dependency reason:** Updates worker and reviewer prompts to reference code-kb tools established in Task 1.

**Step 1: Write the failing test**
Run a check to confirm existing tests (`tests/borrowed-superpowers.test.mjs`, `tests/upstream-consistency.test.mjs`) pass before changes.

**Step 2: Run test to verify it fails**
Run: `node --test tests/borrowed-superpowers.test.mjs tests/upstream-consistency.test.mjs`
Expected: PASS (baseline for worker).

**Step 3: Write minimal implementation**
1. In `implementer-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
   - Prescribe `get_symbol_context(symbol_name, file_path?)` (prefer before edits) or `get_symbol_body(symbol_name, file_path?)` (isolated code only).
   - In report format: update "each outline / skeleton / symbol / slice / refs call" to "each outline / skeleton / lookup / context / body / refs call".
2. In `fix-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
3. In `spec-reviewer-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
4. In `code-quality-reviewer-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
5. In `skills/subagent-driven-development/SKILL.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
6. In `skills/pre-merge-review/SKILL.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
7. In `fix-dispatch-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
   - Update report format from `skeleton / slice / body / refs` to `skeleton / context / body / refs`.
8. In `verification-protocol.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
9. In `agents/code-reviewer.md` and `skills/requesting-code-review/code-reviewer.md` and `skills/requesting-code-review/SKILL.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
10. In `skills/writing-plans/plan-document-reviewer-prompt.md`:
   - Replace `get_context_slice` with `get_symbol_context`.
11. In `skills/brainstorming/spec-document-reviewer-prompt.md`:
   - Replace `find_symbol` with `lookup_symbol` and `get_context_slice` with `get_symbol_context`.

**Step 4: Run test to verify it passes**
Run: `node --test tests/borrowed-superpowers.test.mjs tests/upstream-consistency.test.mjs`
Expected: PASS with 0 errors.

**Step 5: Apply commit mode**
Apply `serial-worker-commit`: commit with message `feat(prompts): update worker and reviewer prompts for lookup_symbol and get_symbol_context`.

**Acceptance criteria:**
- [x] No remaining occurrences of `get_context_slice` in prompt templates.
- [x] `tests/borrowed-superpowers.test.mjs` and `tests/upstream-consistency.test.mjs` pass.

---

### Task 3: Lead-Facing Skills & Harvesting Debt

**Files:**
- Modify: `skills/brainstorming/SKILL.md:40`
- Modify: `skills/writing-plans/SKILL.md:28,89`
- Modify: `skills/executing-plans/SKILL.md:33`
- Modify: `skills/harvesting-debt/SKILL.md:22`
- Modify: `skills/architecture-quality/analysis-heuristics.md:23,35`
- Modify: `skills/systematic-debugging/SKILL.md:46,53`
- Modify: `skills/systematic-debugging/root-cause-tracing.md:47`
- Modify: `skills/verification-before-completion/SKILL.md:38,44`
- Modify: `skills/diagnosing-performance/SKILL.md:51`
- Modify: `skills/cursor-agent/SKILL.md:163`
- Modify: `skills/dispatching-parallel-agents/SKILL.md:25`
- Modify: `skills/grounding-in-current-docs/SKILL.md:14`
- Modify: `skills/prototyping/LOGIC.md:15`
- Modify: `skills/receiving-code-review/SKILL.md:44`
- Modify: `tests/debt-marker.test.mjs:55`

**Interfaces:**
- Consumes: code-kb tool updates from Task 1.
- Produces: Updated lead exploration skills, debt audit scanner, and passing debt marker tests.

**Contract inputs:**
- `skills/harvesting-debt/SKILL.md`: `2. lookup_symbol(query='razorback') — prefix/exact symbol search.`
- `tests/debt-marker.test.mjs`: `assert.match(skill, /lookup_symbol/);`

**File ownership:** `skills/brainstorming/SKILL.md`, `skills/writing-plans/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/harvesting-debt/SKILL.md`, `skills/architecture-quality/analysis-heuristics.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md`, `skills/verification-before-completion/SKILL.md`, `skills/diagnosing-performance/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/prototyping/LOGIC.md`, `skills/receiving-code-review/SKILL.md`, `tests/debt-marker.test.mjs`

**Serialization required:** Yes

**Dependency reason:** Updates lead exploration skills and debt auditing to use new tool names and passes debt marker test.

**Step 1: Write the failing test**
Update `tests/debt-marker.test.mjs` line 55 to assert `/lookup_symbol/`.

**Step 2: Run test to verify it fails**
Run: `node --test tests/debt-marker.test.mjs`
Expected: FAIL matching `lookup_symbol`.

**Step 3: Write minimal implementation**
1. In `skills/harvesting-debt/SKILL.md`: change `find_symbol` to `lookup_symbol`.
2. In `skills/brainstorming/SKILL.md`: change `find_symbol` to `lookup_symbol`.
3. In `skills/writing-plans/SKILL.md`: change `get_context_slice` to `get_symbol_context` and `find_symbol` to `lookup_symbol`.
4. In `skills/executing-plans/SKILL.md`: change `find_symbol` to `lookup_symbol`.
5. In `skills/grounding-in-current-docs/SKILL.md`: change `find_symbol` to `lookup_symbol`.
6. In `skills/architecture-quality/analysis-heuristics.md`: change `get_context_slice` to `get_symbol_context`.
7. In `skills/systematic-debugging/SKILL.md` and `root-cause-tracing.md`: change `get_context_slice` to `get_symbol_context`.
8. In `skills/verification-before-completion/SKILL.md`: change `get_context_slice` to `get_symbol_context`.
9. In `skills/diagnosing-performance/SKILL.md`: change `get_context_slice` to `get_symbol_context`.
10. In `skills/cursor-agent/SKILL.md`: change `get_context_slice` to `get_symbol_context`.
11. In `skills/dispatching-parallel-agents/SKILL.md`: change `get_context_slice` to `get_symbol_context`.
12. In `skills/prototyping/LOGIC.md`: change `get_context_slice` to `get_symbol_context`.
13. In `skills/receiving-code-review/SKILL.md`: change `get_context_slice` to `get_symbol_context`.

**Step 4: Run test to verify it passes**
Run: `node --test tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs`
Expected: PASS with 0 errors.

**Step 5: Apply commit mode**
Apply `serial-worker-commit`: commit with message `feat(skills): update lead-facing skills and debt harvesting for lookup_symbol and get_symbol_context`.

**Acceptance criteria:**
- [x] `tests/debt-marker.test.mjs` passes.
- [x] No remaining occurrences of `find_symbol` or `get_context_slice` in `skills/`.

---

### Task 4: Manifests, Documentation, Project Instructions & Branch Gate

**Files:**
- Modify: `CLAUDE.md:94,97,107`
- Modify: `README.md:15`
- Modify: `docs/README.codex.md:80`
- Modify: `docs/site/index.html:80`
- Modify: `skills/using-razorback/references/codex-tools.md:157,160`

**Interfaces:**
- Consumes: tool names and conventions from Tasks 1-3.
- Produces: Fully reconciled documentation, project instructions, tool mapping, and green test suite.

**Contract inputs:**
- In `CLAUDE.md` and `codex-tools.md`:
  - `lookup_symbol(query, path?)`
  - `get_symbol_context(symbol_name, file_path?)`
  - Notes for CLI mappings: `code-kb lookup <query>` and `code-kb context <symbol>`.
- In `README.md`, `docs/README.codex.md`, `docs/site/index.html`:
  - Updated tool listings.

**File ownership:** `CLAUDE.md`, `README.md`, `docs/README.codex.md`, `docs/site/index.html`, `skills/using-razorback/references/codex-tools.md`

**Serialization required:** Yes

**Dependency reason:** Final reconciliation of documentation, project guidelines, tool mappings, and full branch test gate.

**Step 1: Write the failing test**
Run grep to check for any remaining stale occurrences of `find_symbol` or `get_context_slice` in active files.

**Step 2: Run test to verify it fails**
Run: `git grep -n "find_symbol" | grep -v "docs/plans/" | grep -v ".memories/"`
Expected: Matches found before edit.

**Step 3: Write minimal implementation**
1. In `CLAUDE.md`:
   - In tool table: `| Exact / Prefix symbol lookup | lookup_symbol(query, path?) |`
   - In tool table: `| Surgical context slice — body + callee signatures + types | get_symbol_context(symbol_name, file_path?) |`
   - In subagent prompt example: `get_symbol_context(symbol_name='<symbol>')`.
2. In `skills/using-razorback/references/codex-tools.md`:
   - Update `find_symbol(query, path?)` to `lookup_symbol(query, path?)`.
   - Update `get_context_slice(symbol_name, file_path?)` to `get_symbol_context(symbol_name, file_path?)`.
3. In `README.md`:
   - Update tool list to include `lookup_symbol` and `get_symbol_context`.
4. In `docs/README.codex.md`:
   - Update tool list to include `lookup_symbol` and `get_symbol_context`.
5. In `docs/site/index.html`:
   - Update `find_symbol` to `lookup_symbol`.

**Step 4: Run test to verify it passes**
Run: `npm test && ./scripts/bump-version.sh --check`
Expected: PASS with 436 tests passing, 0 failures, manifests clean.

**Step 5: Apply commit mode**
Apply `serial-worker-commit`: commit with message `docs: update documentation, project instructions, and codex tool mapping for code-kb renames`.

**Acceptance criteria:**
- [x] Zero matches for `find_symbol` and `get_context_slice` across all active (non-archive) files.
- [x] `npm test` passes all 436+ tests.
- [x] `./scripts/bump-version.sh --check` exits 0.
