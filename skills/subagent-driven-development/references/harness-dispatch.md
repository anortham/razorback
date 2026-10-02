# Per-harness dispatch, follow-up, and wait

One call per subagent; several calls in one turn run in parallel.

| Harness | Dispatch | Fix follow-up (Step 4) | Wait / state |
|---|---|---|---|
| Claude Code | `Agent` | `SendMessage` to the saved agent ID or name; the worker keeps its orientation context | — |
| opencode | `Task` (built-in `general` subagent; `@mention` also works) | no persistent resume: dispatch fresh with the brief path, prior-commit pointer, and findings | child sessions run in parallel; `session_child_*` keybinds |
| Codex | `spawn_agent(task_name="task-N-<slug>", message=<filled prompt>)`; save the returned agent ID | `followup_task(target=<agent-id>, message=<filled fix-prompt>)`; iteration 4: `spawn_agent(task_name="task-N-retry", …)` with the reframed section plus prior-commit SHAs | `wait_agent(timeout_ms=…)` blocks until completion; `list_agents` shows per-agent state; `interrupt_agent(target=<agent-id>)` cancels a stuck or no-longer-needed worker |
| Cursor/Composer from another harness | `razorback:cursor-agent` owns the CLI call; this lead still owns planning, review, fix routing, and final verification | via `razorback:cursor-agent` | — |

Trust the live tool list over these Codex names ([`codex-tools.md`](../../using-razorback/references/codex-tools.md)). If the collaboration tools are missing, set `multi_agent = true` in `~/.codex/config.toml`.

Save the agent ID (or name) returned by every dispatch; Step 4 routes fixes to it. Dispatch fresh before the 4th attempt only when the worker is unreachable (session error, context limit, ID lost to restart), its context is stale (another task changed the same files), or the fix needs a different approach — always with the prior-commit pointer.
