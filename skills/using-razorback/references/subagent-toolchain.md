# Subagent Toolchain

You are a dispatched subagent. When code-kb is available, it is the first route for code structure: a symbol's definition, a file's interface, callers and callees, and the tests a change affects. Native search and file reads are the first route for literal text and for a small file read or edited as a whole.

| Capability — use code-kb first | code-kb tool |
|---|---|
| **Orient** — a folder's files and their top-level symbols | `file_skeleton(file_path=<folder>)` |
| **List the symbols of a file you do not know**, without bodies (`public_only` keeps the public surface) | `file_skeleton(file_path, public_only?)` |
| **Find a symbol** by name, prefix, or `Owner.member`, by concept words (ranked matches follow when no name matches), or a route or config key (a query with `/`, `.`, `{`, or `:`); a query that names one short definition also shows its body | `lookup_symbol(query, path?, kind?)` |
| **Inspect a symbol** — full implementation body | `get_symbol_body(symbol_name, file_path?)` |
| **Prepare to change a symbol** — body, return type, callers, tests to run, dependencies, types, and open ends in one answer | `get_symbol_context(symbol_name, file_path?)` |
| **Find references** — the full list of callers (labeled proven, likely, unresolved, or excluded) or callees, when the callers in `get_symbol_context` are not enough | `find_references(symbol_name, direction="callers"|"callees")` |
| **Assess impact / blast radius** — the full list of tests a change affects, or with no target the tests of the whole diff | `blast_radius(symbol?, file?, depth?)` |
| **Check an edit** — callers and tests the diff did not reach, after you edit | `check_edit(base?)` |

Every code-kb call takes `project_root`: the absolute path of the project or git worktree you work in. Change it when you move to another worktree.

Use your host's native editing tools to modify files.

**Rules:**
1. Use code-kb first for code structure: `file_skeleton` on a folder or a file you do not know, to orient; `lookup_symbol` for a symbol by name, or with a few words for a concept with an unknown name; `get_symbol_context` before you change a symbol: it carries the body, callers, tests to run, and types; `find_references` for callers, not `grep` or `rg` on the name; `check_edit` after you edit, before you say the change is done. Read the file you will edit, since the editor needs it. `find_references` and `blast_radius` give the full list when a summary is not enough, and `blast_radius()` lists the tests of the whole diff. Use native search and file reads first for literal text (strings, errors, comments, config values), a small file read or edited as a whole, and the code around a symbol after code-kb shows where to look. When a code-kb answer is empty, capped, marked heuristic, or in conflict with other evidence, check it with native tools after the code-kb call.
2. Read the code a change touches before you edit it.
3. Find a symbol's callers before changing it, to check impact.
4. Do not infer or invent API shapes. Confirm symbol names, function signatures, config shapes, route names, CLI flags, or public contracts from current source before relying on them.
5. When the evidence cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
6. Indexed references and predicted tests can be incomplete. They are not proof that an omitted caller or test is irrelevant.
7. A missing or stale code-kb index never blocks work: use native search and file reads.
8. Run only the verification scope your task assigns. Broader suites belong to the lead. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

Restricted external CLI reviewers invoked by the pre-merge review workflow are the deliberate exception: they run without MCP under a read-only allowlist, read the lead's sanitized source-backed evidence bundle, and report missing evidence instead of claiming they ran code-kb. The lead verifies every finding against current source.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
