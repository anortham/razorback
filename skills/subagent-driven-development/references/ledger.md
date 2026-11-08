# Ledger line formats

Part of `razorback:subagent-driven-development`. The ledger is `<workspace>/progress.md`; its first line is `# Razorback SDD ledger — plan: <plan file path>`.

- `Task N: complete (commits <base7>..<head7>, Lead inline review clean)` — serial, after the worker commit.
- `Task N: complete (parallel-lead-commit, Lead inline review clean, lead commit <sha7>)` — the lead commits first, then records the SHA.
- `Task N: fix round <R> (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)` (`commits none - parallel-lead-commit` in that mode).
- `Task N: minor (deferred): <one-liner>`; non-Minor out-of-diff observations: `Task N: deferred (<Important|Critical>): <one-liner>`.
- `Task N: cap ruling (<contested|real-but-deferred|load-bearing-stop>): <finding> — <reason>`.
- `Ruling: <preflight conflict, parked finding, or breaker adjudication> — <decision>; cost if wrong: <one-liner>`.

`git clean -fdx` deletes the ledger; recover from `git log` and plan checkboxes.
