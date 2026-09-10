---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.
**Interface rule:** The interface is the test surface.

## When to Use

**Always:** new features, bug fixes, refactoring, behavior changes.

**Planned exceptions (explicit in the user request or plan, and logged):** throwaway prototypes, generated code, configuration files. "Skip TDD just this once" is rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? Delete it. Not as "reference", not "adapted" while writing tests. Implement fresh from tests.

## Red-Green-Refactor

**Understand before testing.** Miller `inspect(target, depth=overview)` on the function under test (interface, callers, types); `depth=full` when you are about to change it. `context` on the test area for existing patterns. Skip only if you just wrote the code.

### RED — one minimal failing test

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  expect(await retryOperation(operation)).toBe('success');
  expect(attempts).toBe(3);
});
```

One behavior, clear name, real code (mocks only when unavoidable). `test('retry works')` against a `jest.fn()` chain tests the mock, not the code.

### Verify RED — MANDATORY

Run the project-defined worker-scope command. Confirm the test fails (not errors), with the expected message, because the feature is missing (not a typo). Passes → you are testing existing behavior; fix the test. Errors → fix, re-run until it fails correctly.

### GREEN — minimal code

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); } catch (e) { if (i === 2) throw e; }
  }
  throw new Error('unreachable');
}
```

No `options?: { maxRetries, backoff, onRetry }` the test did not ask for. No refactoring other code, no "improving" beyond the test.

### Verify GREEN — MANDATORY

Same command. Test passes, worker scope stays green, output pristine (no errors or warnings). Test fails → fix code, not test. Required scope fails → fix now.

### REFACTOR — after green only

Remove duplication, improve names, extract helpers. Keep the test surface on the caller-facing interface, not private internals. Stay green; add no behavior. Then the next failing test.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

## Red Flags - STOP and Start Over

Code before test; test after implementation; test passes immediately; can't explain why the test failed; tests added "later"; any excuse from the table above. **All of these mean: Delete code. Start over with TDD.**

## Verification Checklist

- [ ] Every new function/method has a test
- [ ] Watched each test fail for the expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] Required verification scopes pass; output pristine
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Inspect nearby tests with Miller. Write the wished-for API, then the assertion first. In an approved autonomous run, pick the smallest plan-consistent test shape, log it, and stop only for blocker-taxonomy ambiguity. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |
| Don't know existing patterns | List a file's symbols with Miller `inspect` to see test file organization |

**Bug found?** Root-cause it with razorback:systematic-debugging, then write the failing reproduction test and follow the cycle. Never fix bugs without a test.

**Writing or changing any test?** Read [writing-good-tests.md](writing-good-tests.md): name the production change that would fail the test; derive expected values by hand, never with the code under test; assert behavior, never the mock; finish with the mutation check.

## Final Rule

Production code requires a test that existed and failed first. Exceptions are only the planned exceptions above: explicit in the user request or approved plan, and logged. Missing exception language is not a mid-run permission stop; follow TDD or classify the issue under the blocker taxonomy.
