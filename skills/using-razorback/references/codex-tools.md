# Codex Tool Mapping

Skills in razorback use Claude Code tool names. When you see these in a skill body, use the Codex equivalent:

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` / `Agent` tool (dispatch subagent) | `spawn_agent(task_name=..., message=...)` (returns an agent ID; see [Subagent dispatch](#subagent-dispatch)) |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls in the same turn |
| Task follow-up / resume | `followup_task(target=<agent-id>, message=...)` (new task for the same worker) or `send_message(target=<agent-id>, message=...)` |
| Wait for worker activity | `wait_agent(timeout_ms=...)`; a wakeup may be a message, timeout, or completion, so inspect the returned status or completion payload before treating the worker as done |
| Cancel a running agent | `interrupt_agent(target=<agent-id>)` |
| List active agents | `list_agents(...)` |
| `TodoWrite` / `TaskCreate` / `TaskUpdate` | Use an available durable plan, checklist, or execution ledger; do not invent a planning tool that is absent from the live session |
| `Skill` tool (invoke a skill) | Skills load natively, follow the instructions |
| `Read`, `Write`, `Edit` (files) | Your native file tools |
| `Bash` (run commands) | Your native shell tools |

Codex changes its collaboration surface between versions and hosts. **Trust the
live callable tool schemas in your session over this table.** Map by capability
(dispatch / follow-up / wait / cancel / list), pass only parameters the live
schema exposes, and do not infer missing tools or arguments from examples here.

## Subagent dispatch

Razorback's parallel execution skills (`subagent-driven-development`, `dispatching-parallel-agents`) use Codex's multi-agent collaboration tools when the live session exposes them. If no collaboration tools appear, use the documented no-delegation fallback; do not infer a configuration flag or CLI version remedy from this mapping.

### Dispatching implementers

Razorback's subagent prompts live in the skills themselves:

- `skills/subagent-driven-development/implementer-prompt.md`
- `skills/subagent-driven-development/fix-prompt.md`

(`spec-reviewer-prompt.md` and `code-quality-reviewer-prompt.md` in the same
directory are checklists the lead applies during inline review — they are never
dispatched to a subagent.)

When a skill says to dispatch a subagent with a prompt:

1. Read the prompt file
2. Fill any template placeholders (task spec, file ownership, code-kb directives)
3. Choose any model or role override only when the user, environment, or lead
   explicitly wants one and the live schema exposes it. Otherwise use the
   harness default.
4. Spawn a worker with the filled content as the `message`, using only the
   arguments present in the live schema.

```
spawn_agent(task_name="task-N-<slug>", message=<filled prompt>, fork_turns="none")
```

Model choice is left to the lead agent. Razorback does not require a model table
or a per-task model override before spawning workers.

- **Spawning with context isolation:** give children a clean context with
  `spawn_agent {fork_turns: "none"}`; the default `"all"` copies your
  entire transcript into the child. On Codex 0.145+, role files under
  `~/.codex/agents/` attach to isolated forks via `agent_type`.
  Full-history forks accept `model` and `reasoning_effort` overrides
  (only `agent_type` is refused there) — isolated forks are the default
  for context hygiene.
- **Fix rounds and resumes:** on multi-agent V2, resume the implementer
  with `followup_task(target=<agent-id>, message=...)` — it delivers your
  message, triggers a turn, and transparently reloads a child the harness
  evicted.
- **Lifecycle:** V2 has no `close_agent`. Finished children are evicted
  automatically when slots are needed; leaving them unclosed costs nothing.
  Only V1 sessions have `close_agent` — there, close implementers after their
  task's review passes.
- **Model routing on spawns:** every `spawn_agent` call that sets `model`
  MUST set `reasoning_effort` explicitly as well. Setting `model` alone
  silently resets reasoning effort to that model's default, not to yours.
  You can set a machine-level backstop in `~/.codex/config.toml`:
  ```toml
  [agents]
  default_subagent_model = "<a mid-tier model from your spawn allowlist>"
  default_subagent_reasoning_effort = "medium"
  ```

### Waiting on children

`wait_agent` is an event subscription, not a poll: a long wait wakes
the moment a child produces mailbox activity, with the same latency as
a short one. Short-timeout polling buys nothing and costs a tool call —
and a context rebill — per poll.

- While you still have local work, do not wait at all. A completed child's
  final answer is pushed into your mailbox and arrives with your next turn.
- When you are genuinely idle with children outstanding, wait in bounded
  stretches: `wait_agent` with `timeout_ms` 300000-600000 (5-10 minutes).
  Never stack polls shorter than five minutes; the event subscription wakes
  a bounded stretch just as fast as a short one.
- Completion mail cannot wake an idle controller (it is delivered without
  triggering a turn); covering that idle window is `wait_agent`'s only job.

### Parallel safe batches

When an approved plan marks multiple eligible safe tasks in the same batch, that approval is also approval to make multiple `spawn_agent` calls in the same turn. In other words: multiple eligible safe tasks mean multiple `spawn_agent` calls in the same turn.

Do not serialize a safe batch just because it feels simpler. If you serialize, record the dependency or tool limitation that forced it. Serializing requires a recorded dependency or tool limitation.

### Message framing

The `message` parameter is user-level input, not a system prompt. Structure it for instruction adherence:

```
Your task is to perform the following. Follow the instructions below exactly.

<agent-instructions>
[filled prompt content]
</agent-instructions>

Execute this now. Output ONLY the structured response following the format
specified in the instructions above.
```

- Task-delegation framing ("Your task is...") beats persona framing ("You are...")
- Wrap instructions in XML tags so the model treats them as authoritative
- End with an explicit execution directive to prevent the agent from summarizing instructions instead of executing them

## Execution model on Codex

On Codex, the current agent does one coherent task directly. Delegated plan execution uses `subagent-driven-development` for independent tasks, or tasks whose separate context has a clear benefit: dispatch fresh implementer subagents, parallel when independent, lead does inline review. If the current Codex harness or session policy does not allow delegation, use `executing-plans`.

| Work | Execution skill |
|------|-----------------|
| One coherent task | the current agent, directly (`executing-plans` when a plan file exists) |
| Independent tasks or a clear context benefit, delegation available | `subagent-driven-development` |
| Delegation unavailable, or single-agent execution selected | `executing-plans` |

### External model CLI waiting

When using a skill that launches another model through a CLI, such as
`cursor-agent -p`, `claude -p`, or `codex exec`, run it as a
foreground command and let it finish. The lead model should not narrate elapsed
time, guess why the external model is slow, or do repeated status checks just
because the command is still running.

Codex shell tools may return a running session before the external model CLI
finishes. If that happens, do not send speculative progress updates. Poll no
more often than every 2 minutes unless the CLI produced actionable output or the
user asked for status. Prefer a quiet long wait with an empty `write_stdin` call
and `yield_time_ms=300000`, then inspect the final output, diff, and
verification results after the command exits.

## code-kb MCP

Razorback assumes code-kb MCP is available. The exploration directives in skill bodies (orient, search, inspect, find references, assess impact) require it.

Use these code-kb tools by capability:

- Orient: `codebase_outline(path?, depth?)`
- List a file's symbols / skeleton: `file_skeleton(file_path)`
- Exact/prefix symbol lookup: `lookup_symbol(query, path?)`
- Concept / BM25 search: `search_symbols(query, path?)`
- Inspect symbol body: `get_symbol_body(symbol_name, file_path?)`
- Surgical context slice: `get_symbol_context(symbol_name, file_path?)`
- Find callers/callees: `find_references(symbol_name, direction="callers"|"callees")`
- Assess blast radius / test impact: `blast_radius(symbol?, file?, depth?)`
- Code-shape facts (routes, queries, models, config keys): `find_structural_facts(category?)`
- Tool usage & token savings summary: `telemetry_summary(time_window?, workspace_only?)`

See the capability → tool mapping table in `using-razorback`'s "Your Toolchain" section. CLI 1:1 commands are `code-kb lookup <query>`, `code-kb context <symbol>`, and `code-kb stats` (or `code-kb telemetry`). Install and configure code-kb before using razorback for real work.

## Goldfish MCP

Goldfish MCP is optional. When it is available, razorback uses it for decision and handoff checkpoints and for recall on resume. Without it, the plan, the ledger, and git state carry recovery.

## Environment detection for worktrees

Skills that create worktrees or finish branches should detect their environment with read-only git commands before proceeding:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` means already in a linked worktree (skip creation)
- Empty `BRANCH` means detached HEAD (cannot branch, push, or open a PR from the sandbox)

If the sandbox blocks branch/push operations, commit all work and hand off to the user's local checkout. The agent can still run tests, stage files, and output suggested branch names, commit messages, and PR descriptions for the user to copy.
