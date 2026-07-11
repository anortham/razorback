# Subagent Toolchain (Miller-first)

You are a dispatched subagent. **Miller MCP is available and MUST be used** for ALL codebase
exploration — instead of Glob/Grep/Read chains.

Use Miller by capability, not by raw file reading:

| Capability — do this BEFORE the raw-file reflex | Miller tool |
|---|---|
| **Orient** — token-budgeted bundle for a task or area | `context(query)` |
| **Search** — find code by text, symbol, file/path, content, or concept | `search(query, mode=auto|text|symbol|file|content)` |
| **List a file's symbols** before reading the whole file | `inspect(path)` |
| **Inspect a symbol** (callers, callees, body) before modifying it | `inspect(symbol, depth=full)` |
| **Find references** before changing a public API | `trace(target)` |
| **Assess impact / blast radius** of a change | `impact(target)` |
| **Rename / edit** a symbol safely | `edit(operation, target)` |
| **Manage the workspace index** | `workspace(...)` |

**Rules:**
1. Use Miller for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. List a file's symbols before reading it in full.
3. Inspect a symbol before modifying it.
4. Find a symbol's references before changing it, to check impact.
5. Do not infer or invent API shapes. Use Miller to discover symbol names, function signatures, config shapes, route names, CLI flags, or public contracts before relying on them.
6. When Miller cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.

**Worktree state:** report the path, branch, commit, and dirty state you actually worked in
(`git status --short --branch`). The lead reconciles every subagent's worktree before verifying,
committing, or releasing, and cannot do that from an unreported path.
