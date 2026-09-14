---
title: razorback rules
inclusion: always
---

# razorback rules

code-kb MCP is available and MUST be used for ALL codebase exploration — instead of Glob/Grep/Read chains.

Use code-kb by capability, not by raw file reading:

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

**Exploration rules:**

1. Use code-kb for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use code-kb to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When code-kb cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.

Restricted external CLI reviewers invoked by the pre-merge review workflow are
the deliberate exception. They run without MCP under
an enforced read-only allowlist. The lead supplies a sanitized code-kb-backed
evidence bundle, the reviewer reports missing evidence instead of claiming
code-kb use, and the lead verifies every finding with code-kb.

**Process rules — in this order, every time:**

1. **Understand before you plan.** Orient with code-kb and read the code the task actually touches. Trace the real flow end to end before proposing a change.
2. **Plan before you code.** For anything beyond a small local fix, state the approach and the files it touches first. Small, local, reversible fixes skip the ceremony: fix on the current checkout and verify the affected scope.
3. **Test first.** Write the failing test before the implementation, watch it fail for the right reason, then make it pass. No implementation-shaped tests written after the fact.
4. **Verify before claiming done.** Run the narrowest real check that would fail if the change is wrong. "Should work", "looks right", and a passing typecheck are not verification. If a check cannot be run, say so and name the evidence you did check instead.
5. **Scope test runs.** In the inner loop, run single tests or the focused group that covers the change. Run broader suites at task boundaries, and the full suite once at the branch gate before push or PR. Do not rerun any scope on an unchanged tree — capture a wide run's output to a file, read that, and cite the earlier result. After a wide run fails, rerun only the failing test ids through the project runner's own filter until they pass, then the wide command once.
6. **Root cause, not symptom.** A report names a symptom. Find every caller with `find_references`, fix the shared cause once, and do not patch only the path the report names.
7. **Do not narrow the task.** No stubs, placeholders, fake data, or hard-coded happy paths standing in for real behavior. Do not weaken tests or docs to make incomplete work look complete.
