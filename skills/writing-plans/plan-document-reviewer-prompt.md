# Plan Document Reviewer Prompt Template

Use this template when dispatching a plan document reviewer subagent.

**Purpose:** Verify the plan is complete, matches the spec, and has proper task decomposition.

**Dispatch after:** The complete plan is written.

```
Dispatch a reviewer subagent:
  description: "Review plan document"
  prompt: |
    You are a plan document reviewer. Verify this plan is complete and ready for implementation.

    **Plan to review:** [PLAN_FILE_PATH]
    **Spec for reference:** [SPEC_FILE_PATH]

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Completeness | TODOs, placeholders, incomplete tasks, missing steps |
    | Spec Alignment | Plan covers spec requirements, no major scope creep |
    | Task Decomposition | Tasks have clear boundaries, steps are actionable |
    | Buildability | Could an engineer follow this plan without getting stuck? |
    | Verification | Does the worker red/green scope name the repo runner narrowed to the change (one test or the focused group), with the full suite only at the branch gate? |

    ## Verify Buildability with code-kb

    A plan is only buildable if the code it names is real. Verify against the
    codebase — do not approve a path or symbol from memory:

    - Every file path the plan names resolves — code-kb `file_skeleton(file_path='<path>')` or `codebase_outline(path='<path>')`
    - Every symbol the plan names exists — code-kb `get_context_slice('<symbol>')`;
      escalate to `get_symbol_body` only for the symbols the plan actually rewrites
    - Flag every API the plan invents. A function signature, config key, route, or
      CLI flag that code-kb cannot find is a real issue — the implementer will build
      against something that does not exist. Name the step and what is missing.

    Do not read whole files to check this.

    ## Calibration

    **Only flag issues that would cause real problems during implementation.**
    An implementer building the wrong thing or getting stuck is an issue.
    Minor wording, stylistic preferences, and "nice to have" suggestions are not.

    Approve unless there are serious gaps — missing requirements from the spec,
    contradictory steps, placeholder content, or tasks so vague they can't be acted on.

    ## Output Format

    ## Plan Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Task X, Step Y]: [specific issue] - [why it matters for implementation]

    **Recommendations (advisory, do not block approval):**
    - [suggestions for improvement]
```

**Reviewer returns:** Status, Issues (if any), Recommendations
