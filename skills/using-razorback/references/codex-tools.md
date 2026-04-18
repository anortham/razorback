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

Razorback's teammate/subagent prompts live in the skills themselves:

- `skills/subagent-driven-development/implementer-prompt.md` (if present) or inline in the skill body
- `skills/subagent-driven-development/spec-reviewer-prompt.md`
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md`
- `skills/team-driven-development/implementer-prompt.md` (Claude Code only, not usable on Codex)

When a skill says to dispatch a subagent with a prompt:

1. Read the prompt file
2. Fill any template placeholders (task spec, file ownership, Julie directives)
3. Spawn a `worker` agent with the filled content as the `message`

```
spawn_agent(agent_type="worker", message=<filled prompt>)
```

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

`team-driven-development` is a Claude Code only skill. Agent Teams with persistent named teammates are not available in Codex. On Codex, the primary execution path is `subagent-driven-development`: dispatch fresh implementer subagents per task, parallel when independent, lead does inline review.

| Platform | Primary execution skill |
|----------|-------------------------|
| Claude Code | `team-driven-development` |
| Codex | `subagent-driven-development` |
| OpenCode | `subagent-driven-development` |

For single-task or sequential work on any platform, use `executing-plans`.

## Julie MCP

Razorback assumes Julie MCP is available. The exploration directives in skill bodies (`get_context`, `deep_dive`, `fast_refs`, `get_symbols`) require Julie. Install and configure it before using razorback for real work: https://github.com/anortham/julie

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
