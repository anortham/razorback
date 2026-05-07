# Architecture Quality Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Add a first-class `architecture-quality` skill and wire it into Razorback's planning, delegation, review, feedback, and verification workflows.

**Architecture:** The new skill is the source of deep architecture guidance. Existing workflow skills get small hooks and compact enforcement checklists, not duplicated essays. Tests are documentation-structure checks because Razorback skills are markdown artifacts.

**Tech Stack:** Markdown skill files, Node's built-in `node:test`, shell verification through existing repository scripts.

---

## Source Documents

- Design spec: `docs/plans/2026-05-07-architecture-quality-skill-design.md`
- Project policy: `RAZORBACK.md`
- Current test style: `tests/autonomous-process-gates.test.mjs`, `tests/claude-cli-docs.test.mjs`

## Architecture Quality

**Affected modules:** Razorback's workflow skill modules, especially `brainstorming`, `writing-plans`, `subagent-driven-development`, `requesting-code-review`, `receiving-code-review`, `test-driven-development`, `verification-before-completion`, and the `code-reviewer` agent prompt.

**Caller-facing interface:** The caller-facing interface is the skill text that agents load and follow. For this repo, markdown instructions are executable behavior. The new public interface is the `razorback:architecture-quality` skill name, its trigger description, its Gate Mode and Candidate Mode outputs, and the architecture checklist that workers and reviewers will see.

**Depth/locality check:** Keep deep guidance local to `skills/architecture-quality/`. Existing workflow skills should only contain trigger points, required outputs, and compact checklist text. If implementation starts copying full heuristics into several skills, that is a plan mismatch.

**Test surface:** Tests should read the markdown files and assert the workflow contract is present: the skill exists, references exist, default planning invocation exists, review hooks exist, worker prompts preserve approved architecture, and policy docs mention lead duties.

**Seams/adapters:** No runtime seam is introduced. The skill discovery seam is the existing `skills/<skill-name>/SKILL.md` convention. Cross-harness behavior continues to use the existing skill discovery paths.

**Rejected shortcuts:** Do not add a generic SOLID/DRY/KISS rulebook. Do not make `architecture-quality` a passive reference that agents may skip. Do not create one giant `SKILL.md`. Do not update version manifests unless implementation changes plugin packaging metadata.

**Architecture risk:** medium. This changes workflow behavior across several skills, but it is all markdown plus targeted documentation tests.

## Verification Strategy

**Project source of truth:** `tests/*.test.mjs`, `scripts/bump-version.sh --check`, `RAZORBACK.md`, and existing skill conventions in `skills/*/SKILL.md`.

**Worker red/green scope:** Each worker runs the new test file assigned to its task:

- Task 1: `node --test tests/architecture-quality-skill.test.mjs`
- Task 2: `node --test tests/architecture-quality-workflow.test.mjs`
- Task 3: `node --test tests/architecture-quality-review.test.mjs`

Each worker must write the assigned test first and verify it fails for the expected missing text or missing file before editing skill content.

**Worker ceiling:** Workers may run their assigned test and, after their own pass, `node --test tests/*.test.mjs` as diagnostic output only. Workers do not own branch-gate acceptance for broad workflow behavior.

**Worker gate invariant:** The assigned test proves that the worker's owned markdown contract exists in the repo and uses the required phrases or workflow hooks. The test does not prove the skill is philosophically good; that remains lead review.

**Lead affected-change scope:** After Tasks 1 through 3 land, run:

```bash
node --test tests/architecture-quality-*.test.mjs
```

**Branch gate:** At execution start, record:

```bash
BASE_SHA=$(git rev-parse HEAD)
```

Before handoff or PR, run:

```bash
git diff --check "$BASE_SHA"..HEAD
node --test tests/*.test.mjs
./scripts/bump-version.sh --check
```

**Replay/metric evidence:** Not applicable. There are no replay or metric gates.

**Escalation triggers:** Escalate to strategy/escalation tier if implementation discovers that skill discovery requires manifest changes, if tests show existing autonomous process gates conflict with the new architecture gate, if an implementation task needs to rewrite more than two workflow skills outside its assigned ownership, or if adding the default architecture gate creates a contradiction with autonomous execution.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp. For replay or metric evidence, record `not applicable`.

## Model Routing

**Project source of truth:** `RAZORBACK.md`

**Strategy tier:** Planning, architecture decomposition, lead review, final integration, and finding triage.

- Harness mapping: Codex `gpt-5.5 medium/high`; Claude Opus or Sonnet based on risk; OpenCode strongest available reasoning model.

**Implementation tier:** Bounded worker tasks from a clear plan with narrow ownership and meaningful tests.

- Harness mapping: Codex `gpt-5.4-mini xhigh`; Claude Sonnet or Haiku for boxed-in edits; OpenCode fast implementation model.

**Mechanical tier:** Docs, fixtures, rote edits, formatting, and manifests with no gate ownership.

- Harness mapping: Codex `gpt-5.4-mini low/medium`; Claude Haiku or Sonnet low-cost equivalent; OpenCode fastest reliable model.

**Gate-interpretation reviewer:** Reading a plan, failing test, replay, metric, or diff to decide whether the gate or implementation is wrong.

- Harness mapping: Codex `gpt-5.3-codex high`; Claude Opus or Sonnet high; OpenCode strong review model.

**Escalation tier:** Security, subtle correctness, high blast radius, weak tests, repeated failures, gate interpretation, and architecture mismatch.

- Harness mapping: Codex `gpt-5.3-codex high` for review or first escalation, `gpt-5.5 high/xhigh` for top-risk correctness or planning failure; Claude Opus; OpenCode strongest available reasoning model.

**Worker eligibility:** Use coupled implementation routing for Tasks 1 through 3 because they modify public workflow behavior. File ownership is still narrow and non-overlapping. Lead owns final integration review.

**Escalation triggers:** Escalate if a worker needs to change cross-harness manifests, alter skill discovery, weaken existing TDD or verification gates, or reinterpret the approved design.

**Mechanical exclusion:** No task in this plan is mechanical. These changes alter workflow contracts and review gates.

**Unsupported harness behavior:** If the harness cannot choose models per agent, use `inherit`, note it in the report, and continue.

## Execution Shape

Dispatch Tasks 1, 2, and 3 in parallel if the harness supports subagents. Their file write scopes do not overlap.

**Commit ownership:** Workers do not commit in this plan. Their reports must include the files changed, RED/GREEN verification evidence, and whether their assigned test passed. The lead owns staging and commits after reviewing each worker output. This avoids shared `HEAD` and index conflicts during parallel execution.

The lead performs Task 4 after all workers report back.

## Task 1: Create `architecture-quality` Skill And Skill Tests

**Files:**

- Create: `skills/architecture-quality/SKILL.md`
- Create: `skills/architecture-quality/architecture-language.md`
- Create: `skills/architecture-quality/analysis-heuristics.md`
- Create: `skills/architecture-quality/interface-design.md`
- Create: `tests/architecture-quality-skill.test.mjs`

**What to build:** Add the new first-class `architecture-quality` skill with progressive reference files. The skill must run by default for non-trivial planning and review, fast-exit for mechanical work, support Gate Mode and Candidate Mode, and describe selective ADR-style durable decisions.

**Approach:**

- Keep `SKILL.md` short. It should point to references instead of embedding all heuristics.
- Use directive language: "Use this skill" and "must" where the gate is required.
- Include the exact output shapes from the approved design.
- The reference files should be thorough enough for implementers and reviewers to reason about module/interface quality without turning every workflow skill into a lecture.
- Do not copy Pocock's source text verbatim. Borrow the concepts and adapt them to Razorback vocabulary and Julie-first workflow.

**TDD test contract:** First create `tests/architecture-quality-skill.test.mjs` with Node `test` cases that fail because the new skill files do not exist. Use the local `read(relativePath)` helper pattern from existing tests. Assert these facts:

- `skills/architecture-quality/SKILL.md` has frontmatter `name: architecture-quality`.
- The skill description includes planning or reviewing non-trivial code changes.
- `SKILL.md` mentions `Gate Mode`, `Candidate Mode`, `No Architecture Impact`, `docs/adr/`, and `The interface is the test surface`.
- `SKILL.md` contains the exact Gate Mode fields `Affected modules`, `Caller-facing interface`, `Depth/locality check`, `Test surface`, `Seams/adapters`, `Rejected shortcuts`, and `Architecture risk`.
- `SKILL.md` contains the exact Candidate Mode fields `Files`, `Current friction`, `Deletion test`, `Proposed module/interface`, `Why this improves locality/leverage`, `Test surface`, `Risk`, and `Recommendation`.
- `SKILL.md` states that folding non-required candidates into the current plan requires user approval unless the current task cannot be completed correctly without it.
- `SKILL.md` states autonomous execution records non-required review-time candidates instead of prompting mid-run.
- `SKILL.md` includes the ADR sections `Context`, `Decision`, `Consequences`, `Applies To`, and `Future Agents`, plus the `ADR-NNNN` numbering convention.
- `architecture-language.md` defines `Module`, `Interface`, `Implementation`, `Depth`, `Locality`, `Leverage`, `Seam`, `Adapter`, `Deletion test`, and `Test surface`.
- `analysis-heuristics.md` mentions pass-through modules, duplicated logic, wrong abstraction level, tests reaching past the caller-facing interface, speculative seams, shotgun surgery, swallowed errors, primitive obsession, over-decomposition, additive-only changes, repeated review findings, and when not to act.
- `interface-design.md` mentions parallel design lanes, depth, locality, test surface, seam placement, adapter strategy, blast radius, and risk medium/high.

**Acceptance criteria:**

- [ ] RED verified: `node --test tests/architecture-quality-skill.test.mjs` fails before skill files are created.
- [ ] All four skill files exist and use ASCII-only prose.
- [ ] `SKILL.md` is the gate and references the three support files.
- [ ] The skill supports fast exit, Gate Mode, Candidate Mode, and durable decisions exactly as the design approved.
- [ ] The test passes after implementation.
- [ ] Report lists only Task 1 files for lead review and commit.

## Task 2: Wire Planning And Execution Workflow Hooks

**Files:**

- Modify: `skills/brainstorming/SKILL.md:39-68`
- Modify: `skills/brainstorming/SKILL.md:114-165`
- Modify: `skills/writing-plans/SKILL.md:42-61`
- Modify: `skills/writing-plans/SKILL.md:83-101`
- Modify: `skills/writing-plans/SKILL.md:183-246`
- Modify: `skills/subagent-driven-development/SKILL.md:100-149`
- Modify: `skills/subagent-driven-development/SKILL.md:205-252`
- Modify: `skills/subagent-driven-development/implementer-prompt.md:71-132`
- Modify: `skills/subagent-driven-development/fix-prompt.md:10-42`
- Modify: `skills/executing-plans/SKILL.md:20-41`
- Modify: `skills/executing-plans/SKILL.md:84-100`
- Create: `tests/architecture-quality-workflow.test.mjs`

**What to build:** Make `architecture-quality` a default planning gate and an execution contract. Planning must record the architecture output. Workers must preserve the approved architecture shape and escalate plan mismatches instead of redesigning locally.

**Approach:**

- In `brainstorming`, add `architecture-quality` after initial Julie orientation and before design presentation for all non-trivial work. Keep the visual companion rules unchanged.
- In `writing-plans`, require an `Architecture Quality` section or `No Architecture Impact` note in non-mechanical plans. Add a compact section to the plan header/template guidance without bloating the existing verification/model-routing sections.
- In `subagent-driven-development`, add architecture context as required dispatch content and lead review criteria.
- In `implementer-prompt.md`, add a short "Architecture Quality" block before "Your Job" or inside self-review. It must say workers preserve the approved module/interface shape, do not redesign locally, and report a plan mismatch if code reality contradicts the approved shape.
- In `fix-prompt.md`, add "fix the structural cause, not only the symptom" and "do not weaken tests or introduce speculative seams" to fix-round instructions.
- In `executing-plans`, add the same architecture preservation and plan-mismatch rules for no-delegation execution. This is required because `executing-plans` is the single-agent fallback when subagents are unavailable.
- Preserve autonomous execution behavior. Do not reintroduce mid-plan user prompts.
- Define review-time Candidate Mode under autonomous execution: during an approved autonomous run, non-required refactor candidates are recorded in the report or ADR offer, not folded into the current work. Only refactors required for correctness, testability, or avoiding a brittle patch may be folded in without a new user prompt.

**TDD test contract:** First create `tests/architecture-quality-workflow.test.mjs` and verify it fails before markdown edits. Assert these facts:

- `skills/brainstorming/SKILL.md` mentions `razorback:architecture-quality`, `non-trivial`, `No Architecture Impact`, and running before presenting the design.
- `skills/writing-plans/SKILL.md` mentions `Architecture Quality`, `non-mechanical`, approved module/interface shape, architecture risk, and plan mismatch.
- `skills/subagent-driven-development/SKILL.md` mentions `architecture-quality`, approved architecture, plan mismatch, and the checklist phrase `Does this keep complexity local?`.
- `skills/subagent-driven-development/implementer-prompt.md` mentions approved module/interface shape, do not redesign locally, and report a plan mismatch.
- `skills/subagent-driven-development/fix-prompt.md` mentions fixing the structural cause and not weakening tests.
- `skills/executing-plans/SKILL.md` mentions approved architecture, architecture-quality, plan mismatch, and Candidate Mode behavior during autonomous execution.

**Acceptance criteria:**

- [ ] RED verified: `node --test tests/architecture-quality-workflow.test.mjs` fails before workflow edits.
- [ ] Planning flow invokes `architecture-quality` by default for non-trivial work.
- [ ] Writing plans require architecture output for non-mechanical work.
- [ ] Worker dispatch and self-review preserve approved architecture.
- [ ] Single-agent fallback execution preserves approved architecture.
- [ ] Fix prompts prevent symptom-only fixes and test weakening.
- [ ] Review-time Candidate Mode does not reintroduce mid-plan user prompts during autonomous execution.
- [ ] Existing approval gates and autonomous execution wording remain intact.
- [ ] The assigned test passes after implementation.
- [ ] Report lists only Task 2 files for lead review and commit.

## Task 3: Wire Review, Feedback, TDD, Verification, Policy, And README Hooks

**Files:**

- Modify: `skills/requesting-code-review/SKILL.md:12-31`
- Modify: `skills/requesting-code-review/SKILL.md:37-76`
- Modify: `skills/requesting-code-review/code-reviewer.md:37-76`
- Modify: `agents/code-reviewer.md:17-55`
- Modify: `skills/receiving-code-review/SKILL.md:67-105`
- Modify: `skills/test-driven-development/SKILL.md:71-80`
- Modify: `skills/test-driven-development/SKILL.md:190-211`
- Modify: `skills/verification-before-completion/SKILL.md:40-58`
- Modify: `RAZORBACK.md:88-99`
- Modify: `README.md:235-250`
- Create: `tests/architecture-quality-review.test.mjs`

**What to build:** Make architecture-quality visible in review, feedback reception, TDD, final verification, policy, and the public skill list. This is the enforcement side of the new gate.

**Approach:**

- In `requesting-code-review`, add architecture-quality as a lead inline review criterion and standalone review trigger when repeated findings appear.
- In `requesting-code-review/code-reviewer.md`, add architecture checks using the compact checklist from the design.
- In `agents/code-reviewer.md`, replace generic SOLID language with more concrete module/interface checks. Do not remove security, performance, or testing review criteria.
- In `receiving-code-review`, route external architecture feedback through `architecture-quality` before implementation.
- In `test-driven-development`, add "the interface is the test surface" to test orientation and refactor guidance. Keep the existing iron law intact.
- In `verification-before-completion`, add evidence requirements for "architecture decision followed", "requirements met", and "review finding fixed" claims.
- In `RAZORBACK.md`, add policy-level lead duties only. Do not duplicate the skill body.
- In `README.md`, add `architecture-quality` to the skill table.

**TDD test contract:** First create `tests/architecture-quality-review.test.mjs` and verify it fails before markdown edits. Assert these facts:

- `skills/requesting-code-review/SKILL.md` mentions `architecture-quality`, repeated findings, Candidate Mode, and approved architecture.
- `skills/requesting-code-review/code-reviewer.md` includes the checklist phrases `Does this keep complexity local?`, `same interface callers use`, and `speculative extensibility`.
- `agents/code-reviewer.md` mentions caller-facing interface, test surface, architecture drift, and repeated findings.
- `skills/receiving-code-review/SKILL.md` says external architecture feedback is evaluated through `architecture-quality` before implementation.
- `skills/test-driven-development/SKILL.md` includes `The interface is the test surface`.
- `skills/verification-before-completion/SKILL.md` requires evidence for architecture decisions and review fixes.
- `RAZORBACK.md` says the lead enforces architecture-quality decisions and rejects worker-local redesigns.
- `README.md` includes an `architecture-quality` row in the skill table.

**Acceptance criteria:**

- [ ] RED verified: `node --test tests/architecture-quality-review.test.mjs` fails before review/policy edits.
- [ ] Review paths catch architecture drift, repeated findings, weak test surfaces, and speculative seams.
- [ ] Receiving-review path evaluates external architecture feedback before implementation.
- [ ] TDD guidance ties tests to the caller-facing interface without weakening the TDD iron law.
- [ ] Verification guidance requires evidence for architecture and review-fix claims.
- [ ] Policy and README mention the new skill at the correct level of detail.
- [ ] The assigned test passes after implementation.
- [ ] Report lists only Task 3 files for lead review and commit.

## Task 4: Lead Integration Review And Branch Gate

**Files:**

- Review only unless Tasks 1 through 3 reveal a small integration fix.

**What to build:** The lead integrates the three worker outputs, verifies consistency, and fixes any small cross-file wording drift. If integration reveals a substantive design conflict, stop and re-plan instead of patching around it.

**Approach:**

- Run the affected-change scope first:

```bash
node --test tests/architecture-quality-*.test.mjs
```

- Inspect the diff for duplicated checklist drift. The compact checklist should use identical wording at enforcement points unless a local prompt needs a small grammar adjustment.
- Use Julie to review changed file structure:

```text
get_symbols(file_path='skills/architecture-quality/SKILL.md')
get_symbols(file_path='skills/brainstorming/SKILL.md')
get_symbols(file_path='skills/writing-plans/SKILL.md')
get_symbols(file_path='skills/subagent-driven-development/SKILL.md')
get_symbols(file_path='skills/requesting-code-review/SKILL.md')
```

- Run branch gate:

```bash
git diff --check "$BASE_SHA"..HEAD
node --test tests/*.test.mjs
./scripts/bump-version.sh --check
```

**Acceptance criteria:**

- [ ] Affected architecture-quality tests pass.
- [ ] Full Node test suite passes.
- [ ] Version check passes.
- [ ] Diff whitespace check passes.
- [ ] Final review confirms the new skill is the source of deep guidance and existing skills contain only small hooks/checklists.
- [ ] Verification ledger is complete for worker and lead scopes.
