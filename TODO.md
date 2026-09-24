# TODO

Live queue is Linear project [razorback](https://linear.app/breakingdevelopment/project/razorback-a9320ad34b13).
Do not start Parked issues without their trigger.

The March 2026 process-evaluation list shipped in v0.4.0. Write-up: `docs/plans/2026-03-04-process-evaluation.md`.

## Default workflow reduction (2026-09-23)

Local backlog from the tooling assessment; implementation has not started.
Make the default a direct, proportionate development workflow, with detailed
planning and orchestration available when the task benefits from them.

- [x] Pin the current workflow as the comparison baseline before any skill changes.
  Done: `docs/plans/2026-09-24-workflow-comparison.md`.
  Record `v0.44.4` as the baseline repository state for the comparison item below,
  so the current-workflow arm stays reproducible after the defaults change.
  Acceptance: the baseline tag is named in the comparison notes before the first
  skill edit lands.
- [x] Remove automatic process escalation from the bootstrap and brainstorming.
  Done on branch `workflow-reduction`, merged to main on 2026-09-24 before the comparison.
  Update `skills/using-razorback/SKILL.md` and
  `skills/brainstorming/SKILL.md`: remove the 1% invocation rule, mandatory skill
  loading before every response, and the rule forbidding a lighter path once
  the task is understood. Choose process from uncertainty, consequence, and
  coordination needs; a file or line threshold alone is not a risk assessment.
  Acceptance: clear ordinary work proceeds directly; ambiguous requirements
  get clarification; consequential design choices still get explicit attention.
- [x] Make delegation and durable plans optional for ordinary work.
  Done on branch `workflow-reduction`, merged to main on 2026-09-24 before the comparison.
  Update `skills/writing-plans/SKILL.md`,
  `skills/subagent-driven-development/SKILL.md`, and
  `skills/executing-plans/SKILL.md`. Default to the current agent for one coherent
  task. Delegate independent work or work whose separate context has a clear
  benefit. Write a plan file for a real handoff, multi-session effort, or useful
  coordination boundary. Describe outcomes, constraints, ownership, and checks;
  remove default requirements to prewrite complete implementation code.
  Acceptance: a bounded task can finish without a worker, plan file, task report,
  or repeated approval of intent already authorized by the user.
- [x] Remove hard coupling to Goldfish and code-kb from the default workflow.
  Done on branch `workflow-reduction`, merged to main on 2026-09-24 before the comparison.
  Prefer the retrieval method that supplies sufficient current evidence; permit
  ordinary search and file reads without first following a fixed tool sequence.
  Missing optional tools must not block work that native tools can complete.
  Replace compulsory pre-commit and routine phase checkpoints with Goldfish's
  selective decision/handoff policy. Review execution and finishing skills,
  including `skills/finishing-a-development-branch/SKILL.md`, for conflicting rules.
  Acceptance: ordinary work completes with native tools alone; a meaningful
  memory, when created, is still included with the relevant commit.
- [x] Preserve outcome checks and safety while updating the workflow contract.
  Done on branch `workflow-reduction`, merged to main on 2026-09-24 before the comparison.
  Keep root-cause investigation, relevant tests, review of completed changes,
  explicit ownership for parallel edits, truthful completion claims, and source
  control/secret/publication safeguards. Update `CLAUDE.md` and its `AGENTS.md`
  mirror, hook/routing copies, worker prompts, and documentation to the new
  defaults. In `CLAUDE.md`, revise the Dependencies section (code-kb and Goldfish
  as hard requirements) and the What Not to Change list (code-kb-first
  exploration, fixed process flow). Update `docs/site/`, which describes the
  current workflow. Replace assertions that enforce discarded ceremony with behavioral
  cases for the new workflow; retain checks for unsafe actions and missing work.
  Use `scripts/check-rule-copies.mjs`, focused `node --test` files for changed
  contracts, and `npm run test:workflow-eval`; run `npm test` at integration.
  Acceptance: small repairs, clear features, uncertain designs, and resumed work
  receive appropriate handling without weakening verification or approval boundaries.
- [ ] Compare the lighter default with the current workflow on real tasks.
  The lighter default merged before this comparison ran; `v0.44.4` stays the
  reproducible baseline for the current-workflow arm.
  Own the shared experiment here. Start with existing transcripts, then select
  8 to 12 tasks spanning repairs, unfamiliar modules, cross-file changes, and
  resumed work. Pin model/effort, harness version, repository state (baseline
  `v0.44.4`), task input,
  and acceptance checks. Hold Goldfish and code-kb availability and configuration
  constant for the workflow comparison; vary memory and retrieval separately
  afterward with their project follow-ups. Use matched tasks, randomized order,
  and repeated runs where affordable. Request a budget before paid replays.
  Record accepted outcomes, defects, human corrections/review time, elapsed time,
  actual input/output/cache tokens, and unnecessary documents generated.
  Acceptance: report observed quality and cost by task class, including losses
  and inconclusive results. Workflow-evaluator scores demonstrate rule compliance,
  not software quality. Use existing logs and a small results table, not a new
  evaluation platform; expand the rollout only where outcome evidence supports it.

Coordinate with [Goldfish's backlog](../goldfish/TODO.md) and
[code-kb's plan](../code-kb/docs/plans/2026-09-23-retrieval-value-and-optional-routing.md).
These references name sibling projects; each backlog remains usable on its own. Historical plans
remain evidence and are not rewritten to describe the new defaults.

## Needs a decision

- [BRE-44](https://linear.app/breakingdevelopment/issue/BRE-44) SDD workspace key: basename vs path-derived slug
- [BRE-50](https://linear.app/breakingdevelopment/issue/BRE-50) May 2026 agent-tier gate brief

## Active

- [BRE-45](https://linear.app/breakingdevelopment/issue/BRE-45) Redaction preflight before outbound model delegation
- [BRE-46](https://linear.app/breakingdevelopment/issue/BRE-46) Dogfood External model policy on razorback CLAUDE.md
- [BRE-47](https://linear.app/breakingdevelopment/issue/BRE-47) Isolated credential-free reviewer checkout
- [BRE-49](https://linear.app/breakingdevelopment/issue/BRE-49) Leftover upstream-adoption consistency follow-ups

## Parked

- [BRE-26](https://linear.app/breakingdevelopment/issue/BRE-26) Subagent-start agent-type matcher (needs Explore-agent noise)
- [BRE-48](https://linear.app/breakingdevelopment/issue/BRE-48) Verify claude `--safe-mode` against the live CLI
