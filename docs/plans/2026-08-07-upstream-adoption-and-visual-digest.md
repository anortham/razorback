# Upstream Adoption and Visual Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Fix the five bugs found by the 2026-08-07 comparative audit, adopt the ranked upstream improvements from superpowers v6.2.0 and mattpocock/skills 1.2.3, and add the visual digest feature.

**Architecture:** Content-and-config change set in four batches: (A) independent bug fixes, (B) independent content adoptions plus the digest kit, (C) a serialized SDD lane (fix-loop discipline → plan-scoped workspace → brief-path dispatch, all touching the same files), (D) digest wiring across the three read-moment skills. Spec: `docs/plans/2026-08-07-upstream-adoption-and-visual-digest-design.md`.

**Tech Stack:** Markdown skills, bash hooks and scripts, Node test runner (`node --test`), existing guard scripts.

**Architecture Quality:** One new shared reference (`skills/using-razorback/references/digest-kit.md`, three consumers — same shape as `review-targeting.md`). One changed script contract (SDD workspace scripts gain a leading `PLAN_FILE` argument; all call sites updated in Batch C; no external consumers). Otherwise No Architecture Impact. Workers report plan mismatches instead of redesigning.

## Global Constraints

- All skill cross-references use the `razorback:` prefix; never `superpowers:`, never `@` file links.
- **Never modify:** `.cursor-plugin/`, `hooks/hooks-cursor.json`, `skills/cursor-agent/`, `.cursor/rules/` (except automatic propagation by `check-rule-copies.mjs`). Cursor is frozen.
- Keep the two intentional test-guarded duplications (instruction-tier host copies; architecture-quality checklist). Do not touch `skills/using-razorback/references/subagent-toolchain.md` or the synced toolchain table region.
- SDD ⟷ executing-plans twin sections (Blockers / Checkpoints / Recovery) are guarded by `tests/twin-sections.test.mjs`. Any task editing a twin section in SDD MUST make the matching edit in `skills/executing-plans/SKILL.md`, preserving the encoded intentional divergence (SDD's extra Recovery step 5).
- No model pins. No version bump in this plan — release is a separate action after merge.
- Do not weaken the Iron Law, anti-rationalization tables, Miller-first exploration, two-pass inline review, or autonomous-by-default execution.
- Digest rule (Lane C): the markdown stays canonical and complete; the digest is a concise view; agents never read the `.html`; digest files sit beside their markdown with the same basename and follow its git fate.
- Digest colors come from the validated dataviz reference palette values embedded in the kit file — self-contained, no external fetches, light + dark via `prefers-color-scheme`.
- Prototype evidence for the digest layout: branch `prototype/plan-digest` (read with `git show prototype/plan-digest:prototype-plan-digest.html`); Variant B + tabs is the approved layout.
- Upstream source material paths (read-only, outside this repo): `/home/murphy/source/superpowers` (v6.2.0, HEAD `44c9b2d`), `/home/murphy/source/skills` (1.2.3, HEAD `84fdeff`).

## Verification Strategy

**Project source of truth:** `CLAUDE.md` (Tests section), `package.json` scripts, `.github/workflows/test.yml`.

**Worker red/green scope:** `npm test` (guard suite, ~7s) plus the task-specific grep/JSON/script assertions named in each task's acceptance criteria.

**Worker ceiling:** `npm test` + `node scripts/check-rule-copies.mjs` + `./scripts/bump-version.sh --check`. Workers run nothing broader.

**Worker gate invariant:** `npm test` green proves no guard regression (rule-copy sync, twin sections, manifest versions, structural invariants). Task-specific assertions prove the specific change the task claims.

**Lead affected-change scope:** after each batch: `npm test && node scripts/check-rule-copies.mjs && ./scripts/bump-version.sh --check`; when hooks changed, also `CLAUDE_PLUGIN_ROOT=$PWD bash hooks/session-start | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` and the same for `hooks/subagent-start`.

**Branch gate:** `npm test` + `./scripts/bump-version.sh --audit` + security scope.

**Security scope:** `security-secrets`: `gitleaks detect` (working tree; if the binary is absent, record the skip in the morning report). `security-deps`: none declared — the package has no runtime dependencies.

**Replay/metric evidence:** none — grep outputs and generated-digest checks are report-only evidence attached to task reports.

**Escalation triggers:** any change to `hooks/hooks.json` or the SDD workspace scripts requires the lead affected-change scope immediately, not batched. Any twin-section edit requires `node --test tests/twin-sections.test.mjs` before handoff.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says the task updates that gate (Tasks 1, 2, 5, 7, 13, 15 create or extend tests).

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, timestamp. Reuse passing entries for unchanged HEAD.

## Parallel Execution Contract

Batches run A → B → C → D. Within A and B, tasks dispatch together. Batch C is a serialized lane: dispatch one task at a time, in order. Commit mode for all batches: `parallel-lead-commit`.

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: find-polluter fix | Batch A | Modify: `skills/systematic-debugging/find-polluter.sh`. Create: `tests/find-polluter.test.mjs` | No | None - safe parallel batch. |
| Task 2: hooks shell key | Batch A | Modify: `hooks/hooks.json`, `tests/session-start.test.mjs`, `tests/subagent-hook.test.mjs` | No | None - safe parallel batch. |
| Task 3: finishing-branch fixes | Batch A | Modify: `skills/finishing-a-development-branch/SKILL.md` | No | None - safe parallel batch. |
| Task 4: redact rule | Batch A | Modify: `skills/security-review/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `tests/security-checklist-sync.test.mjs` | No | None - safe parallel batch. |
| Task 5: harness-neutral prompts | Batch A | Modify: `skills/subagent-driven-development/implementer-prompt.md` (line 6 header only), `skills/brainstorming/spec-document-reviewer-prompt.md`, `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/brainstorming/SKILL.md` (line ~156 only), `skills/pre-merge-review/fix-dispatch-prompt.md`. Create: `tests/harness-neutral-prompts.test.mjs` | No | None - safe parallel batch. |
| Task 6: writing-good-tests | Batch B | Delete: `skills/test-driven-development/testing-anti-patterns.md`. Create: `skills/test-driven-development/writing-good-tests.md`. Modify: `skills/test-driven-development/SKILL.md:315-322`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, any test referencing `testing-anti-patterns` (search `tests/`) | Yes | Batch B runs after Batch A; no intra-batch conflicts. |
| Task 7: region-scoped assertions | Batch B | Modify: `tests/rule-copies.test.mjs`, `tests/twin-sections.test.mjs` | Yes | Batch B runs after Batch A (Task 2 edits other test files; disjoint from these two). |
| Task 8: writing-skills additions | Batch B | Modify: `skills/writing-skills/SKILL.md`, `skills/writing-skills/testing-skills-with-subagents.md` | Yes | Batch B runs after Batch A; no intra-batch conflicts. |
| Task 9: brainstorming refinements | Batch B | Modify: `skills/brainstorming/SKILL.md` (Process and Key Principles regions) | Yes | Batch B runs after Batch A: Task 5 edits line ~156 of the same file first. |
| Task 10: prototyping HTML shell | Batch B | Modify: `skills/prototyping/LOGIC.md`, `skills/prototyping/SKILL.md` (branch-picker lines only) | Yes | Batch B runs after Batch A; no intra-batch conflicts. |
| Task 11: digest kit | Batch B | Create: `skills/using-razorback/references/digest-kit.md` | Yes | Batch B runs after Batch A; no intra-batch conflicts. |
| Task 12: SDD fix-loop discipline | Batch C | Modify: `skills/subagent-driven-development/SKILL.md` (Steps 3, 4, 4a, Durable Progress), `skills/subagent-driven-development/fix-prompt.md`, `skills/executing-plans/SKILL.md` (twin sections only, if touched) | Yes | Serialized lane: Tasks 12–14 share SDD files; dispatch in order. |
| Task 13: plan-scoped workspace | Batch C | Modify: `skills/subagent-driven-development/scripts/sdd-workspace`, `scripts/task-brief`, `scripts/review-package`, `skills/subagent-driven-development/SKILL.md` (workspace/ledger/Recovery regions), `implementer-prompt.md:116` region, `fix-prompt.md:28` region, `skills/executing-plans/SKILL.md` (twin sections only, if touched). Create: `tests/sdd-workspace.test.mjs` | Yes | After Task 12: same SKILL.md and fix-prompt.md. |
| Task 14: brief-path dispatch | Batch C | Modify: `skills/subagent-driven-development/SKILL.md` (Step 2, File Handoffs), `skills/subagent-driven-development/implementer-prompt.md` (Task Description block) | Yes | After Task 13: same SKILL.md and implementer-prompt.md. |
| Task 15: digest wiring | Batch D | Modify: `skills/brainstorming/SKILL.md` (User Review Gate), `skills/writing-plans/SKILL.md` (Execution Handoff), `skills/finishing-a-development-branch/SKILL.md` (Step 3/4 report region), `skills/finishing-a-development-branch/morning-report-template.md`. Create: `tests/digest-wiring.test.mjs` | Yes | After Batches A–C: Tasks 3, 5, 9 edit two of the same skills; Task 11 must exist first. |

---

## Batch A — Bug fixes

### Task 1: Port the find-polluter fix

**Files:**
- Modify: `skills/systematic-debugging/find-polluter.sh:21-29`
- Create: `tests/find-polluter.test.mjs`

**Interfaces:**
- Consumes: upstream fixed script at `/home/murphy/source/superpowers/skills/systematic-debugging/find-polluter.sh` and its test suite at `/home/murphy/source/superpowers/tests/systematic-debugging/test-find-polluter.sh`.
- Produces: a working `find-polluter.sh` whose documented example pattern (`src/**/*.test.ts`) actually matches.

**Contract inputs:** Three bugs to close: missing `./` prefix on `find -path` patterns; empty result miscounted as 1 by `wc -l`; `**/` never matching zero directory levels. The upstream fix strips a leading `./` from the input, matches both `./$TEST_PATTERN` and the pattern with `**/` collapsed, and guards the empty case before counting.

**File ownership:** Modify: `skills/systematic-debugging/find-polluter.sh`. Create: `tests/find-polluter.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Port the upstream fix verbatim into razorback's copy (the files are otherwise identical — diff first to confirm). Translate the upstream bash test suite into `tests/find-polluter.test.mjs` using node's test runner + `child_process` to exercise the script against a temp fixture tree: pattern with `src/**/` matching nested and top-level test files, empty-match reporting 0, `./`-prefixed input accepted.

**Acceptance criteria:**
- [x] Script run against a fixture tree finds nested AND top-level test files from a `**/` pattern; zero matches reports 0, not 1
- [x] `tests/find-polluter.test.mjs` fails against the old script body (verified by true red-first ordering — stronger than the planned temporary revert, same invariant), passes against the new one
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 2: Windows-safe hook dispatch

**Files:**
- Modify: `hooks/hooks.json`, `tests/session-start.test.mjs`, `tests/subagent-hook.test.mjs`

**Interfaces:**
- Consumes: current two-entry `hooks.json` (SessionStart, SubagentStart), each `"type": "command"` with the quoted `run-hook.cmd` polyglot invocation.
- Produces: both command entries carrying `"shell": "bash"`; registration-shape assertions guarding the key.

**Contract inputs:** On Windows without the key, Claude Code may dispatch via PowerShell/CMD, which cannot parse the quoted command (upstream issues: PowerShell treats the quoted path as a string expression; CMD's `/c` quoting strips outer quotes). `shell: "bash"` is honored since Claude Code 2.1.81 and ignored as an unknown key by older versions — safe additive change. Upstream reference: superpowers commit `5151e7a` and `docs/windows/polyglot-hooks.md`. Do NOT touch `hooks/hooks-cursor.json` (Cursor frozen; runner behavior unverified).

**File ownership:** Modify: `hooks/hooks.json`, `tests/session-start.test.mjs`, `tests/subagent-hook.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Add `"shell": "bash"` beside `"type": "command"` in both hook entries. Extend both hook test files with a registration-shape assertion: parse `hooks.json`, find the entry, assert `entry.shell === "bash"` and the command string shape is unchanged.

**Acceptance criteria:**
- [x] Both entries in `hooks.json` carry `"shell": "bash"`; JSON parses
- [x] Both test files assert the shape; assertions fail when the key is removed (verified by mutation: exactly the 2 guards failed)
- [x] `hooks/hooks-cursor.json` untouched
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 3: finishing-a-development-branch — capture-before-checkout + forge ladder

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md` (Interactive Step 2 :160-186, Step 4 Options 1/4 :206-273, Step 5 Cleanup :274-289; Autonomous Step 6 :94-106)

**Interfaces:**
- Consumes: current Interactive flow where Step 5 locates the worktree via `git worktree list | grep $(git branch --show-current)` after Options 1/4 have checked out the base branch.
- Produces: Interactive Step 2 captures `FEATURE_BRANCH=$(git branch --show-current)` and `WORKTREE_PATH=$(git rev-parse --show-toplevel)` before any checkout; Step 5 uses the captured values; cleanup restricted to paths under `.claude/worktrees/` (provenance rule: anything elsewhere belongs to the host or the user). Autonomous Step 6 carries the forge ladder.

**Contract inputs:** Upstream reference: superpowers commits `0b47219` (capture-before-cd) and `bcfe798` (forge-agnostic). Forge ladder, in order: `gh` (preferred — machine-readable URL for the write-back step) → another forge CLI if present (`glab`, `tea`) → the creation URL the forge prints on push → `Status: Partial` with the push recorded. The existing "`gh` is not installed" failure branch becomes the last rung, not the second. Keep the Interactive 4-option menu including Discard — razorback keeps it (spec decision); only the worktree-path bug and ladder change here.

**File ownership:** Modify: `skills/finishing-a-development-branch/SKILL.md`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** (a) Move branch/path capture into Interactive Step 2 with a comment stating why (Step 4 changes branch and directory before Step 5 needs the values). (b) Rewrite Step 5 to use `$WORKTREE_PATH` / `$FEATURE_BRANCH` and add the provenance guard. (c) Replace the `gh`-only PR creation in Autonomous Step 6 with the ladder; update the failure protocol accordingly. Interactive Option 2 gets a one-line pointer to the same ladder.

**Acceptance criteria:**
- [x] Interactive Step 5 contains no `git branch --show-current` invocation; it consumes Step 2's captured variables
- [x] Cleanup text restricts removal to `.claude/worktrees/` paths
- [x] Autonomous Step 6 names all four ladder rungs in order; PR-URL write-back still specified for the `gh` and forge-CLI rungs (Step 7 scoped to rungs 1–2)
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 4: Redact rule + debugging example fix

**Files:**
- Modify: `skills/security-review/SKILL.md`, `skills/systematic-debugging/SKILL.md:88-104`, `tests/security-checklist-sync.test.mjs`

**Interfaces:**
- Consumes: security-review's existing canonical-block + synced-copies pattern (five-question checklist guarded by `tests/security-checklist-sync.test.mjs`).
- Produces: a canonical `## Redact` block (three sentences) in `security-review/SKILL.md`; a verbatim copy or pointer in `systematic-debugging/SKILL.md`; the sync test extended to guard it.

**Contract inputs:** The three sentences, adapted from mattpocock/skills `diagnosing-bugs` (commit `bda79a3`): redact every secret in anything you show, quote, or send — write `<REDACTED>` in its place; build loops against env vars so the credential stays in the environment rather than in displayed output; quote only the lines that carry the signal from captured artifacts. Do NOT enumerate what a secret looks like. The debugging example at `systematic-debugging/SKILL.md:92` currently runs `env | grep IDENTITY`, printing a credential value — the adjacent `${IDENTITY:+SET}${IDENTITY:-UNSET}` line is the safe pattern to standardize on.

**File ownership:** Modify: `skills/security-review/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `tests/security-checklist-sync.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Add the canonical block to security-review (placed with its other canonical blocks). In systematic-debugging, fix the example so no credential value reaches output, and add the Redact copy/pointer where the skill tells the agent to show command output. Extend the sync test with the new region pair.

**Acceptance criteria:**
- [x] `grep -c 'REDACTED' skills/security-review/SKILL.md` ≥ 1; systematic-debugging carries the synced copy (chosen over a pointer: the byte-compare mechanism needs a region, and the skill loads standalone)
- [x] `grep -n 'env | grep IDENTITY' skills/systematic-debugging/SKILL.md` → no hits
- [x] Sync test fails when one copy drifts (verified by temporary mutation)
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 5: Harness-neutral prompt templates

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md:6`, `skills/brainstorming/spec-document-reviewer-prompt.md:10`, `skills/writing-plans/plan-document-reviewer-prompt.md:10`, `skills/brainstorming/SKILL.md:156`, `skills/pre-merge-review/fix-dispatch-prompt.md:3`
- Create: `tests/harness-neutral-prompts.test.mjs`

**Interfaces:**
- Consumes: the five sites naming `Agent tool (general-purpose)` / `Task tool (general-purpose)` / `general-purpose` outside harness guards.
- Produces: capability-language dispatch headers ("Dispatch one implementer subagent:", "Dispatch a reviewer subagent:") readable on every harness; a guard test.

**Contract inputs:** Razorback's mapping approach wins over stripping: `skills/using-razorback/references/codex-tools.md` carries the per-harness tool names, so prompt files use capability language and the mapping file does the translation. Guard test rule: no file under `skills/` may contain `Agent tool`, `Task tool`, `general-purpose`, or `subagent_type` outside `<!-- harness:… --><!-- /harness -->` guards — allowlist `skills/using-razorback/references/codex-tools.md` (it IS the mapping) and harness-guarded regions.

**File ownership:** Modify: the five listed sites. Create: `tests/harness-neutral-prompts.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Rewrite each site to capability language (keep surrounding content untouched — Batch C rewrites implementer-prompt.md's body later; this task touches only the line-6 header). Write the guard test to scan `skills/` recursively, strip harness-guarded regions, apply the allowlist, and assert zero hits.

**Acceptance criteria:**
- [x] Guard test green; fails when a bare `general-purpose` is reintroduced outside a guard (verified by temporary mutation)
- [x] The five sites read as capability language; no other content in those files changed (sweep found 5 additional sites: 2 fixed in unowned files, 3 backtick-only form fixes in Batch-C-owned lines — accepted, zero wording change, committed before Batch C dispatch)
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

---

## Batch B — Content adoptions + kit

### Task 6: writing-good-tests replaces testing-anti-patterns

**Files:**
- Delete: `skills/test-driven-development/testing-anti-patterns.md`
- Create: `skills/test-driven-development/writing-good-tests.md`
- Modify: `skills/test-driven-development/SKILL.md:315-322`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, any test referencing `testing-anti-patterns` (search `tests/` first — `borrowed-superpowers.test.mjs` is the likely hit)

**Interfaces:**
- Consumes: upstream source `/home/murphy/source/superpowers/skills/test-driven-development/writing-good-tests.md` (198 lines, two-principle structure).
- Produces: `razorback:`-translated `writing-good-tests.md`; TDD trigger broadened to any test writing.

**Contract inputs:** Keep upstream's structure: Principle 1 falsifiability ("name the production change that would make this test fail — and is that change a bug or a decision?"), derive-expectations-independently (mirror-assertion ban), no change detectors, behavior-not-text, your-code-not-the-framework; Principle 2 with the Gate Functions and the Mutation Check; the closing quick-reference table and warning signs. Translations: `superpowers:writing-skills` → `razorback:writing-skills`; the "documents that instruct agents" line points at `razorback:writing-skills`' subagent-testing discipline (`testing-skills-with-subagents.md`). TDD SKILL.md trigger becomes "When writing or changing any test, read writing-good-tests.md" with the four-bullet summary, first bullet the falsifiability question. Add one bullet to the code-quality reviewer prompt's test-quality item citing the mutation check.

**File ownership:** As listed in the contract table row for Task 6.

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A; no intra-batch conflicts.

**What to build:** Port, translate, retarget the trigger, update the reviewer prompt, and update any guard test that references the old filename (change the reference, do not delete the guard).

**Acceptance criteria:**
- [x] `testing-anti-patterns.md` gone; no references to it remain (`grep -ri 'testing-anti-patterns' skills/ tests/` → no hits)
- [x] `writing-good-tests.md` contains the falsifiability question, the mutation check, and zero `superpowers:` references
- [x] TDD SKILL.md trigger reads "any test", not "when adding mocks"
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 7: Region-scoped guard assertions

**Files:**
- Modify: `tests/rule-copies.test.mjs`, `tests/twin-sections.test.mjs`

**Interfaces:**
- Consumes: current assertions in the two files.
- Produces: assertions that extract their target region first and fail if the region is missing.

**Contract inputs:** Upstream technique (superpowers `a60dc2f`): extract the table/section region by its heading before asserting content inside it, so deleting the region fails the test instead of letting an incidental mention elsewhere pass it. Survey first: only rewrite assertions that currently match against a whole file; already-scoped assertions stay. `security-checklist-sync.test.mjs` belongs to Task 4 — do not touch it here.

**File ownership:** Modify: `tests/rule-copies.test.mjs`, `tests/twin-sections.test.mjs`

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A (Task 2 edits other test files; disjoint from these two).

**What to build:** For each whole-file assertion found: add an extract-region helper (heading → next same-level heading), assert within the region, and assert the region exists. Verify by mutation: deleting the guarded region must fail the test.

**Acceptance criteria:**
- [x] Each rewritten assertion fails when its target region is deleted (demonstrated by temporary mutation, then reverted) — survey verdict: zero rewrites needed; mutation Demo A proved the existing scoped assertions already fail on region deletion
- [x] Report lists which assertions were whole-file (rewritten) and which were already scoped (untouched)
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 8: writing-skills additions

**Files:**
- Modify: `skills/writing-skills/SKILL.md`, `skills/writing-skills/testing-skills-with-subagents.md`

**Interfaces:**
- Consumes: current Token Efficiency section, body-template listing, and the Explicit Negation guidance in `testing-skills-with-subagents.md`.
- Produces: the no-op test, the scoped negation rule, the two new template slots, and the recorded invocation-axis decision.

**Contract inputs:** Four additions (spec Lane B item 8): (a) the no-op test — "does this sentence change behavior versus the default? settle by running the document, not by debate"; a no-op is a line whose removal leaves the GREEN subagent run unchanged; when a sentence fails, delete the whole sentence. (b) Scope the negation rule: negation is earned by an observed rationalization in the RED run; everywhere else state the positive target. The Iron Law and existing anti-rationalization tables qualify for the exception and MUST NOT change. (c) Template slots: the defining constraint stated in the Overview as plain prose (never a labelled aside), and `It's working if` — signals checkable without reopening the skill — replacing the `Real-World Impact (optional)` slot. (d) One recorded decision line: every razorback skill stays model-invoked, deliberately; a future user-invoked axis requires consistent declaration in every harness manifest.

**File ownership:** Modify: `skills/writing-skills/SKILL.md`, `skills/writing-skills/testing-skills-with-subagents.md`

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A; no intra-batch conflicts.

**What to build:** Fold (a) and (c) and (d) into `SKILL.md` at their natural sections; add the scoping sentence (b) to `testing-skills-with-subagents.md` beside the Explicit Negation guidance, citing the observed-in-RED criterion.

**Acceptance criteria:**
- [x] The no-op test appears once, in model-relative form; the negation scoping references the RED-run criterion
- [x] Template lists `It's working if`; `Real-World Impact` slot gone from the template listing (one historical heading at testing-skills-with-subagents.md:379 reported, out of scope)
- [x] Iron Law, rationalization tables, and existing RED/GREEN discipline unchanged
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 9: brainstorming refinements

**Files:**
- Modify: `skills/brainstorming/SKILL.md` (The Process and Key Principles regions)

**Interfaces:**
- Consumes: current stop condition ("purpose, constraints, success criteria in your own words AND your last question produced no correction").
- Produces: the frontier-empty stop condition alongside it, and the facts-are-the-agent's-job rule.

**Contract inputs:** Spec Lane B item 9. Two additions, no removals: (a) model the open questions as a tree; the interview is done when no unanswered question has satisfied prerequisites (frontier empty) — merge with, do not replace, the existing stop wording. (b) "Finding facts is the agent's job: for any environment fact, use Miller or dispatch a subagent — never ask the user for something the repo can answer, and don't block the interview on the lookup." Keep one-question-per-message and the falsifiable-guess rule exactly as they are.

**File ownership:** Modify: `skills/brainstorming/SKILL.md`

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A: Task 5 edits line ~156 of the same file first.

**What to build:** Two surgical insertions in The Process ("Understanding the idea" bullets) and one Key Principles line for the facts rule.

**Acceptance criteria:**
- [x] Stop condition names the empty frontier; one-question-per-message still stated
- [x] Facts rule present with Miller/subagent named and the no-blocking clause
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 10: prototyping HTML shell

**Files:**
- Modify: `skills/prototyping/LOGIC.md`, `skills/prototyping/SKILL.md` (Pick a Branch lines only)

**Interfaces:**
- Consumes: current LOGIC.md (terminal-app shell over a pure module); mattpocock source `/home/murphy/source/skills/skills/engineering/prototype/LOGIC.md` (single-file HTML shell).
- Produces: LOGIC.md with two shells keyed to who renders the verdict.

**Contract inputs:** Spec Lane B item 10. Shell choice rule: developer at a terminal → TUI (existing content); anyone else, or an async verdict → single self-contained HTML file (plain HTML/CSS/JS, no build, opens by double-click, survives being emailed). HTML shell carries: labeled state panel in domain language, always-available free-play controls, and tabbed guided walkthroughs — each tab a named scenario with a plain-language description plus the ordered controls to press, resetting to a known state on start. The pure-module discipline, one-question rule, and capture flow are unchanged.

**File ownership:** Modify: `skills/prototyping/LOGIC.md`, `skills/prototyping/SKILL.md`

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A; no intra-batch conflicts.

**What to build:** Add the HTML shell section to LOGIC.md with the choice rule at the top; update SKILL.md's Pick-a-Branch lines to mention the shell choice inside the logic branch.

**Acceptance criteria:**
- [x] LOGIC.md states the shell-choice rule and the tabbed-walkthrough contract
- [x] Existing TUI content and pure-module rules unchanged
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 11: Digest component kit

**Files:**
- Create: `skills/using-razorback/references/digest-kit.md`

**Interfaces:**
- Consumes: prototype evidence (`git show prototype/plan-digest:prototype-plan-digest.html` — Variant B + tabs is the approved layout); the dataviz reference palette values already embedded in that prototype's CSS tokens.
- Produces: the canonical kit file Task 15's wiring points at. Sections: **Layout contract** (header with title/goal/progress meter; timeline spine with per-stage state; task rows; inline warning-flag callouts; "you are here" marker; Decisions and Guardrails tabs; footer linking the canonical markdown), **Kit CSS** (one copy-paste `<style>` block: light+dark tokens via `prefers-color-scheme`, status chips with icon + label, meter, spine, tabs, flag callout, stat tile/hero figure), **Authoring rules** (digest is a view, not a transcript; every sentence earns its place; decisions/status/blockers/acceptance criteria in, detail linked out; agents never read the HTML; markdown stays canonical; self-contained single file, sibling basename, same git fate; one hero figure per digest).

**Contract inputs:** Take the CSS tokens, chip/meter/spine/tab/flag styles from the prototype's Variant B + shared atoms — they already carry the validated palette (status colors icon-paired, text in text tokens, meter fill/track from one ramp, 4px rounded data ends). Strip Variant A/C styles and the switcher. The kit documents structure as semantic HTML patterns (one short example per component), not a full page template — the model composes them per document.

**File ownership:** Create: `skills/using-razorback/references/digest-kit.md`

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A; no intra-batch conflicts.

**What to build:** The kit file as specified above. Target ≤ 350 lines: the CSS block dominates; component examples stay minimal.

**Acceptance criteria:**
- [x] Kit contains the three sections; CSS block includes both light and dark token sets and the status/meter/spine/tab/flag/tile styles
- [x] Authoring rules state the view-not-transcript rule, the sibling-file rule, and the agents-never-read-HTML rule
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

---

## Batch C — SDD lane (serialized: 12 → 13 → 14)

### Task 12: SDD fix-loop discipline

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md` (Step 3 :185-242, Step 4 :243-261, Step 4a :262-280, Durable Progress :155-168), `skills/subagent-driven-development/fix-prompt.md`, `skills/executing-plans/SKILL.md` (matching twin-section edits only, if Blockers/Checkpoints/Recovery are touched)

**Interfaces:**
- Consumes: current Step 3/4 fix routing (3 resumes + 1 reframed attempt, "never collapse the loop"), `fix-prompt.md`'s Report Format, Durable Progress ledger line formats.
- Produces: the scoped re-review contract, fix-report gate, cap adjudication, and minor-deferral path — the contract Batch D and future runs execute.

**Contract inputs:** Spec Lane B item 3, four mechanisms, translated to inline review (no new subagent prompt files):
1. **Scoped re-review** (lead's own checklist in Step 4): re-review with `review-package FIX_BASE HEAD` where FIX_BASE is the head the previous review saw; verdict every prior finding ADDRESSED / NOT ADDRESSED with file:line — "attempted" is not addressed; inspect the fix diff only for new breakage; observations outside the fix diff go to the deferred list, never extend the loop.
2. **Fix-report gate**: before re-reviewing, confirm the fix report names covering tests, the command, and the output; add the matching requirement to `fix-prompt.md`'s Report Format.
3. **Cap adjudication**: keep the existing cap (3 resumes + 1 reframed attempt). At the cap, rule each open finding into exactly one of: contested (ruling recorded, continue) / real-but-deferred (ruling recorded, continue) / real and load-bearing (later tasks build on it) → blocker-taxonomy stop. Adjudicate only at the cap; every ruling is a ledger entry; silent discards forbidden.
4. **Minor deferral**: Minor findings never enter the loop — ledger line `Task <N>: minor (deferred): <one-liner>`; Step 4a points the pre-merge reviewer at that list.
New ledger line format for fix rounds: `Task <N>: fix round <R> (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`. Preserve: the reframed-4th-attempt rule ("the 4th attempt's value is the reframing"), the existing cap count, `parallel-lead-commit` rules, and the crash-window SHA rule.

**File ownership:** As listed in the contract table row for Task 12.

**Serialization required:** Yes

**Dependency reason:** Serialized lane: Tasks 12–14 share SDD files; dispatch in order.

**What to build:** Fold the four mechanisms into Steps 3/4/4a and Durable Progress; extend `fix-prompt.md`. Run `node --test tests/twin-sections.test.mjs` before handoff; if a twin section changed, mirror it in executing-plans preserving the encoded divergence.

**Acceptance criteria:**
- [x] Step 4 states the re-review scope contract (FIX_BASE, per-finding verdicts, fix-diff-only, deferred-list sink) and the fix-report gate
- [x] Cap behavior is the three-way adjudication with the load-bearing → blocker-taxonomy stop; "flag and continue" no longer the cap's only path
- [x] Minor-deferral ledger line format present; Step 4a consumes the list
- [x] `tests/twin-sections.test.mjs` green
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 13: Plan-scoped SDD workspace

**Files:**
- Modify: `skills/subagent-driven-development/scripts/sdd-workspace`, `skills/subagent-driven-development/scripts/task-brief`, `skills/subagent-driven-development/scripts/review-package`, `skills/subagent-driven-development/SKILL.md` (workspace path, ledger header, Recovery, Step 5), `skills/subagent-driven-development/implementer-prompt.md:116` region, `skills/subagent-driven-development/fix-prompt.md:28` region, `skills/executing-plans/SKILL.md` (matching twin edits only, if touched)
- Create: `tests/sdd-workspace.test.mjs`

**Interfaces:**
- Consumes: current flat layout — `sdd-workspace` (no args) → `<repo-root>/.razorback/sdd`; `task-brief PLAN_FILE N [OUTFILE]`; `review-package BASE HEAD [OUTFILE]`; ledger at `.razorback/sdd/progress.md`. Upstream reference implementation: `/home/murphy/source/superpowers/skills/subagent-driven-development/scripts/sdd-workspace` and its tests.
- Produces: `sdd-workspace PLAN_FILE` → `<repo-root>/.razorback/sdd/<plan-basename-sans-.md>/`; `task-brief PLAN_FILE N [OUTFILE]` writes into its plan's dir; `review-package PLAN_FILE BASE HEAD [OUTFILE]` (new leading arg); self-ignoring `.gitignore` at `.razorback/sdd/.gitignore`; ledger first line `# Razorback SDD ledger — plan: <plan file path>`; plan's workspace deleted at Step 5 when the final review is clean.

**Contract inputs:** Exit 2 with a usage message on a missing or nonexistent PLAN_FILE. Resume check in SKILL.md: a ledger whose first line names a different plan, or a stray ledger at the old flat path, belongs to another plan — leave it, start fresh. Sibling plan dirs are never touched. **Preserve unchanged:** the crash-window rule (a completion line whose SHA is missing/`pending`/absent from `git log` is INCOMPLETE) — the identity header adds to Recovery, never weakens it. No backward-compat path for the flat layout.

**File ownership:** As listed in the contract table row for Task 13.

**Serialization required:** Yes

**Dependency reason:** After Task 12: same SKILL.md and fix-prompt.md.

**What to build:** Script changes plus every call-site update in SKILL.md, implementer-prompt.md, and fix-prompt.md (grep `sdd-workspace\|task-brief\|review-package\|\.razorback/sdd` across the skill dir to find them all). `tests/sdd-workspace.test.mjs`: exit-2 on missing/nonexistent plan; two plans → two dirs; brief lands in its plan's dir; review package lands in its plan's dir; `.gitignore` self-ignores the tree.

**Acceptance criteria:**
- [ ] All three scripts implement the new signatures; all call sites in the three prose files updated (grep evidence in report)
- [ ] Ledger identity header and resume check present; crash-window rule text unchanged
- [ ] `tests/sdd-workspace.test.mjs` green; `tests/twin-sections.test.mjs` green
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode

### Task 14: Brief-path dispatch

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md` (Step 2 :70-123, File Handoffs :144-154), `skills/subagent-driven-development/implementer-prompt.md` (Task Description block, line ~13)

**Interfaces:**
- Consumes: Task 13's plan-scoped `task-brief` output path; the current contradiction — implementer-prompt says paste the full task text, File Handoffs says point at the brief.
- Produces: one rule — the brief file path is the single source of task requirements.

**Contract inputs:** Spec Lane B item 5. The dispatch carries: one line on where the task fits, the brief path introduced as "read this first — it is your requirements, with the exact values to use verbatim", interfaces/decisions from earlier tasks, the controller's resolution of any ambiguity, and the report-file path/contract. Exact values (numbers, magic strings, signatures, test cases) appear only in the brief. Do not paste accumulated prior-task summaries into later dispatches. Record `BASE=$(git rev-parse HEAD)` before dispatching — never `HEAD~1`, which silently drops all but the last commit of a multi-commit task.

**File ownership:** As listed in the contract table row for Task 14.

**Serialization required:** Yes

**Dependency reason:** After Task 13: same SKILL.md and implementer-prompt.md.

**What to build:** Rewrite implementer-prompt.md's Task Description block to take the brief path; reconcile Step 2's element list (mark which elements are prompt-resident vs brief-resident); add the BASE-recording rule beside the dispatch steps; delete the paste-the-full-text instruction.

**Acceptance criteria:**
- [ ] `grep -n 'FULL TEXT' skills/subagent-driven-development/implementer-prompt.md` → no hits; brief-path introduction present
- [ ] BASE-recording rule present in Step 2; no `HEAD~1` guidance anywhere in the skill dir
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode

---

## Batch D — Digest wiring

### Task 15: Wire the digest into the three read moments

**Files:**
- Modify: `skills/brainstorming/SKILL.md` (User Review Gate region), `skills/writing-plans/SKILL.md` (Execution Handoff Step 1), `skills/finishing-a-development-branch/SKILL.md` (Step 3 :67-74 / Step 4 :75-85 report region), `skills/finishing-a-development-branch/morning-report-template.md`
- Create: `tests/digest-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 11's `skills/using-razorback/references/digest-kit.md`; the three read-moment regions.
- Produces: each read moment writes `<document>.html` beside the markdown per the kit, and names both files when handing the document to the user.

**Contract inputs:** Wiring text per surface (one short block each, pointing at the kit): brainstorming — at the User Review Gate, write `<design-doc>.html` per `razorback:using-razorback` references/digest-kit.md and name both files in the review ask; writing-plans — same at plan-save announce; finishing-a-development-branch — Step 3/4 write the report digest beside the report in `.memories/`, and the morning-report template's terminal pointer names the digest path. Digest generation is part of producing the document, not a separate gate — no new user stops. `tests/digest-wiring.test.mjs`: region-scoped (Task 7's technique) — each of the three skills references `digest-kit.md` inside the producing step's region; the kit file exists.

**File ownership:** As listed in the contract table row for Task 15.

**Serialization required:** Yes

**Dependency reason:** After Batches A–C: Tasks 3, 5, 9 edit two of the same skills; Task 11 must exist first.

**What to build:** The three wiring blocks, the template line, and the guard test. As the GREEN check, generate a real digest of THIS plan (`docs/plans/2026-08-07-upstream-adoption-and-visual-digest.html`) following only the kit file, and verify it matches the layout contract (timeline main view, Decisions/Guardrails tabs, inline flags, hero progress, links back to the markdown). Commit the sample with the task.

**Acceptance criteria:**
- [ ] All three skills reference the kit inside the producing step; `tests/digest-wiring.test.mjs` green and fails when a reference is removed (verify by temporary mutation)
- [ ] The sample digest of this plan exists, is self-contained, renders both themes, and follows the kit's layout contract
- [ ] No new user-facing stop added to any of the three flows
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode

---

## Out of Scope (deferred, not forgotten)

- wizard skill; compression sweep; domain-glossary layer; RELEASE-NOTES.md; `.out-of-scope/` records; router-freshness test; digest for handoffs/debt/review surfaces; Cursor `shell`-key verification; full string-presence-test sweep beyond Task 7's two files.
- Version bump / release — separate action after this branch merges.
