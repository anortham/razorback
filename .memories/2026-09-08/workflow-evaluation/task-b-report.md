# Task B report

## Files changed

- `skills/using-razorback/SKILL.md`
- `skills/using-razorback/references/codex-tools.md`
- `skills/using-razorback/references/subagent-toolchain.md`
- `skills/using-razorback/references/instruction-tier.md`
- `.clinerules/razorback.md`
- `.cursor/rules/razorback.mdc`
- `.github/copilot-instructions.md`
- `.kiro/steering/razorback.md`
- `.windsurf/rules/razorback.md`
- `skills/harvesting-debt/SKILL.md`
- `skills/pre-merge-review/SKILL.md`
- `skills/pre-merge-review/reviewer-prompts/claude.md`
- `skills/pre-merge-review/reviewer-prompts/codex.md`
- `skills/requesting-code-review/SKILL.md`
- `agents/code-reviewer.md`
- `CLAUDE.md`
- `scripts/check-rule-copies.mjs`
- `tests/debt-marker.test.mjs`
- `tests/workflow-tool-contracts.test.mjs`

## Red-green evidence

- RED: `node --test tests/workflow-tool-contracts.test.mjs` failed 4/4 against the old rules: impossible instruction priority, stale Codex mapping/wait semantics, forbidden debt grep fallback, and no restricted-review exception.
- GREEN: focused 10-file guard run passed 80/80, covering the new contract, debt marker behavior, rule-copy sync, subagent hook, reviewer isolation, payload transport, reviewer assets, uncapped reviewer rules, output completion, and campaign integration.
- GREEN: `node scripts/check-rule-copies.mjs` passed with all five host copies byte-matching the canonical body and nine invariants present across the canonical, bootstrap, and subagent toolchain.
- GREEN: `git diff --check` passed for the owned file set.

## Miller calls and API evidence

- Ran workspace onboarding and health, task context, targeted content/source searches, file and section inspection, pre-edit impact for every owned contract file, post-edit workspace refresh, working-tree impact, and post-edit section inspection.
- Live collaboration schema exposes `spawn_agent`, `followup_task`, `send_message`, `wait_agent`, `interrupt_agent`, and `list_agents`; `agent_type` is currently present, so the mapping no longer makes fixed-version parameter claims.
- No `update_plan` tool is exposed in this session. The mapping now directs agents to an available durable plan, checklist, or execution ledger.
- Live `wait_agent` documentation says it wakes on mailbox updates, user steering, or timeout. The mapping requires inspecting the returned status/completion payload before treating a worker as done.
- Live Miller search schema includes `markers`, `source`, and `content`; an actual `search(query='RAZORBACK', mode=markers)` returned marker-region hits. The debt workflow now discovers provider-owned vocabulary and filters exact debt syntax.

## Decisions

- Instruction priority now reflects the host hierarchy: system/developer constraints remain authoritative; user and project directions override skill defaults only within those constraints.
- Plan routing is capability-based: SDD whenever delegation is available and permitted, including one task; dependent work uses serialized delegates; executing-plans is for no-delegation or explicitly single-agent runs.
- Only restricted external CLI reviewers in pre-merge review are exempt from direct Miller use. The lead builds and redacts a `MILLER_EVIDENCE` bundle, reviewer adapters retain their enforced read-only isolation, reviewers report missing evidence, and the lead verifies findings with Miller.
- The debt audit has no shell-search fallback. Failed bounded Miller recovery produces an incomplete-audit evidence-gap report and can never be called clean.
- The copied bootstrap's live-Miller routing, workspace discovery, and opt-in continuous-testing guidance was preserved.

## Worktree state

- Path: `/home/murphy/.config/razorback/worktrees/razorback/workflow-consistency`
- Branch: `codex/workflow-consistency`
- Commit: `464d4d317c206335e0b67ffdbc4f45a8e962b5e8`
- Dirty: yes; Task B files above plus concurrent Task A/C, plan, memory, fixture, and evaluation changes are present. No files were staged or committed.

## Lead-review follow-up

- Added a guard and contract for bounded Miller results: exhaust supported continuations or narrow by supported path/language/content scopes; omitted results or scopes force an incomplete audit and prohibit a clean/comprehensive claim.
- Normalized `override razorback skill defaults` to the required lowercase product name.
- RED: the two focused guards failed before the prose fixes. GREEN: `node --test tests/debt-marker.test.mjs tests/workflow-tool-contracts.test.mjs` passed 12/12; targeted `git diff --check` passed.

## Residual risk

- None in Task B's owned scope. The lead still owns integrated branch verification and review after reconciling concurrent Task A/C changes.
