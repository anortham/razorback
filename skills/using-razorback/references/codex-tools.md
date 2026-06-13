# Codex Tool Mapping

Skills in razorback use Claude Code tool names. When you see these in a skill body, use the Codex equivalent:

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` / `Agent` tool (dispatch subagent) | `spawn_agent` (returns an agent ID; see [Subagent dispatch](#subagent-dispatch)) |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls |
| Task follow-up / resume | `send_input(target=<agent-id>, message=...)` |
| Task returns result | `wait_agent(targets=[<agent-id>])` |
| Task completes | `close_agent(target=<agent-id>)` to free the slot |
| `TodoWrite` / `TaskCreate` / `TaskUpdate` | `update_plan` |
| `Skill` tool (invoke a skill) | Skills load natively, follow the instructions |
| `Read`, `Write`, `Edit` (files) | Your native file tools |
| `Bash` (run commands) | Your native shell tools |

## Subagent dispatch

Razorback's parallel execution skills (`subagent-driven-development`, `dispatching-parallel-agents`) require Codex's multi-agent feature. Add to `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

This enables `spawn_agent`, `send_input`, `wait_agent`, and `close_agent`.

### Dispatching implementers

Razorback's subagent prompts live in the skills themselves:

- `skills/subagent-driven-development/implementer-prompt.md` (if present) or inline in the skill body
- `skills/subagent-driven-development/fix-prompt.md`
- `skills/subagent-driven-development/spec-reviewer-prompt.md`
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

When a skill says to dispatch a subagent with a prompt:

1. Read the prompt file
2. Fill any template placeholders (task spec, file ownership, Miller directives)
3. Apply the plan's model-routing tier when the session supports per-agent selection. If no route is available, inherit the parent model/reasoning and note it.
4. Spawn a `worker` agent with the filled content as the `message`

```
spawn_agent(agent_type="worker", message=<filled prompt>)
```

When using Codex Desktop or another Codex harness that exposes model controls, map razorback tiers through the project's `RAZORBACK.md`:

```text
strategy    -> planning, architecture, lead review
implementation -> bounded worker tasks from a clear plan
mechanical  -> docs, fixtures, rote edits with no gate ownership
gate-review -> plan + failing gate + diff triage
escalation  -> subtle correctness, security, weak tests, gate interpretation, repeated failures
```

Do not hard-code model names in generic prompts. Use the mapping from the project policy. If the configured route is unsupported by the current Codex session, use `inherit` and report the limitation.

In Codex, a project `RAZORBACK.md` model-routing block counts as a clear
task-specific reason to set `spawn_agent(model=..., reasoning_effort=...)` when
the current session supports per-agent model selection. Do not leave `model`
unset when a supported route exists. Inherit only when the route itself says
`inherit`, no route exists, or the harness cannot select the mapped model or
reasoning effort.

Use mechanical or implementation tiers only for boxed-in lanes. Mechanical
workers cannot own failing tests, replay evidence, metrics, or acceptance gates.
Test-audit work can use a lower-cost tier when it is checklist-driven coverage
enumeration and owns no failing gate. Keep it on strategy, escalation, or the
project's gate-review route when it requires judgment about weak tests, hidden
invariants, scoring semantics, shared workspace behavior, replay evidence,
metric semantics, or correctness risk.

For Codex gate-review lanes, prefer the project route for a reviewer that reads
the plan, failing test or replay, and diff, then decides whether the test or
implementation is wrong. In repos following the current Razorback policy, that
route is `gpt-5.4` at high reasoning.

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
