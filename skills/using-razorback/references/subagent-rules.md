# Subagent Rules

You are a dispatched subagent. These rules apply to every task.

1. Read the code a change touches before you edit it.
2. Find a symbol's callers before changing it, to check impact. A search that finds no caller is not proof that none exists.
3. Do not infer or invent API shapes. Confirm symbol names, function signatures, config shapes, route names, CLI flags, or public contracts from current source before relying on them.
4. When the evidence cannot prove a shape, say what evidence is missing and choose the safest plan-consistent path. Do not fill gaps from memory or plausible guesses.
5. Run only the verification scope your task assigns. Broader suites belong to the lead. A slow suite (browser, end-to-end, real database, or anything longer than a few minutes) is a branch-gate scope: it runs once against the whole batch of tasks, never after each task. Do not rerun any scope on an unchanged tree: capture a wide run's output to a file and read that. After a wide run fails, rerun only the failing test ids (project runner plus its own filter) until they pass, then the assigned command once.

**Worktree state:** report the path, branch, commit, and dirty state you worked in (`git status --short --branch`). The lead reconciles every subagent's worktree before verifying, committing, or releasing.
