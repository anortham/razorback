# Verification Scope Contract

Razorback is language-agnostic: the target repo supplies concrete commands through its docs and the plan's Verification Strategy. Use these labels in worker prompts and reports.

| Scope | Owner | When |
|---|---|---|
| `worker-red-green` | Implementer | Prove the new or changed behavior during TDD with the lowest-cost repo-defined command |
| `worker-ceiling` | Implementer | Maximum scope a worker may run without lead assignment |
| `affected-change` | Lead | Touched files, changed subsystem, or repo-defined affected area after a coherent batch |
| `branch-gate` | Lead | Broad confidence before handoff, push, or PR |
| `expensive-specialist` | Lead | Slow domain gates only when touched areas or failures require them |

Rules:
- Workers never own `affected-change`, `branch-gate`, or `expensive-specialist`. A broad command a worker runs for diagnostics is labeled diagnostic, not acceptance evidence.
- A failing assigned gate stops the worker unless the plan explicitly says to update that gate. It is never acceptance evidence.
- Each worker report states the invariant every assigned gate proves; replay or metric evidence separates hard-gate metrics from report-only metrics.

Verification ledger, maintained by the lead:

```markdown
| Scope | Invariant | Command | Commit | Result | Time |
|-------|-----------|---------|--------|--------|------|
```

A passing entry for the same HEAD and scope is reusable instead of rerunning an expensive command. A new HEAD makes the affected scopes stale.
