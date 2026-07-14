# Gemini CLI Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Gemini CLI equivalent |
|-----------------|----------------------|
| `Read` (file reading) | `read_file` |
| `Write` (file creation) | `write_file` |
| `Edit` (file editing) | `replace` |
| `Bash` (run commands) | `run_shell_command` |
| `Grep` (search file content) | `grep_search` |
| `Glob` (search files by name) | `glob` |
| `TodoWrite` / `TaskCreate` / `TaskUpdate` (task tracking) | `write_todos` |
| `Skill` tool (invoke a skill) | `activate_skill` |
| `WebSearch` | `google_web_search` |
| `WebFetch` | `web_fetch` |
| `Task` tool (dispatch subagent) | `invoke_agent` (see [Subagent dispatch](#subagent-dispatch)) |

## Subagent dispatch

Gemini CLI dispatches subagents via the `invoke_agent` tool. The `@agent-name` syntax works in user input as a hint, but the actual tool call the model makes is `invoke_agent`.

**Schema:**

```json
{
  "agent_name": "string (required) — the subagent to invoke",
  "prompt": "string (required) — the complete task prompt; must be self-contained",
  "wait_for_previous": "boolean (optional) — false/omit to run in parallel; true to serialize"
}
```

**Parallel dispatch is the default.** Multiple `invoke_agent` calls in one turn run concurrently unless you set `wait_for_previous: true` on a call you want serialized behind earlier ones.

### Built-in agents

| Agent | Use for |
|-------|---------|
| `generalist` | Default for razorback worker dispatch — multi-file refactors, test fixes, broad implementation tasks. Inherits the parent session's tools. |
| `codebase_investigator` | Read-only investigation, architectural mapping, root-cause analysis. Best when a skill needs research without writes. |
| `cli_help` | Questions about Gemini CLI itself (configuration, slash commands). Not used by razorback skills. |
| `browser_agent` | Web automation (experimental, disabled by default). |

For implementation work in razorback skills, dispatch `generalist`. The implementer/fix/code-reviewer prompt templates work as-is when sent as the `prompt` argument.

### Mapping skill dispatch templates

When a skill says to dispatch a named agent or use `Task` with a prompt template, fill the template and send it as `invoke_agent`'s `prompt`:

| Skill dispatch | Gemini equivalent |
|----------------|-------------------|
| `Task (general-purpose)` with inline prompt | `invoke_agent(agent_name="generalist", prompt=<inline prompt>)` |
| `Task (razorback:implementer)` template | `invoke_agent(agent_name="generalist", prompt=<filled implementer-prompt.md>)` |
| `Task (razorback:code-reviewer)` template | `invoke_agent(agent_name="generalist", prompt=<concatenated agent body + filled template>)` (see two-file note in `requesting-code-review/SKILL.md`) |
| `Task (razorback:fix)` template | `invoke_agent(agent_name="generalist", prompt=<filled fix-prompt.md>)` |

### Recursion protection

**Subagents cannot dispatch other subagents.** Gemini blocks `invoke_agent` from inside a running subagent to prevent infinite loops. This does not affect razorback's flow because the lead does inline review — workers never need to dispatch reviewers themselves. Plan dispatch from the lead session only.

### Custom agents (optional)

Custom agents can be defined as Markdown files with YAML frontmatter at:

- **Project-level:** `.gemini/agents/*.md` (shared with the team)
- **User-level:** `~/.gemini/agents/*.md` (personal)

Frontmatter schema: `name`, `description`, `kind` (default `local`), `tools`, `mcpServers`, `model`, `temperature`, `max_turns`, `timeout_mins`. The body becomes the agent's system prompt.

Razorback does not bundle custom Gemini agents by default. If you want a named `code-reviewer` agent on Gemini, drop `agents/code-reviewer.md` (with the body adapted to Gemini's frontmatter schema) into `.gemini/agents/` in the target repo.

## Additional Gemini CLI tools

These tools are available in Gemini CLI but have no Claude Code equivalent:

| Tool | Purpose |
|------|---------|
| `list_directory` | List files and subdirectories |
| `save_memory` | Persist facts to GEMINI.md across sessions |
| `ask_user` | Request structured input from the user |
| `tracker_create_task` | Rich task management (create, update, list, visualize) |
| `enter_plan_mode` / `exit_plan_mode` | Switch to read-only research mode before making changes |

## Miller MCP on Gemini CLI

Miller is supported on Gemini CLI via its MCP client. Razorback's exploration directives apply unchanged across harnesses: orient with `context`, search with `search`, inspect files/symbols with `inspect`, find references with `trace`, and assess blast radius with `impact`. See the capability mapping in `using-razorback`'s "Your Toolchain" section.
