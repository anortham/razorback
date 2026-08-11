# Razorback

**Miller-powered development workflow for Claude Code, Codex CLI / ChatGPT desktop app, and OpenCode.**

> Website: [anortham.github.io/razorback](https://anortham.github.io/razorback/) — the setup path from nothing to a working install, on one page.

Razorback is a skill set for coding-agent harnesses, diverged from [Superpowers](https://github.com/obra/superpowers) to add Miller MCP for token-efficient codebase orientation. Plan execution runs through `subagent-driven-development` on harnesses that support delegation, and `executing-plans` where delegation is unavailable.

**Supported harnesses.** Claude Code, Codex CLI / ChatGPT desktop app (rebranded from Codex), and OpenCode get the full plugin: skills, agents, bootstrap, and delegated execution. Cursor is **frozen** — its plugin support still works and is documented below, but it receives no new work. Copilot CLI is **instruction-tier**: it picks up razorback's Miller-first ruleset from `.github/copilot-instructions.md` and nothing else.

## Why?

AI-assisted development burns tokens on repetitive codebase exploration. Every agent and subagent re-discovers the same code through Glob/Grep/Read chains. Razorback solves this two ways:

- **Miller MCP** routes all exploration through purpose-built tools — `search`, `context`, `inspect`, `trace`, `impact`, and `workspace` — that return targeted context in 1-2 calls instead of 5-8.
- **Miller-first applies to every worker**: the lead, implementers, reviewers, and fix workers all orient with Miller before raw file reads.
- **Parallel subagent dispatch with inline review by the lead** keeps the main agent's context clean while letting independent tasks move concurrently.
- **Autonomous execution of approved plans** with optional pre-merge external review (codex / claude) and compaction-durable goldfish checkpoints; runs overnight without waking you for anything short of a real blocker

## Requirements

- A supported harness: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex CLI / ChatGPT desktop app](https://openai.com/codex/), or [OpenCode](https://opencode.ai) — plus frozen support for [Cursor](https://cursor.sh)
- Miller MCP — hard requirement for code orientation and symbol-aware review; must be configured and indexing your workspace
- [Goldfish MCP Server](https://github.com/anortham/goldfish) — hard requirement for persistent memory (checkpoints, briefs, recall); used for compaction-durable execution during long autonomous runs
- For Codex: enable `multi_agent = true` in `~/.codex/config.toml` so parallel execution skills can dispatch subagents

## Installation

Razorback is a pure-content plugin (skills, commands, hooks) — no build step or runtime dependencies required. Install paths below are all "pull from GitHub"; most harnesses support one-liner installs.

### Claude Code

```bash
/plugin marketplace add anortham/razorback
/plugin install razorback@razorback
```

Scope to a specific project instead of user-wide:

```bash
/plugin install razorback@razorback --scope project
```

Or clone and load locally for development:

```bash
git clone https://github.com/anortham/razorback.git
claude --plugin-dir /path/to/razorback
```

### Cursor (frozen)

Cursor support is frozen: it works as documented here, but receives no new development.

Cursor has a plugin marketplace, but razorback isn't listed there yet. For now, clone and point Cursor at the local checkout via its plugin-load mechanism:

```bash
git clone https://github.com/anortham/razorback.git ~/path/to/razorback
# Then in Cursor: add ~/path/to/razorback to your plugin paths
```

The plugin manifest at `.cursor-plugin/plugin.json` declares skills, agents, commands, and hooks.

### Codex CLI / ChatGPT desktop app

The ChatGPT desktop app was rebranded from Codex; both use the same install path below.

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.codex/INSTALL.md
```

Preferred install: use the Codex plugin path documented in `.codex/INSTALL.md`. It installs razorback from the repo-scoped marketplace entry in `.agents/plugins/marketplace.json`, then relies on native skill discovery to load the bundled skills at startup.

Manual clone plus `~/.agents/skills/razorback` symlink remains the local-development fallback. Delegated execution skills (`subagent-driven-development`, `dispatching-parallel-agents`) still require Codex's `multi_agent` feature.

**Detailed docs:** [.codex/INSTALL.md](.codex/INSTALL.md)

### OpenCode

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.opencode/INSTALL.md
```

**Detailed docs:** [.opencode/INSTALL.md](.opencode/INSTALL.md)

### Copilot CLI (instruction-tier)

Copilot CLI gets the Miller-first ruleset only — no skills, no agents, no delegated execution. Copy razorback's instruction-tier ruleset into the repo you work in; Copilot reads that path natively:

```bash
curl -fsSL https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.github/copilot-instructions.md \
  -o .github/copilot-instructions.md
```

If the repo already has a `.github/copilot-instructions.md`, merge the ruleset in rather than overwriting.

### After Installation

Once loaded, razorback works automatically. The bootstrap path varies by harness:

1. **Session starts** — the `SessionStart` hook (Claude Code, Cursor), `messages.transform` (OpenCode), or native skill discovery from the installed Codex plugin or fallback skills symlink (Codex) surfaces the `using-razorback` skill.
2. **You request work** — the agent checks for applicable skills before every response.
3. **Skills guide the workflow** — brainstorming, planning, TDD, execution, review, and verification all route through Miller and the appropriate execution strategy for your harness.

No configuration needed beyond plugin installation (assuming Miller is already set up).

## Project Policy

Razorback does not need a separate project-policy file. Use the active project
instructions (`AGENTS.md`, `CLAUDE.md`, or the harness equivalent)
plus the approved plan.

Razorback owns process contracts:

- skill routing and Miller-first orientation
- parallel-safety checks and file ownership
- commit mode for serial versus parallel batches
- verification scopes and gate ownership
- blocker handling and final branch verification

Model choice is not a Razorback contract. Use the harness default unless the
user, environment, or lead agent explicitly selects a different model for that
run.

## Updating

No harness auto-pulls new content on restart. You have to opt in to updates.

### Claude Code

**If installed via marketplace (recommended):** enable auto-updates once, then updates pull on each session start.

```bash
# Turn on auto-update for the razorback marketplace
/plugin marketplace update razorback --auto

# Or pull a one-off update manually
/plugin marketplace update razorback
/plugin install razorback@razorback
```

**If installed from a local clone:** `git pull` the repo. Claude Code reloads plugin content on the next session start.

### Cursor (frozen)

Update by `git pull` in the local clone and restarting Cursor.

### Codex CLI / ChatGPT desktop app

For the preferred plugin install path and the local clone fallback, follow the update instructions in [.codex/INSTALL.md](.codex/INSTALL.md).

### OpenCode

OpenCode installs razorback as a Bun-cached npm/git package. The reliable pattern is pin-and-bump:

```json
{
  "plugin": ["razorback@git+https://github.com/anortham/razorback.git#<version>"]
}
```

Change the tag in `opencode.json`, then restart OpenCode. Bun caches by the full spec, so changing `#ref` forces a fresh fetch.

Unpinned installs (`razorback@git+…razorback.git` with no `#ref`) may or may not refresh on restart depending on Bun version. If yours gets stuck, flush the cache:

```bash
# macOS/Linux
rm -rf ~/.config/opencode/node_modules/razorback
# Windows PowerShell
Remove-Item -Recurse -Force "$env:USERPROFILE\.config\opencode\node_modules\razorback"
```

Then restart OpenCode.

See [.opencode/INSTALL.md](.opencode/INSTALL.md) for more detail.

### Copilot CLI (instruction-tier)

Re-run the `curl` from the install section to refresh `.github/copilot-instructions.md`.

## Workflow

The core process: brainstorm, plan, TDD, execute, review, finish.

**Execution model (primary path depends on harness):**
- **Autonomous by default:** once a plan is approved, execution runs to completion gated only by real blockers. A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. An optional pre-merge external review (codex / claude) runs before branch finish. See [autonomous-execution design](docs/plans/2026-04-18-autonomous-execution-design.md) for the rationale.
- **2+ independent tasks (any plugin-tier harness):** `subagent-driven-development` dispatches fresh implementer subagents (in parallel when tasks are independent), and the lead does inline review (spec compliance + code quality) per task.
- **1 task, tightly sequential work, or no delegation available:** `executing-plans` runs single-agent batch execution.
- **Ad-hoc parallel work (delegation available):** `dispatching-parallel-agents` for independent tasks outside plans.
- **Small, local, reversible fixes:** `fixing-small-issues` triages against objective criteria (≤ 2 files, ~20 lines, no contract changes) and fixes on the current checkout — no worktree, no baseline suite run, affected-scope verification only. Escalates to the standard flow the moment the fix outgrows the criteria.

**Verification and delegation:**
- Plans define language-agnostic verification scopes: worker red/green, worker ceiling, affected-change, branch gate, and expensive specialist gates.
- Concrete commands come from the target repo, not from razorback.
- The lead owns decomposition, integration review, escalation, and final branch verification.

**Visual digest (opt-in):**
- Long documents can ship a single-file HTML view beside the markdown, same basename — no build step, no external assets, light and dark.
- The component kit is [`skills/using-razorback/references/digest-kit.md`](skills/using-razorback/references/digest-kit.md): layout contract, kit CSS, status chips, hero figure with meter, timeline spine, tabs, and authoring rules.
- Three read moments can emit one: `brainstorming` at the User Review Gate (`<design-doc>.html`), `writing-plans` at the plan-save announcement (`<plan>.html`), and `finishing-a-development-branch` when it renders the morning report (the report's `.html` sibling).
- Digests are opt-in: ask for one in the session, or request them in project instructions. No skill writes one unprompted.

## Skills

| Skill | Purpose |
|-------|---------|
| using-razorback | Entry point: skill routing, execution model, Miller toolchain |
| brainstorming | Requirements exploration, design, approach selection |
| prototyping | Throwaway-code off-ramp from brainstorming for empirical design questions: logic TUIs or UI variants, captured on a `prototype/<slug>` branch |
| fixing-small-issues | Quick-fix tier: triage small defects/tweaks by objective criteria, fix in place, affected-scope verification |
| harvesting-debt | Debt ledger: collects the `razorback:` shortcut markers left by deliberate corner-cuts, flagging any that name no upgrade trigger |
| architecture-quality | Architecture and interface quality checks for planning, review, and test surface decisions |
| writing-plans | Implementation plans (full or light) with MCP-verified file paths |
| executing-plans | Single-agent execution (fallback for sequential/single-task work or no-subagent harnesses) |
| test-driven-development | Red-green-refactor with MCP-powered test discovery; `writing-good-tests.md` is the test-design reference (name the break, exercise the real thing, mutation check) |
| systematic-debugging | Root cause investigation with MCP-powered tracing |
| requesting-code-review | Inline review (during plan execution) or standalone review (ad-hoc) with per-harness dispatch |
| receiving-code-review | Process for acting on review feedback |
| managing-review-campaigns | Canonical bounded-review contract for repeated, multi-reviewer, and clean-only campaigns |
| verification-before-completion | Evidence-before-claims verification |
| finishing-a-development-branch | Branch gate, then autonomous push + PR with the morning report and its opt-in digest (forge-ladder fallback, never merges), or the interactive 4-option menu plus worktree cleanup |
| dispatching-parallel-agents | Ad-hoc parallel agent dispatch |
| using-git-worktrees | Isolated workspace setup |
| writing-skills | Meta-skill for creating/editing skills |
| **subagent-driven-development** | **Primary delegated plan execution: fresh implementer subagents, parallel when independent, inline review by lead** |
| pre-merge-review | Optional external review (codex / claude) run before PR — verifies findings, dispatches fixes, emits morning-report block |
| cross-model-convergence | Adversarial find → verify → fix loop between the lead and an external reviewer (default codex) until a double-clean round or the round cap; includes the pre-implementation Doubt Pass |
| grounding-in-current-docs | Verify external framework/library/API behavior against current official docs when training knowledge may be stale |
| codex-cli | Invokes `codex exec` for second opinions and adversarial review |
| cursor-agent | Invokes Cursor Agent / Composer 2.5 Fast for bounded implementation while the current lead owns planning, review, and verification |
| claude-cli | Invokes `claude -p` for second opinions and adversarial review; omits `--bare` because it breaks OAuth auth |
| grok-cli | Invokes `grok -p` for second opinions, adversarial review, and delegation to xAI's Grok models |
| security-review | Security lane: the `security-secrets` and `security-deps` branch-gate scopes, the external-model policy gate every outbound dispatch checks, and the canonical security checklist and redaction rules |

## Prompt templates and scripts

| File | Purpose |
|------|---------|
| subagent-driven-development/implementer-prompt.md | Implementer spawn: task assignment, file ownership, Miller directives, status protocol |
| subagent-driven-development/fix-prompt.md | Fix-round prompt with reviewer findings and reframed-context guidance |
| subagent-driven-development/spec-reviewer-prompt.md | Review guide: spec compliance criteria |
| subagent-driven-development/code-quality-reviewer-prompt.md | Review guide: code quality criteria |
| subagent-driven-development/scripts/sdd-workspace | Resolves and creates one plan's artifact directory at `.razorback/sdd/<plan>/` — self-ignoring, escape-checked, single source of the location for the two scripts below |
| subagent-driven-development/scripts/task-brief | Extracts one task's full text from the plan into a brief file, so task text never passes through the lead's context |
| subagent-driven-development/scripts/review-package | Writes the commit list, stat summary, and `BASE..HEAD` diff to one file the reviewer reads in a single call |

## Version management

Razorback ships five version-bearing manifests (`package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`). Keep them in sync with:

```bash
./scripts/bump-version.sh --check          # detect drift
./scripts/bump-version.sh --check 1.2.3    # also require the agreed version to equal 1.2.3
./scripts/bump-version.sh --audit          # check + scan for undeclared version references
./scripts/bump-version.sh <new-version>    # bump all five in one pass
```

CI runs `--check "${GITHUB_REF_NAME#v}"` on `v*` tag builds. Drift detection alone
cannot catch manifests that went stale together; comparing against the tag can.

### Releasing

```bash
./scripts/bump-version.sh 1.2.3            # 1. bump the five manifests
git commit -am "release: 1.2.3 <summary>"  # 2. the subject becomes the release title
git tag -a v1.2.3 -m "release: 1.2.3"      # 3. tag it
git push --follow-tags                     # 4. push commit + tag
./scripts/bump-version.sh --release        # 5. publish the GitHub release
```

`--release` defaults to the version the manifests declare. It refuses to publish
unless the tag exists locally and on `origin`, the tagged commit's own manifests
declare that version, the working tree is clean, and no release exists for the tag
yet. Older tags can be back-filled by naming the version — the Latest badge stays
with the newest tag.

Notes are generated from the tagged commit's body (trailers stripped) plus one
bullet per commit back to the previous tag. `release.excludeSubjects` in
`.version-bump.json` drops noise subjects from the bullet list.

```bash
./scripts/bump-version.sh --release --dry-run              # print title + notes, publish nothing
./scripts/bump-version.sh --release 1.2.3 --notes-file X   # publish hand-written notes instead
```

## License

MIT (diverged from Superpowers, also MIT)

## Credits

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.
