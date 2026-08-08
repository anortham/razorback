# Goal-Independent Autonomy Contract Hardening

## Goal

Keep long-running autonomy as Razorback's default whether or not a goal runner is active. Agents continue through reversible judgment calls and recoverable failures, and stop only when the blocker taxonomy is genuinely satisfied.

## Design

The blocker taxonomy remains the canonical stop/continue policy. Workflow skills apply it at their caller-facing boundaries instead of inventing stronger local stop rules.

- Brainstorming asks only unresolved questions that materially change product intent, safety, scope, or architecture. The agent infers and records routine, reversible details.
- Security policy allowlists apply only when the target repository declares an external-model policy block. With no block, dispatch proceeds and the existing loud report note records that fact.
- Security scanners and security-gate findings enter a diagnose, repair, and rerun loop. Missing tooling or a failing result becomes a blocker only after safe, plan-consistent recovery paths are exhausted.
- Pre-merge callers describe the real review contract: one general pass plus one security pass, with no post-fix external re-review loop.

## Architecture Quality

**Affected modules:** `brainstorming`, `security-review`, `pre-merge-review`, `finishing-a-development-branch`, and `subagent-driven-development` skill contracts.

**Caller-facing interface:** the prose invariants that tell an agent when to infer, recover, continue, or stop.

**Depth/locality check:** canonical policy stays in the blocker taxonomy and security-review. Callers reference those rules and add only workflow-local mechanics.

**Test surface:** autonomous-process and security contract guards exercise the workflow-facing skill text that agents consume.

**Seams/adapters:** no new seam or adapter; this tightens existing skill boundaries.

**Rejected shortcuts:** weakening security hard gates, silently substituting denied providers, bypassing spec/plan approval, or treating every failed command as unresolvable.

**Architecture risk:** medium. These are cross-skill control-flow contracts; inconsistent wording can create premature stops or skipped gates.

## Acceptance Criteria

- [ ] Brainstorming explicitly infers and logs routine reversible details and limits questions to material product/safety/scope/architecture decisions.
- [ ] Pre-merge review makes reviewer allowlist enforcement conditional on a declared policy block.
- [ ] Security scanner absence and security findings require safe recovery attempts before blocker classification.
- [ ] Finishing a branch retries recoverable branch/security gate failures rather than classifying the first failure as blocker taxonomy #5.
- [ ] SDD describes one general pass plus one security pass and no round-two review.
- [ ] Regression guards fail against the pre-change contracts and pass after implementation.
- [ ] The full repository test suite passes.
