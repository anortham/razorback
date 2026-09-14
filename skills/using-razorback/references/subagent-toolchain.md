# Subagent Toolchain (code-kb-first)

You are a dispatched subagent. **code-kb MCP is available and MUST be used** for ALL codebase
exploration — instead of Glob/Grep/Read chains.

| Capability — do this BEFORE the raw-file reflex | code-kb tool |
|---|---|
| **Orient** — top-level directory layout & architecture outline | `codebase_outline(path?, depth?)` |
| **List a file's symbols** before reading the whole file | `file_skeleton(file_path)` |
| **Exact / Prefix symbol search** | `find_symbol(query, path?)` |
| **Concept / BM25 search** over docstrings & signatures | `search_symbols(query, path?)` |
| **Inspect a symbol** — full implementation body | `get_symbol_body(symbol_name, file_path?)` |
| **Surgical context slice** — body + callee signatures + types + tests | `get_context_slice(symbol_name, file_path?)` |
| **Find references** before changing a public API (callers/callees) | `find_references(symbol_name, direction="callers"|"callees")` |
| **Assess impact / blast radius** of a change | `blast_radius(symbol?, file?, depth?)` |
| **Structural facts** — routes, queries, models, config keys | `find_structural_facts(category?)` |
| **Rename / edit** a symbol safely with AST validation | `replace_symbol_body(symbol_name, file_path, new_body)` |

**Rules:**
1. Use code-kb for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use code-kb to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When code-kb cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
7. Run only the verification scope your task assigns. Broader suites belong to the lead. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

Restricted external CLI reviewers invoked by the pre-merge review workflow are the deliberate exception: they run without MCP under a read-only allowlist, read the lead's sanitized code-kb-backed evidence bundle, and report missing evidence instead of claiming they ran code-kb.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
