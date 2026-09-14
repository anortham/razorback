# Design Document: Migrate from Miller to code-kb

**Date:** 2026-09-13  
**Status:** Approved by User  
**Topic:** Replace references to Miller MCP across Razorback with the code-kb engine (`~/source/code-kb`).

---

## 1. Context & Motivation

Razorback originally relied on Miller MCP for token-efficient codebase orientation, symbol extraction, call-graph traversal, and surgical editing. With the development of `code-kb` (`~/source/code-kb`), a lightweight, sub-15MB Rust-based code intelligence engine backed by `julie-extractors` AST fact tables in SQLite WAL mode, Razorback is migrating its orientation and code-intelligence layer to `code-kb`.

### Key Benefits of code-kb
1. **Zero Workspace Parameters:** Eliminates the `workspace_id` tax and multi-step `workspace operation=open` handshake. Process-to-workspace binding is automatic via MCP lifecycle roots.
2. **Sub-15MB Retained Memory:** Zero heavy runtime overhead, sub-5ms query latency directly against SQLite.
3. **Discrete, Intuitive Tools:** Replaces multi-verb "God tools" (`search mode=...`, `inspect depth=...`, `workspace operation=...`) with purpose-built semantic tools (`codebase_outline`, `file_skeleton`, `find_symbol`, `search_symbols`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`, `find_structural_facts`, `replace_symbol_body`).
4. **Single-Turn Pre-flight AST Edits:** `replace_symbol_body` verifies tree-sitter syntax and optimistic concurrency hash before writing to disk.

---

## 2. Architecture Quality Gate

```markdown
## Architecture Quality

**Affected modules:**
- Toolchain definitions: `skills/using-razorback/` (`SKILL.md`, `references/instruction-tier.md`, `references/subagent-toolchain.md`, `references/codex-tools.md`), `scripts/check-rule-copies.mjs`, and host copies (`.clinerules/razorback.md`, `.cursor/rules/razorback.mdc`, `.github/copilot-instructions.md`, `.kiro/steering/razorback.md`, `.windsurf/rules/razorback.md`).
- Prompt templates and worker instructions: `skills/subagent-driven-development/` (`implementer-prompt.md`, `fix-prompt.md`, `spec-reviewer-prompt.md`, `code-quality-reviewer-prompt.md`), `skills/pre-merge-review/` (`SKILL.md`, `fix-dispatch-prompt.md`, `reviewer-prompts/codex.md`, `reviewer-prompts/claude.md`), `agents/code-reviewer.md`, `skills/requesting-code-review/` (`SKILL.md`, `code-reviewer.md`).
- Core process and domain skills: `skills/brainstorming/` (`SKILL.md`, `spec-document-reviewer-prompt.md`), `skills/writing-plans/` (`SKILL.md`, `plan-document-reviewer-prompt.md`), `skills/executing-plans/SKILL.md`, `skills/harvesting-debt/SKILL.md`, `skills/architecture-quality/SKILL.md`, `skills/systematic-debugging/` (`SKILL.md`, `root-cause-tracing.md`), `skills/verification-before-completion/SKILL.md`, `skills/diagnosing-performance/SKILL.md`, `skills/cursor-agent/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`.
- Hooks and manifests: `hooks/subagent-start`, `hooks/session-start`, `package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`.
- Guard tests: `tests/rule-copies.test.mjs`, `tests/subagent-hook.test.mjs`, `tests/debt-marker.test.mjs`, `tests/workflow-tool-contracts.test.mjs`, `tests/workflow-eval.test.mjs`, `tests/upstream-consistency.test.mjs`, `tests/session-start.test.mjs`.
- Project documentation: `CLAUDE.md` / `AGENTS.md`, `README.md`, `docs/adding-a-harness.md`, `docs/site/index.html`.

**Caller-facing interface:**
- Standardized tool table mapping abstract capabilities (`Orient`, `File interface`, `Symbol search`, `Concept search`, `Symbol body`, `Context slice`, `References`, `Blast radius`, `Structural facts`, `Atomic edit`) to `code-kb` MCP tools.
- Removal of workspace registry concepts (`workspace_id`, `workspace operation=open/list`).

**Depth/locality check:**
- Core workflow mechanics (brainstorming gates, TDD, two-pass review, worktree isolation) remain unchanged; only the code-intelligence foundation and toolchain floor are updated.

**Test surface:**
- `npm test` runs 423+ unit and invariant tests, verifying rule copy synchronization, hook JSON payloads, and workflow tool contract fidelity.

**Seams/adapters:**
- `scripts/check-rule-copies.mjs` enforces byte-equality across the 5 host rule copies and invariant presence across runtime sources.

**Rejected shortcuts:**
- Retaining Miller aliases or multi-verb fallback guidance was rejected to maximize context efficiency and prevent prompt pollution.

**Architecture risk:** low
```

---

## 3. Tool Mapping Specification

| Capability | Previous (Miller) | New (`code-kb` MCP Tool) | Parameter Schema & Notes |
|---|---|---|---|
| **Orient** (top-level directory layout & exports) | `context(query)` | `codebase_outline(path?, depth?)` | ~200 tokens top-level architecture outline. Default depth: 2. |
| **List symbols / File outline** | `inspect(target='<file>')` | `file_skeleton(file_path)` | Bodies stripped; function/struct/type signatures retained. |
| **Exact / Prefix symbol search** | `search(query, mode=symbol)` | `find_symbol(query, path?)` | Exact and prefix symbol lookup; optional path filter. |
| **Concept / BM25 search** | `search(query, mode=auto\|content)` | `search_symbols(query, path?)` | Natural language / FTS5 BM25 search over docstrings & signatures. |
| **Inspect symbol body** | `inspect(target='<symbol>', depth=full)` | `get_symbol_body(symbol_name, file_path?)` | Full implementation body of target symbol. |
| **Surgical context slice** | `inspect(target='<symbol>', depth=overview)` | `get_context_slice(symbol_name, file_path?)` | Returns target body + callee signatures + parameter types + tests in one call. |
| **Callers & callees** | `trace(target)` | `find_references(symbol_name, direction="callers"\|"callees")` | Call graph traversal; language-agnostically filters stdlib noise. |
| **Assess blast radius / test impact** | `impact(target)` | `blast_radius(symbol?, file?, depth?)` *(alias: `impact`)* | Multi-hop caller reachability and test prediction; zero-args scans uncommitted git changes. |
| **Structural facts** | `patterns(...)` | `find_structural_facts(category?)` | Routes, SQL queries, models, config keys across ~40 languages. |
| **Atomic symbol edit** | `edit(operation, target)` | `replace_symbol_body(symbol_name, file_path, new_body, expected_body_hash?)` | Single-turn edit with tree-sitter AST validation and concurrency hash. |
| **Workspace index management** | `workspace(...)` | *None required* | Automatic 1:1 process-to-workspace binding; initial scan via `code-kb scan`. |

---

## 4. Invariant Rules & Host Synchronization

### Invariant Rules in `scripts/check-rule-copies.mjs`
The 10 load-bearing invariants checked across `instruction-tier.md`, `using-razorback/SKILL.md`, and `subagent-toolchain.md` are updated:

```javascript
const INVARIANTS = [
  'code-kb MCP is available and MUST be used', // the hard requirement itself
  'Do NOT fall back to Glob → Read → Grep chains', // no raw-file reflex
  "List a file's symbols before reading it in full",
  'Inspect a symbol before modifying it',
  "Find a symbol's references before changing it",
  'Do not infer or invent API shapes',
  'choose the safest plan-consistent path', // evidence-gap rule
  'Restricted external CLI reviewers',
  'Do not rerun any scope on an unchanged tree', // test-scope rule
  'rerun only the failing test ids', // after-failure loop
];
```

### Synced Host Copies
The canonical ruleset in `skills/using-razorback/references/instruction-tier.md` is synced byte-identically (after stripping host frontmatter) to:
- `.clinerules/razorback.md`
- `.cursor/rules/razorback.mdc`
- `.github/copilot-instructions.md`
- `.kiro/steering/razorback.md`
- `.windsurf/rules/razorback.md`

---

## 5. Detailed Component Changes

### 5.1 Subagent Prompts & Reviewers
- `skills/subagent-driven-development/implementer-prompt.md`:
  - Name `code-kb` tools inline: `codebase_outline`, `file_skeleton`, `find_symbol`, `get_symbol_body`, `get_context_slice`, `find_references`, `blast_radius`.
  - Remove references to `inspect(target=...)`, `trace(target)`, and `workspace operation=...`.
- `skills/subagent-driven-development/fix-prompt.md`:
  - Direct workers to inspect symbols with `get_symbol_body` or `get_context_slice` and trace callers via `find_references`.
- `skills/subagent-driven-development/spec-reviewer-prompt.md` & `code-quality-reviewer-prompt.md`:
  - Require evidence from `code-kb` and verify against AST facts.
- `skills/pre-merge-review/` (`SKILL.md`, `fix-dispatch-prompt.md`, `reviewer-prompts/codex.md`, `reviewer-prompts/claude.md`):
  - State clearly that external CLI reviewers run without MCP under a read-only allowlist.
  - The lead builds and sanitizes an evidence bundle using `code-kb`.
  - The lead verifies all external findings with `code-kb`.

### 5.2 Lead-Facing Skills
- `skills/using-razorback/SKILL.md`:
  - Replace Miller toolchain table with `code-kb` catalog.
  - State: *"code-kb MCP is available and MUST be used for ALL codebase exploration — instead of Glob/Grep/Read chains."*
  - Remove all guidance regarding `workspace operation=open` or `workspace_id`.
- `skills/brainstorming/SKILL.md`:
  - Update orientation guidance: *"Every path starts with code-kb orientation (`codebase_outline`, `file_skeleton`, `find_symbol`, `find_references`; no Glob → Read → Grep chains) plus `git log --oneline -10`"*.
- `skills/harvesting-debt/SKILL.md`:
  - Update debt audit scanning instructions to query via `code-kb` (`search_symbols` / FTS5 BM25 or `find_symbol`), not Miller.
- `skills/architecture-quality/SKILL.md`:
  - Update audit and sweep heuristics to use `code-kb` (`codebase_outline`, `file_skeleton`, `find_references`, `blast_radius`).
- `skills/systematic-debugging/SKILL.md` & `root-cause-tracing.md`:
  - Update caller tracing to `find_references(symbol_name, direction="callers")`.

### 5.3 Hooks & Manifests
- `hooks/subagent-start`:
  - Reads `skills/using-razorback/references/subagent-toolchain.md` and outputs Claude Code `SubagentStart` hook JSON payload.
- `hooks/session-start`:
  - Injects `using-razorback` containing the `code-kb` toolchain table.
- Manifests:
  - `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`: Update descriptions from Miller to `code-kb`.

### 5.4 Documentation
- `AGENTS.md` and `CLAUDE.md`:
  - Replace the "Miller MCP Integration Pattern" section with "code-kb MCP Integration Pattern".
  - Update dependencies: `code-kb MCP is a hard requirement`.
- `README.md`, `docs/README.codex.md`, `docs/README.opencode.md`, `docs/adding-a-harness.md`, `docs/site/index.html`.

### 5.5 Scope Exclusions (Historical Records)
Per user confirmation, historical files in `docs/plans/` and `.memories/` represent frozen records of past runs and are preserved without modification.

---

## 6. Testing & Acceptance Criteria

1. **`node scripts/check-rule-copies.mjs` exits 0:**
   - All 5 host rule copies match `CANONICAL_PATH` byte-for-byte (frontmatter stripped).
   - All 10 invariant phrases are present in `CANONICAL_PATH`, `SKILL_PATH`, and `SUBAGENT_PATH`.
2. **`npm test` passes 100%:**
   - All 423+ tests pass cleanly.
   - `tests/rule-copies.test.mjs`, `tests/subagent-hook.test.mjs`, `tests/session-start.test.mjs`, `tests/debt-marker.test.mjs`, `tests/workflow-tool-contracts.test.mjs`, `tests/upstream-consistency.test.mjs`, and `tests/workflow-eval.test.mjs` pass with updated expectations.
3. **Manifest Sync:**
   - `./scripts/bump-version.sh --check` verifies all manifests match.
