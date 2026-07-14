# Codex Tool Mapping

Skills in razorback use Claude Code tool names. When you see these in a skill body, use the Codex equivalent:

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` / `Agent` tool (dispatch subagent) | `spawn_agent(task_name=..., message=...)` (returns an agent ID; see [Subagent dispatch](#subagent-dispatch)) |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls in the same turn |
| Task follow-up / resume | `followup_task(target=<agent-id>, message=...)` (new task for the same worker) or `send_message(target=<agent-id>, message=...)` |
| Task returns result | `wait_agent(timeout_ms=...)` (blocks until agent completion) |
| Cancel a running agent | `interrupt_agent(target=<agent-id>)` |
| List active agents | `list_agents(...)` |
| `TodoWrite` / `TaskCreate` / `TaskUpdate` | `update_plan` |
| `Skill` tool (invoke a skill) | Skills load natively, follow the instructions |
| `Read`, `Write`, `Edit` (files) | Your native file tools |
| `Bash` (run commands) | Your native shell tools |

The collaboration tool surface above was verified on codex 0.144.3 (tools:
`spawn_agent`, `followup_task`, `send_message`, `wait_agent`,
`interrupt_agent`, `list_agents`; there is no `close_agent`, no `send_input`,
and no `agent_type` parameter). Codex changes this surface between versions —
**trust the live tool list in your session over this table**, and map by
capability (dispatch / follow-up / wait / cancel / list) when names differ.

## Subagent dispatch

Razorback's parallel execution skills (`subagent-driven-development`, `dispatching-parallel-agents`) use Codex's multi-agent collaboration tools. They are enabled by default on current codex (verified 0.144.3); older versions needed `multi_agent = true` under `[features]` in `~/.codex/config.toml`. If no collaboration tools appear in your session, set that flag or update codex.

### Dispatching implementers

Razorback's subagent prompts live in the skills themselves:

- `skills/subagent-driven-development/implementer-prompt.md`
- `skills/subagent-driven-development/fix-prompt.md`

(`spec-reviewer-prompt.md` and `code-quality-reviewer-prompt.md` in the same
directory are checklists the lead applies during inline review — they are never
dispatched to a subagent.)

When a skill says to dispatch a subagent with a prompt:

1. Read the prompt file
2. Fill any template placeholders (task spec, file ownership, Miller directives)
3. Choose any model override only when the user, environment, or lead explicitly
   wants one for this run. Otherwise use the harness default.
4. Spawn a worker with the filled content as the `message`

```
spawn_agent(task_name="task-N-<slug>", message=<filled prompt>)
```

Model choice is left to the lead agent. Razorback does not require a model table
or a per-task model override before spawning workers.

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

On Codex, delegated plan execution uses `subagent-driven-development`: dispatch fresh implementer subagents per task, parallel when independent, lead does inline review. If the current Codex harness or session policy does not allow delegation, fall back to `executing-plans`.

| Codex session state | Execution skill |
|--------------------|-----------------|
| Delegation available | `subagent-driven-development` |
| Delegation unavailable | `executing-plans` |

For single-task or tightly sequential work, use `executing-plans` even when delegation is available.

### External model CLI waiting

When using a skill that launches another model through a CLI, such as
`cursor-agent -p`, `claude -p`, `codex exec`, or `gemini -p`, run it as a
foreground command and let it finish. The lead model should not narrate elapsed
time, guess why the external model is slow, or do repeated status checks just
because the command is still running.

Codex shell tools may return a running session before the external model CLI
finishes. If that happens, do not send speculative progress updates. Poll no
more often than every 2 minutes unless the CLI produced actionable output or the
user asked for status. Prefer a quiet long wait with an empty `write_stdin` call
and `yield_time_ms=300000`, then inspect the final output, diff, and
verification results after the command exits.

## Miller MCP

Razorback assumes Miller MCP is available. The exploration directives in skill bodies (orient, search, inspect, find references, assess impact) require it.

Use these Miller tools by capability:

- Orient: `context(query)`
- Search: `search(query, mode=auto|text|symbol|file|content)`
- List file symbols or inspect a symbol: `inspect(target, depth=summary|full)`
- Find references/call paths: `trace(target)`
- Assess blast radius: `impact(target)`
- Manage indexing: `workspace(...)`

See the capability → tool mapping table in `using-razorback`'s "Your Toolchain" section. Install and configure Miller before using razorback for real work.

## Goldfish MCP

Razorback also assumes Goldfish MCP is available for checkpoints, recall, and recovery during long autonomous runs. Install and configure it before relying on the autonomous execution flow.

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
