# Codex Parallelism And Plugin Distribution Design

## Goal

Make Razorback more willing to use Codex subagents in parallel when a plan proves
the work is safe to parallelize, and add first-class Codex plugin distribution
metadata so Razorback can move beyond manual symlink installation.

## Context

Razorback already supports parallel dispatch in `subagent-driven-development`,
but the current wording is advisory. In practice Codex often serializes work
unless the plan and execution skill make parallel dispatch the default approved
path.

The comparison repos point at two useful lessons:

- Superpowers has a current Codex distribution surface:
  `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, and
  deterministic Codex portal packaging checks. It also uses `hooks: {}` in the
  Codex manifest so Codex does not auto-discover and re-register session-start
  hooks meant for other harnesses. Superpowers is useful evidence, but it is
  not the Codex plugin schema source of truth; implementation must ground the
  manifest shape in current Codex docs before writing packaging tests.
- Simplepower makes parallelism concrete by requiring plan fields for file
  ownership, task contracts, serialization decisions, and approved aggregate
  dispatch. Razorback should borrow the contract shape without adopting
  Simplepower's broader batch review+fix agent.

## Design Summary

This is a two-workstream change.

1. Add a required `Parallel Execution Contract` to implementation plans.
   Approved plans will explicitly authorize dispatching every task in a safe
   parallel batch together.
2. Add Codex plugin metadata and packaging support, keeping version sync and
   installation docs aligned with the existing Razorback release process.

The execution model remains Razorback's model: the lead owns task review,
integration judgment, verification, and final handoff. Parallel dispatch changes
when workers start, not who owns acceptance.

## Architecture Quality

**Affected modules:** `skills/writing-plans/SKILL.md`,
`skills/subagent-driven-development/SKILL.md`,
`skills/using-razorback/references/codex-tools.md`, Codex plugin metadata,
version bump config, install docs, and prompt-contract tests.

**Caller-facing interface:** The implementation plan is the caller-facing
interface for execution. It must name the parallel batches and the exact reasons
any work is serialized.

**Depth/locality check:** The plan carries more structure so execution does not
need to infer task independence. Codex-specific tool mechanics stay in the Codex
tool mapping instead of leaking into generic planning rules.

**Test surface:** Prompt-contract tests assert the required plan fields and
execution behavior. Packaging tests assert manifest validity, version sync, and
Codex archive contents.

**Seams/adapters:** The Codex plugin manifest is a distribution adapter. It
points Codex at the existing shared `skills/` directory rather than creating a
second skill source.

**Rejected shortcuts:** Do not only add stronger prose saying "use parallelism";
the plan needs fields Codex can act on. Do not adopt Simplepower's single
review+fix agent; Razorback keeps lead-owned per-task review. Do not create a
Codex manifest without wiring it into version sync and tests.

**Architecture risk:** medium. The parallel contract changes execution behavior,
but it makes the safety boundary explicit. The Codex plugin work is mostly
packaging and release hygiene.

## Parallel Execution Contract

Every full implementation plan must include `## Parallel Execution Contract`
before the task list. A one-task full plan may use the compact form:

```markdown
## Parallel Execution Contract

Single task. No parallel batches.

**File ownership:** Task 1 owns [exact paths].
**Contract inputs:** [global constraints / architecture decision / external facts this task may rely on].
**Serialization required:** Not applicable - single task.
```

Multi-task full plans use the full form below.

The section must include:

- **Parallel batches:** Named groups of tasks that must be dispatched together
  when the current harness supports subagents.
- **File ownership:** Exact create/modify/delete ownership for every task. No
  two tasks in the same batch may edit the same file.
- **Contract inputs:** Exact APIs, filenames, command contracts, fixtures, data
  shapes, behavior guarantees, or approved external facts each task may rely on.
- **Serialization required:** `No` by default. `Yes` requires a concrete
  dependency reason.
- **Dependency reason:** Allowed reasons are overlapping write scope, a generated
  artifact that must exist first, missing or ambiguous contract, intentional
  ordered migration/runtime work, or an explicit user/product decision that
  requires sequence.

The plan must not serialize work just because task numbers are ordered. Task
numbering is for readability. The parallel contract determines dispatch order.

## Writing Plans Changes

Update `skills/writing-plans/SKILL.md` so full plans:

- require `## Parallel Execution Contract`
- include parallel batch membership in each task
- include `Serialization required: No|Yes` in each task
- require concrete dependency reasons for serialized tasks
- require a `Contract inputs` block that points to the approved parallel
  contract, global constraints, architecture decision, or external fact
- define serialization as the exception, not the default
- preserve existing `Global Constraints`, `Architecture Quality`, and
  `Verification Strategy` sections

Light plans may include a smaller parallel contract when they dispatch multiple
workers, but single coherent light plans do not need the full section.

## Subagent-Driven Development Changes

Update `skills/subagent-driven-development/SKILL.md` so approved plans authorize
parallel execution:

1. Read the plan and extract the `Parallel Execution Contract`.
2. Validate each batch before dispatch:
   - no overlapping write scopes
   - every task has satisfied `Contract inputs`
   - every task has `Serialization required: No`
   - verification scope is assigned
3. If a validated batch contains two or more tasks and the harness supports
   subagents, dispatch every task in that batch before waiting for results.
4. If the lead serializes a validated batch, record the reason before
   dispatching. Missing tool support and newly discovered dependency evidence
   are valid reasons. Habit or uncertainty is not.
5. Review each completed task individually using Razorback's lead inline review.
6. Run affected-change and branch-gate verification as today.

Codex-specific behavior belongs in
`skills/using-razorback/references/codex-tools.md`:

- Multiple eligible tasks mean multiple `spawn_agent` calls in the same turn.
- The approved parallel batch is built-in approval to spawn those workers.
- If the current Codex session lacks multi-agent support, fall back to
  `executing-plans` or serialize with an explicit tool-limitation note.
- Do not ask the user for permission between workers in an approved batch.

## Codex Plugin Distribution

Add first-class Codex plugin metadata:

- Create `.codex-plugin/plugin.json`.
  - `name`: `razorback`
  - `version`: synced with existing version manifests
  - `skills`: `./skills/`
  - `hooks`: `{}` so Codex does not auto-discover non-Codex SessionStart hooks
  - interface metadata for Codex plugin browsing and install prompts
- Create `.agents/plugins/marketplace.json` so Codex can discover Razorback from
  this repository as a plugin source.
- The Codex marketplace file must not carry a version field unless current
  Codex docs require one. Based on Superpowers' current manifest shape, version
  sync belongs in `.codex-plugin/plugin.json`, while
  `.agents/plugins/marketplace.json` is discovery metadata only.
- Include checked-in Codex interface assets:
  - `assets/razorback-small.svg` for `interface.composerIcon`
  - `assets/app-icon.png` for `interface.logo`
  The packaging script must include these assets and tests must verify the
  manifest references resolve inside the package. Do not use remote assets.
- Update `.version-bump.json` so `.codex-plugin/plugin.json` participates in
  `./scripts/bump-version.sh --check`, `--audit`, and version bumps.
- Update `scripts/bump-version.sh` only if the existing JSON-field bumping logic
  cannot handle the new manifest field.
- Add a Codex plugin packaging script, modeled after Superpowers' current
  portal packaging approach:
  - refuse dirty worktrees by default
  - package only Codex-relevant files
  - preserve executable modes where needed
  - normalize archive metadata for repeatable output where practical
  - verify every packaged skill has required metadata
  - include `assets/`
  - keep `hooks: {}` in the packaged manifest
- Update `docs/README.codex.md`, `.codex/INSTALL.md`, and top-level `README.md`
  so Codex plugin install is the preferred path when available, with the current
  symlink/manual path retained as a fallback for local development.
- Update `CLAUDE.md` (`AGENTS.md` is a symlink) so the harness split, Codex
  bootstrap description, and version-management text mention the Codex plugin
  manifest and the new version target count.
- Before writing the Codex manifest or packaging tests, use
  `razorback:grounding-in-current-docs` to verify current Codex plugin manifest,
  marketplace, asset, and hook-discovery semantics from official Codex/OpenAI
  docs. Record the verified source in the implementation notes. If current docs
  conflict with this design, update the design or implementation plan before
  coding against the stale assumption.

## Files To Modify Or Create

- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/using-razorback/references/codex-tools.md`
- Modify: `docs/README.codex.md`
- Modify: `.codex/INSTALL.md`
- Modify: `README.md`
- Modify: `CLAUDE.md` (`AGENTS.md` symlink target)
- Modify: `.version-bump.json`
- Modify if needed: `scripts/bump-version.sh`
- Create: `.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `scripts/package-codex-plugin.sh`
- Create: `tests/codex-plugin.test.mjs` or a focused `tests/codex/` shell suite
- Modify or create prompt-contract tests under `tests/`
- Create: `assets/razorback-small.svg`
- Create: `assets/app-icon.png`

## Acceptance Criteria

- [ ] Full plans require a `Parallel Execution Contract`.
- [ ] Single-task full plans can use the compact "single task, no parallel
      batches" contract form.
- [ ] Each implementation task records batch membership, file ownership,
      `Contract inputs`, and `Serialization required`.
- [ ] `subagent-driven-development` says safe batches of two or more tasks are
      dispatched together when subagents are available.
- [ ] The Codex tool mapping explicitly instructs multiple `spawn_agent` calls
      in one turn for approved safe batches.
- [ ] Serializing a safe batch requires a recorded dependency or tool-limitation
      reason.
- [ ] Razorback keeps lead-owned per-task inline review and does not add a
      Simplepower-style batch review+fix agent.
- [ ] `.codex-plugin/plugin.json` exists and points at `./skills/`.
- [ ] Codex manifest uses `hooks: {}`.
- [ ] `.codex-plugin/plugin.json` participates in version sync.
- [ ] `.agents/plugins/marketplace.json` is discovery metadata and has no
      version field unless current Codex docs require one.
- [ ] Codex interface asset references resolve to checked-in packaged files.
- [ ] Codex install docs prefer plugin install when available and keep manual
      symlink installation as a fallback.
- [ ] `CLAUDE.md` / `AGENTS.md` harness and version-management text is updated.
- [ ] Implementation notes cite the current Codex docs used to ground manifest,
      marketplace, asset, and hook-discovery behavior before packaging tests are
      written.
- [ ] Packaging tests or smoke checks verify the Codex plugin manifest and
      package contents.
- [ ] `node --test tests/*.test.mjs`, `./scripts/bump-version.sh --check`,
      and `git diff --check` pass.

## Out Of Scope

- Changing Razorback's default automatic skill activation policy.
- Replacing lead inline review with a final review+fix agent.
- Adding Superpowers' full multi-harness expansion beyond the harnesses
  Razorback already supports.
- Publishing, tagging, or releasing the plugin package. That requires separate
  approval after implementation and verification.
