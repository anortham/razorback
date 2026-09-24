# Plan Templates

Copy these blocks into the plan in this order: header, Verification Strategy, Parallel Execution Contract, then one task block per task. Both task templates share the same header block (Files, Interfaces, Contract inputs, File ownership, Serialization required, Dependency reason); they diverge after it.

## Plan Header

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Use razorback:subagent-driven-development for independent tasks, or tasks whose separate context has a clear benefit, when delegation is available and permitted. Otherwise use razorback:executing-plans: the current agent runs the plan.

**Goal:** [One sentence]

**Architecture:** [2-3 sentences]

**Tech Stack:** [Key technologies/libraries]

**Spec:** [path to the spec/design doc this plan implements — the plan argues from the spec, so the spec travels with it; executors read both]

**Architecture Quality:** [Approved module/interface shape, architecture risk, or `No Architecture Impact` for mechanical plans]

## Global Constraints

[One line per project-wide requirement, exact values verbatim from the spec]

---
```

## Verification Strategy

```markdown
## Verification Strategy

**Project source of truth:** [AGENTS.md / CLAUDE.md / docs / CI config / manifest that defines verification tiers]

**Worker red/green scope:** [Lowest-cost repo command that proves the changed behavior]

**Worker ceiling:** [Maximum scope workers run alone; the lead owns broader gates and their acceptance]

**Worker gate invariant:** [Per assigned worker gate, the behavior or evidence it proves]

**Lead affected-change scope:** [Changed-files or affected-area gate, run after a coherent batch]

**Branch gate:** [Broad confidence gate before handoff, push, or PR]

**Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]

**Replay/metric evidence:** [Which assertions or metrics are hard gates and which are report-only]

**Escalation triggers:** [Changed areas or failure modes that require broader tiers]

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp (plus hard-gate and report-only metrics). Reuse a passing entry for the same HEAD and scope instead of rerunning.
```

## Parallel Execution Contract

```markdown
## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: [name] | [Batch A / None - serial] | [Exact create/modify/test ownership] | [No / Yes / Not applicable - single task.] | [Blocking dependency or tool limitation; `None - safe parallel batch.`; or `Not applicable - single task.`] |
```

## Full Plan Task Template

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact symbols, signatures, data shape, or user-facing contract]
- Produces: [what later tasks rely on — exact function names, parameter and return types, file formats, CLI flags, routes, or events. A task's implementer sees only their own task; this block is how they learn neighboring contracts.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

**Step 1: Write the failing test**

[The behavior the test proves, the input, and the expected result. Include test code only for an exact fixture or value the implementer must not vary.]

**Step 2: Run test to verify it fails**

Run: `<project-defined worker red/green command for this behavior>`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

[The outcome and the constraints: which symbols change, which pattern to follow, which edge cases to handle. Include code only for an exact contract, schema, migration, or string.]

**Step 4: Run test to verify it passes**

Run: `<project-defined worker red/green command for this behavior>`
Expected: PASS

**Step 5: Apply commit mode**

- `serial-worker-commit`: after assigned verification passes, create the owned-file
  worker commit and record the resulting SHA.
- `parallel-lead-commit`: do not commit from the worker lane. Hand the verified
  change to the lead for staging and commit after inline review.

**Acceptance criteria:**
- [ ] [Specific, testable requirement for this task]
- [ ] Worker-scope verification passes and the change is either committed by the worker or handed to the lead per commit mode
````

## Light Plan Task Template

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [exact contract this task depends on]
- Produces: [exact contract future tasks depend on. A task's implementer sees only their own task, so include names and shapes here.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

**What to build:** [2-3 sentences describing the feature/change and why]

**Approach:** [Key decisions — which pattern to follow, what to call things, edge cases to handle]

**Acceptance criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Worker-scope verification passes and the change is either committed by the worker or handed to the lead per commit mode
````
