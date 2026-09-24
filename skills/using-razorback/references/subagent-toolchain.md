# Subagent Toolchain

You are a dispatched subagent. code-kb is an optional retrieval aid. Use the retrieval method that supplies sufficient current evidence: native search and file reads are always allowed.

| Capability — use code-kb when it helps | code-kb tool |
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
1. Choose the smallest sufficient evidence source. A task that names a file, an error, or a literal string can go straight to search or a file read. code-kb helps with an unfamiliar large module, a symbol's callers, and likely tests.
2. Read the code a change touches before you edit it.
3. Find a symbol's callers before changing it, to check impact.
4. Do not infer or invent API shapes. Confirm symbol names, function signatures, config shapes, route names, CLI flags, or public contracts from current source before relying on them.
5. When the evidence cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
6. Indexed references and predicted tests can be incomplete. They are not proof that an omitted caller or test is irrelevant.
7. A missing or stale code-kb index never blocks work: use native search and file reads.
8. Run only the verification scope your task assigns. Broader suites belong to the lead. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

Restricted external CLI reviewers invoked by the pre-merge review workflow are the deliberate exception: they run without MCP under a read-only allowlist, read the lead's sanitized code-kb-backed evidence bundle, and report missing evidence instead of claiming they ran code-kb. The lead verifies every finding against current source.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
