# Subagent Toolchain

You are a dispatched subagent. When code-kb is available, it is the first route for code structure: a symbol's definition, a file's interface, callers and callees, and the tests a change affects. Native search and file reads are the first route for literal text and for a small file read or edited as a whole.

| Capability — use code-kb first | code-kb tool |
|---|---|
| **Orient** — top-level directory layout & architecture outline | `codebase_outline(path?, depth?)` |
| **List a file's symbols** before reading the whole file | `file_skeleton(file_path)` |
| **Exact / Prefix symbol lookup** | `lookup_symbol(query, path?)` |
| **Concept / BM25 search** over docstrings & signatures | `search_symbols(query, path?)` |
| **Inspect a symbol** — full implementation body | `get_symbol_body(symbol_name, file_path?)` |
| **Surgical context slice** — body + callee signatures + types + tests | `get_symbol_context(symbol_name, file_path?)` |
| **Find references** before changing a public API (callers/callees) | `find_references(symbol_name, direction="callers"|"callees")` |
| **Assess impact / blast radius** of a change | `blast_radius(symbol?, file?, depth?)` |
| **Structural facts** — routes, queries, models, config keys | `find_structural_facts(category?)` |

Use your host's native editing tools to modify files.

**Rules:**
1. Use code-kb first for code structure: `lookup_symbol`, then `get_symbol_body` or `get_symbol_context`, for a symbol by name; `file_skeleton` before a full read of a file that is not small; `find_references` for callers; `search_symbols` for a concept with an unknown name; `blast_radius` for the tests a change affects. Use native search and file reads first for literal text (strings, errors, comments, config values), a small file read or edited as a whole, and the code around a symbol after the skeleton shows where to look. When a code-kb answer is empty, capped, marked heuristic, or in conflict with other evidence, check it with native tools after the code-kb call.
2. Read the code a change touches before you edit it.
3. Find a symbol's callers before changing it, to check impact.
4. Do not infer or invent API shapes. Confirm symbol names, function signatures, config shapes, route names, CLI flags, or public contracts from current source before relying on them.
5. When the evidence cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
6. Indexed references and predicted tests can be incomplete. They are not proof that an omitted caller or test is irrelevant.
7. A missing or stale code-kb index never blocks work: use native search and file reads.
8. Run only the verification scope your task assigns. Broader suites belong to the lead. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

Restricted external CLI reviewers invoked by the pre-merge review workflow are the deliberate exception: they run without MCP under a read-only allowlist, read the lead's sanitized source-backed evidence bundle, and report missing evidence instead of claiming they ran code-kb. The lead verifies every finding against current source.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
