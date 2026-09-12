# Subagent Toolchain (Miller-first)

You are a dispatched subagent. **Miller MCP is available and MUST be used** for ALL codebase
exploration — instead of Glob/Grep/Read chains.

| Capability — do this BEFORE the raw-file reflex | Miller tool |
|---|---|
| **Orient** — token-budgeted bundle for a task or area | `context(query)` |
| **Search** — text, symbol, file/path, or concept; `markers` for TODO/FIXME, `source` for bodies, `content` for docs/prose | `search(query, mode=auto\|text\|symbol\|file\|markers\|content\|source\|external\|web\|all-text)` |
| **List a file's symbols** before reading the whole file | `inspect(target='<file>')` |
| **Inspect a symbol** — `overview` first; `full` only when editing it | `inspect(target='<symbol>', depth=summary\|overview\|full)` |
| **Find references** before changing a public API | `trace(target)` |
| **Assess impact / blast radius** | `impact(target)` |
| **Code-shape facts** — routes, config keys, doc structure | `patterns(...)` |
| **Large text** — import, then search logs or CI output | `content(...)` |
| **Rename / edit** a symbol safely | `edit(operation, target)` |
| **Manage the workspace index** | `workspace(...)` |

**Rules:**
1. Use Miller for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use Miller to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When Miller cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
7. Run only the verification scope your task assigns. Broader suites belong to the lead. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

Restricted external CLI reviewers invoked by the pre-merge review workflow are the deliberate exception: they run without MCP under a read-only allowlist, read the lead's sanitized Miller-backed evidence bundle, and report missing evidence instead of claiming they ran Miller.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
