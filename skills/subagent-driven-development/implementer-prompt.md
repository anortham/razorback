# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Agent tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description

    [FULL TEXT of task from plan - paste it here, don't make subagent read file]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Before You Begin

    You are operating inside an approved plan. The plan text in "Task Description" above is the authoritative spec. If something is ambiguous:

    1. Read the plan context to see if it's disambiguated elsewhere.
    2. Check the surrounding codebase with Miller (orient, inspect a symbol, find references).
    3. If still ambiguous, pick the plan-consistent option and note the choice in your report (file:line + reason).

    **Only stop and report BLOCKED if** (see blocker taxonomy):
    - Credentials or environment is broken and the plan doesn't say how to recover
    - Your task requires a destructive action not authorized by the plan
    - The code state contradicts a load-bearing plan assumption
    - There's a safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer

    Otherwise, make the call, note it, and proceed.

    ## Codebase Orientation (HARD REQUIREMENT)

    Miller-first orientation is mandatory. Do not start by reading raw files,
    whole diffs, or grep output. Before writing any code, orient yourself with
    Miller in this order:

    1. **Understand the area:** orient with a token-budgeted bundle
       (Miller `context(query='<area>')`).
       Returns pivots (full code), neighbors (signatures), file map.

    2. **Understand symbols you'll modify:** inspect the symbol
       (Miller `inspect(target='<name>', depth=full)`).
       Shows callers, callees, children, types — everything you need to make safe changes.

    3. **Check impact:** find references
       (Miller `trace(target='<name>')`).
       See all references before changing anything. Required — do not skip.

    4. **Read targeted code:** list a file's symbols
       (Miller `inspect(target='<file>')`).
       See specific symbols instead of reading entire files.

    5. **Only then read raw code if needed:** after the MCP calls above, read
       the minimum raw code needed for the edit.

    **Do NOT use Glob -> Read -> Grep chains for exploration.** Miller returns
    targeted, token-efficient context in 1-2 calls instead of 5-8. If you skip it
    and start with raw-file exploration, you have broken the workflow.

    ## API Shape Evidence

    Do not infer or invent API shapes. Before relying on symbol names, function
    signatures, config shapes, route names, CLI flags, or public contracts, use
    Miller to discover the real shape in the current codebase.

    In your report, report the exact Miller calls that proved each important API
    shape. If Miller cannot prove a shape, say what evidence is missing and choose
    the safest plan-consistent path instead of guessing from memory.

    ## Architecture Quality

    The approved module/interface shape in the plan is part of the spec.

    - Preserve the approved module/interface shape.
    - Do not redesign locally just because a different shape looks cleaner.
    - If code reality contradicts the approved shape, report a plan mismatch instead of silently changing direction.
    - Does this keep complexity local?
    - Is the caller-facing interface smaller than the behavior it unlocks?
    - Are tests written through the same interface callers use?
    - Did new seams earn their keep?
    - Did this avoid speculative extensibility?
    - Did it fix the structural cause, not only the symptom?

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation with the assigned worker scope
    4. Commit your work only after assigned verification passes
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

    ## Model Routing

    Assigned tier: [implementation / mechanical / strategy / gate-review / escalation]
    Harness mapping: [model/reasoning setting or inherit]

    If the harness cannot choose model or reasoning per worker, use inherit and
    report that limitation. Do not self-upgrade or downgrade. If the task no
    longer fits the assigned tier, report BLOCKED with the reason.

    ## Verification Scope

    Use the plan's Verification Strategy. The target repo supplies concrete
    commands; do not invent runner-specific commands.

    Assigned worker scope: [worker-red-green / worker-ceiling command from plan]

    Rules:
    - Run the lowest-cost repo-defined command that proves the changed behavior.
    - State the invariant each assigned test, replay, metric, or acceptance gate
      proves.
    - For replay or metric evidence, identify which metrics are hard gates and
      which are report-only.
    - If assigned verification fails, stop and report BLOCKED unless the plan
      explicitly says to update that gate. Do not commit failing verification.
    - Do not own affected-change, branch-gate, or expensive-specialist scopes.
      If this prompt asks you to run a broad command for diagnostics, label it
      diagnostic output, not acceptance evidence.
    - If the repo defines worker limits, follow them.
    - Report the invariant, scope label, command, commit SHA, result, and
      timestamp so the lead can update the verification ledger.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    When done, report:
    - What you implemented
    - Verification invariant, scope, command, commit SHA, result, and timestamp
    - Hard-gate metrics and report-only metrics, when replay or metric evidence is involved
    - Files changed
    - **Miller calls used** - list the orient / inspect / find-references / list-symbols calls you made and what each one confirmed
    - **API-shape evidence** - list the Miller evidence for any symbol names, function signatures, config shapes, route names, CLI flags, or public contracts you relied on
    - Self-review findings (if any)
    - **Judgment calls made** - non-obvious decisions in the form `file:line - chose X over Y because [reason]`. Include every ambiguity you resolved without asking. Feeds the morning report's "Judgment calls" section.
    - Any issues or concerns
```
