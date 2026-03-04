# Fix Prompt Template (Resume Implementer)

Use this template when resuming the implementer subagent to fix review issues.
The subagent already has full context from its implementation pass.

```
Agent tool (resume: "<implementer-agent-id>"):
  description: "Fix review issues for Task N"
  prompt: |
    The reviewer found issues with your implementation. Fix them.

    ## Review Findings

    [Paste the reviewer's full output here — issues, severity, file:line references]

    ## What to Do

    1. Fix each issue listed above
    2. Run tests to verify nothing broke
    3. Commit the fixes
    4. Report what you changed

    Keep it focused — fix what the reviewer flagged, don't refactor beyond that.
```

**Why resume instead of fresh dispatch:** You already have the full context — the files
you read, the decisions you made, the tests you wrote. A fresh subagent would spend
most of its token budget just getting back to where you already are.
