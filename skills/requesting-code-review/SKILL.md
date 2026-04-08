---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Two review modes, depending on context.

**Core principle:** Review early, review often.

## Mode 1: Inline Review (Team-Driven Development)

When using `razorback:team-driven-development`, the **lead does inline review** after each teammate reports DONE. No separate reviewer agent needed.

**The lead checks two things:**

**Spec compliance:** Did the teammate build what was requested? Nothing missing, nothing extra?
- Use `get_symbols(file_path)` to scan changed files quickly
- Compare actual code to task requirements line by line

**Code quality:** Is the code clean, tested, and maintainable?
- Use `deep_dive(symbol)` on key modified symbols
- Use `fast_refs(symbol)` to verify changes don't break dependents
- Check tests verify behavior, not just that code runs

**If issues found:** Message the teammate directly with findings. They fix and re-report. Review cap: 3 iterations.

## Mode 2: Standalone Review (Ad-Hoc / Pre-Merge)

For work done outside team-driven-development, dispatch the `razorback:code-reviewer` agent.

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-reviewer agent:**

Use Agent tool with razorback:code-reviewer type, fill template at `code-reviewer.md`

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## When to Request Review

**Mandatory:**
- After each task in team-driven development (inline by lead)
- After completing major feature (standalone)
- Before merge to main (standalone)

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## Integration with Workflows

**Team-Driven Development:**
- Lead does inline review (Mode 1) after each teammate reports DONE
- See team-driven-development skill for full review checklist

**Executing Plans:**
- Review after each batch (3 tasks)
- Standalone review (Mode 2)

**Ad-Hoc Development:**
- Standalone review before merge
- Standalone review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md
