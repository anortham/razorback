# Upstream Superpowers v6.3.0 Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development whenever delegation is available and permitted, including for one task; serialize dependent tasks. Use razorback:executing-plans only when delegation is unavailable or the user/session explicitly selected single-agent execution.

**Spec:** [docs/plans/2026-09-14-upstream-superpowers-v6.3-adoption.md](file:///home/murphy/source/razorback/.worktrees/upstream-adoption-v6.3/docs/plans/2026-09-14-upstream-superpowers-v6.3-adoption.md)

**Goal:** Adopt the high-value improvements from Superpowers v6.3.0 (worker subagent self-spawn ban, Codex multi-agent efficiency guidance, worktree removal refusal guard, Windows Graphviz detection fix, Brainstorming Three-Path Router, and SDD process rigor) while preserving Razorback's code-kb, Goldfish, and autonomous execution model.

**Architecture:** Changes grouped into two batches: (A) Independent safety, tooling, and multi-agent fixes across prompts, Codex tools reference, worktree cleanup, and Windows script portability; (B) Workflow process upgrades across Brainstorming (Three-Path Router), Plans (Spec pointer), and SDD (pre-dispatch conflict scan table, small-task batching, evidence re-reading, and rulings roll-up).

**Tech Stack:** Markdown skills and prompts, Node.js scripts, Node test runner (`node --test`).

**Architecture Quality:** No Architecture Impact on package code (all edits are markdown skills, prompt templates, and helper scripts). SDD/executing-plans twin sections (`Blockers`, `Recovery`, `Checkpoints`) remain synchronized and guarded by `tests/twin-sections.test.mjs`.

## Global Constraints

- All skill cross-references use the `razorback:` prefix; never `superpowers:`, never `@` file links.
- **Never modify:** `.cursor-plugin/`, `hooks/hooks-cursor.json`, `skills/cursor-agent/`, `.cursor/rules/` (except automatic propagation by `check-rule-copies.mjs`). Cursor is frozen.
- Preserve code-kb first orientation across all skills.
- Preserve Goldfish MCP integration (briefs, checkpoints, recall).
- Preserve the autonomous execution model (5-class blocker taxonomy, morning reports, lead inline review).
- Twin sections (`## Blockers`, `## Recovery`, `## Checkpoints`) across `skills/subagent-driven-development/SKILL.md` and `skills/executing-plans/SKILL.md` are guarded by `tests/twin-sections.test.mjs`. Do not introduce un-allowlisted drift.

---

## Verification Strategy

**Project source of truth:** `CLAUDE.md` (Tests section), `package.json` scripts, `tests/*.test.mjs`.

**Worker red/green scope:** `npm test` (running all tests in `tests/*.test.mjs`, ~5s).

**Worker ceiling:** `npm test` + `node scripts/check-rule-copies.mjs` + `./scripts/bump-version.sh --check`.

**Worker gate invariant:** All 423+ tests pass with zero failures and zero regressions.

**Lead affected-change scope:** `npm test && node scripts/check-rule-copies.mjs && ./scripts/bump-version.sh --check`.

**Branch gate:** `npm test` + `./scripts/bump-version.sh --audit` + `security-secrets` (`gitleaks detect`).

**Security scope:** `security-secrets`: `gitleaks detect` (or skip if uninstalled). `security-deps`: none declared.

---

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Worker Subagent Self-Spawn Prohibition | Batch A | `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/requesting-code-review/code-reviewer.md`, `skills/subagent-driven-development/SKILL.md` | No | None - safe parallel batch. |
| Task 2: Codex Multi-Agent & Efficiency Guidance | Batch A | `skills/using-razorback/references/codex-tools.md` | No | None - safe parallel batch. |
| Task 3: Interactive Worktree Removal Refusal Guard | Batch A | `skills/finishing-a-development-branch/references/interactive-mode.md`, `skills/finishing-a-development-branch/SKILL.md` | No | None - safe parallel batch. |
| Task 4: Windows Graphviz Detection Portability | Batch A | `skills/writing-skills/render-graphs.js` | No | None - safe parallel batch. |
| Task 5: Brainstorming Three-Path Router | Batch B | `skills/brainstorming/SKILL.md` | Yes | Batch B runs after Batch A (clean separation). |
| Task 6: SDD Process Rigor & Spec Pointer | Batch B | `skills/writing-plans/SKILL.md`, `skills/writing-plans/task-templates.md`, `skills/subagent-driven-development/SKILL.md` | Yes | Batch B runs after Batch A; Task 1 edits SDD SKILL.md in Batch A first. |

---

### Task 1: Worker Subagent Self-Spawn Prohibition

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/fix-prompt.md`
- Modify: `skills/requesting-code-review/code-reviewer.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Create: `tests/subagent-no-spawn.test.mjs`

**Interfaces:**
- Produces: Explicit prohibition in worker prompts preventing subagents from spawning child agents or extra reviewers.

**Contract inputs:**
- Existing prompt structure and rationalization table in `skills/subagent-driven-development/SKILL.md`.

**File ownership:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/requesting-code-review/code-reviewer.md`, `skills/subagent-driven-development/SKILL.md`
- Create: `tests/subagent-no-spawn.test.mjs`

**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Step 1: Write the failing test**
Create `tests/subagent-no-spawn.test.mjs` asserting:
- `implementer-prompt.md`, `fix-prompt.md`, and `code-reviewer.md` each contain `## You Do Not Dispatch Subagents` or explicit instruction that review is the lead's job and workers must not dispatch subagents.
- `skills/subagent-driven-development/SKILL.md` contains the rationalization row for worker-spawned reviewers.

**Step 2: Run test to verify it fails**
`node --test tests/subagent-no-spawn.test.mjs` (Expected FAIL)

**Step 3: Implement changes**
- Add `## You Do Not Dispatch Subagents` section to `implementer-prompt.md` and `fix-prompt.md`:
  ```markdown
  ## You Do Not Dispatch Subagents

  Do all of this task's work yourself. Never spawn a subagent to
  implement part of the task, and above all never spawn a reviewer to
  check your work. Self-review means reading your own diff.
  Review is the lead's job: after you report, the lead conducts
  an inline review against your diff. A reviewer you spawn duplicates
  that review at full cost, and its approval counts for nothing in
  the process. Report instead.
  ```
- Add equivalent section to `code-reviewer.md`.
- In `skills/subagent-driven-development/SKILL.md`, add row to Rationalizations table:
  `| "The implementer spawned its own reviewer — free extra assurance" | It's a duplicate seat reviewing the same diff; the lead's inline review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |`

**Step 4: Verify pass**
Run `node --test tests/subagent-no-spawn.test.mjs` and `npm test`.

---

### Task 2: Codex Multi-Agent & Efficiency Guidance

**Files:**
- Modify: `skills/using-razorback/references/codex-tools.md`
- Modify: `tests/codex-parallelism-contract.test.mjs`

**Interfaces:**
- Produces: Updated guidance for Codex CLI and ChatGPT desktop app sessions reflecting multi-agent V2 capabilities.

**Contract inputs:**
- Existing `skills/using-razorback/references/codex-tools.md`.

**File ownership:**
- Modify: `skills/using-razorback/references/codex-tools.md`, `tests/codex-parallelism-contract.test.mjs`

**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Step 1: Write test assertion**
In `tests/codex-parallelism-contract.test.mjs`, add assertions that `codex-tools.md` documents:
- `fork_turns: "none"` for isolated child context forks
- Bounded wait stretches (`wait_agent` with 300000–600000ms timeout) instead of short polling
- Setting both `model` AND `reasoning_effort` on spawns
- `followup_task` for resuming workers on V2

**Step 2: Run test to verify it fails**
`node --test tests/codex-parallelism-contract.test.mjs` (Expected FAIL)

**Step 3: Update `codex-tools.md`**
- Under `## Subagent dispatch`:
  - Detail `fork_turns: "none"` for context hygiene.
  - Explain event-driven waiting: `wait_agent` is an event subscription, not a poll; use 300000-600000ms timeouts when idle.
  - Explain model routing: always specify `model` AND `reasoning_effort` together to prevent silent reset of reasoning effort to model defaults.
  - Detail V2 lifecycle (`followup_task` for resumes; `close_agent` absence).
  - Recommend `~/.codex/config.toml` defaults (`[agents] default_subagent_model`, `default_subagent_reasoning_effort`).

**Step 4: Verify pass**
Run `node --test tests/codex-parallelism-contract.test.mjs` and `npm test`.

---

### Task 3: Interactive Worktree Removal Refusal Guard

**Files:**
- Modify: `skills/finishing-a-development-branch/references/interactive-mode.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Modify: `tests/source-control-hygiene.test.mjs`

**Interfaces:**
- Produces: Guard against forced worktree deletion when uncommitted or untracked files remain.

**Contract inputs:**
- Step 5 of `references/interactive-mode.md`.

**File ownership:**
- Modify: `skills/finishing-a-development-branch/references/interactive-mode.md`, `skills/finishing-a-development-branch/SKILL.md`, `tests/source-control-hygiene.test.mjs`

**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Step 1: Write test assertion**
In `tests/source-control-hygiene.test.mjs`, assert that `interactive-mode.md` handles removal refusal without `--force`, inspects untracked files with `status --porcelain -uall`, and offers the 3 choices.

**Step 2: Run test to verify it fails**
`node --test tests/source-control-hygiene.test.mjs` (Expected FAIL)

**Step 3: Update `interactive-mode.md` & `SKILL.md`**
- In `interactive-mode.md` Step 5:
  Add:
  ```markdown
  **If removal is refused** (`contains modified or untracked files`): the
  worktree holds files that exist nowhere else — uncommitted plans, notes,
  or scratch work. Never `--force` on your own initiative. Show the user
  what is at stake:

  ```bash
  git -C "$WORKTREE_PATH" status --porcelain -uall
  ```

  Ask:
  1. Commit them to <branch> before cleanup
  2. Move them into <main repo root>
  3. Delete them (unrecoverable)

  Carry out the choice, then remove the worktree.
  ```
- In `skills/finishing-a-development-branch/SKILL.md`, add row to Rationalizations table:
  `| "Removal refused — --force is just finishing the cleanup" | The refusal means files exist only in that worktree. --force destroys them permanently. Show the user and ask. |`

**Step 4: Verify pass**
Run `node --test tests/source-control-hygiene.test.mjs` and `npm test`.

---

### Task 4: Windows Graphviz Detection Portability

**Files:**
- Modify: `skills/writing-skills/render-graphs.js`

**Interfaces:**
- Produces: Cross-platform Graphviz detection that works on Windows and Unix.

**Contract inputs:**
- `skills/writing-skills/render-graphs.js`.

**File ownership:**
- Modify: `skills/writing-skills/render-graphs.js`

**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Step 1: Inspect and update `skills/writing-skills/render-graphs.js`**
- Replace `execSync('which dot', ...)` with:
  ```javascript
  try {
    execFileSync('dot', ['-V'], { stdio: 'ignore' });
  } catch {
    console.error('Error: graphviz (dot) not found...');
    process.exit(1);
  }
  ```
- Replace `execSync('dot -Tsvg', ...)` with `execFileSync('dot', ['-Tsvg'], ...)`.

**Step 2: Verify pass**
Run `npm test`.

---

### Task 5: Brainstorming Three-Path Router

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Create: `tests/brainstorming-paths.test.mjs`

**Interfaces:**
- Produces: Three-Path Router (Spike / Bounded / Architectural) in `brainstorming`.
- Consumes: Razorback's existing `architecture-quality` and `prototyping` skills.

**Contract inputs:**
- `skills/brainstorming/SKILL.md`.

**File ownership:**
- Modify: `skills/brainstorming/SKILL.md`
- Create: `tests/brainstorming-paths.test.mjs`

**Serialization required:** Yes
**Dependency reason:** Batch B runs after Batch A.

**Step 1: Write the failing test**
Create `tests/brainstorming-paths.test.mjs` asserting:
- Three paths defined: Spike, Bounded, Architectural.
- Bounded path presents short design in chat, stops for approval, and implements directly without plan/spec doc files.
- Spike path pairs with `razorback:prototyping`.
- Architectural path retains full spec doc + `architecture-quality` + `writing-plans`.
- One-way ratchet: hidden complexity upgrades path mid-task.
- Hard approval gate applies to all paths.

**Step 2: Run test to verify it fails**
`node --test tests/brainstorming-paths.test.mjs` (Expected FAIL)

**Step 3: Update `skills/brainstorming/SKILL.md`**
- Refactor the path selection into Three Paths (Spike, Bounded, Architectural):
  - **Spike:** Feasibility probe. Present question + probe plan in 2–3 sentences, get nod, run via `razorback:prototyping` cheaply, report findings as recommendation.
  - **Bounded:** Well-scoped change to existing code in repo (flow already exists). Ask clarifying questions, present short design in chat (approach, files touched, testing), STOP for human approval. Implement directly via normal workflow (TDD); no spec doc, no plan doc.
  - **Architectural:** Full design process: Q&A, approaches, `razorback:architecture-quality`, sectioned design, spec doc, spec review, invoke `razorback:writing-plans`.
- One-way ratchet: hidden complexity discovered mid-task upgrades the path.
- Rationalizations table updated with "Too simple to need approval" and path classification traps.

**Step 4: Verify pass**
Run `node --test tests/brainstorming-paths.test.mjs` and `npm test`.

---

### Task 6: SDD Process Rigor & Spec Pointer

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/writing-plans/task-templates.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `tests/borrowed-superpowers.test.mjs`

**Interfaces:**
- Produces: Spec pointer in plans, pre-dispatch conflict scan table in ledger, batching small same-shape tasks in SDD, reviewer evidence re-reading rule, and finish rulings collection.

**Contract inputs:**
- `skills/writing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`.

**File ownership:**
- Modify: `skills/writing-plans/SKILL.md`, `skills/writing-plans/task-templates.md`, `skills/subagent-driven-development/SKILL.md`, `tests/borrowed-superpowers.test.mjs`

**Serialization required:** Yes
**Dependency reason:** Follows Task 1 edits to SDD SKILL.md.

**Step 1: Write test assertion**
In `tests/borrowed-superpowers.test.mjs`, add tests asserting:
- `writing-plans/SKILL.md` and `task-templates.md` define `**Spec:**` header.
- `subagent-driven-development/SKILL.md` checks `Spec:`, requires a table for pre-dispatch conflict scan in the ledger, allows batching small same-shape tasks, and instructs reviewers to re-read illegible evidence rather than rerunning full suites.

**Step 2: Run test to verify it fails**
`node --test tests/borrowed-superpowers.test.mjs` (Expected FAIL)

**Step 3: Implement updates**
- Add `**Spec:** [path to the spec/design doc this plan implements]` to plan templates.
- Update `subagent-driven-development/SKILL.md`:
  - Step 1: Read spec if present; pre-dispatch conflict scan table in ledger.
  - The Task Loop: Batch small same-shape work into one dispatch brief.
  - Step 3 (Lead Inline Review): Reviewers/lead re-read evidence instead of rerunning suites.
  - Finish: Collect and summarize all `Ruling:` lines from the ledger under "Rulings I made".

**Step 4: Verify pass**
Run `npm test` and `node scripts/check-rule-copies.mjs`.
