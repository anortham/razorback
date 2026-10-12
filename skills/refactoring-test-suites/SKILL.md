---
name: refactoring-test-suites
description: Cuts a test suite's run time and test count while it keeps every bug the suite catches, with before and after numbers and a planted-bug check for each deleted test. Use when a suite is slow or bloated (thousands of near-duplicate tests, a 30-minute run, agents or CI that wait on the full suite, merges and releases held up by tests), or when the user asks to consolidate, dedupe, prune, or speed up tests. Not for writing new tests (razorback:test-driven-development).
---

# Refactoring Test Suites

A suite's behavior is the set of bugs it catches. Refactor it like code: cut time and count, keep that behavior, and prove both with numbers. Test count is rarely the cost. Setup per test, real I/O, waits, and serial runs are.

```
NO DELETED TEST WITHOUT A KEPT TEST THAT FAILS FOR THE SAME BUG
```

## Core Pattern

Before: "Deleted 1,200 near-duplicate tests. Coverage is still 86%."

After: "Backend 17m → 3m10s: one host per fixture (−9m), a fake SMTP client (−3m), publish moved to its own CI step (−2m). Then 1,200 controller tests → 140 parameterized rows; each removed cluster's bug was planted and a kept row failed."

## Steps

1. **Baseline.** Run each test project once with per-test durations written to a file (trx, JUnit XML, `--reporter`). Record wall time, summed test time, count, and coverage. Read older timings too: CI logs, notes, commit messages. Method: razorback:diagnosing-performance.
2. **Find the time before you delete anything.** Rank the costs, then fix the largest first. Speed fixes keep every test, so they carry no coverage risk. Look for:
   - an app host, browser, or container started per test instead of per fixture
   - a database created, migrated, or seeded per test
   - a test host that still calls a real service (SMTP, HTTP, DNS): check each service it registers; a refused connect can cost seconds per call
   - a build or publish inside a test
   - fixed sleeps, real retry back-off, real debounce timers (use a fake clock or an injected sleep)
   - serial runs, and the shared state that blocks parallel runs (process env vars, statics, one database)
   - debug logs written to disk, coverage collected on every local run
3. **Map rules across layers, then cut duplication.** Group tests by the rule they guard, across unit, integration, and UI tests. Keep a rule's cases at the cheapest layer that can catch its bug. A higher layer keeps one test for the wiring (route, error mapping, auth denial). Merge example tests into one parameterized test; every distinct case stays a row. Delete tests that assert only on their own mock, grep source or config text, or restate constants.
4. **Prove each batch.** One area per batch, one commit. For each deleted test, plant its bug (the mutation check in razorback:test-driven-development's `writing-good-tests.md`) and run the focused tests: a kept test must fail. Coverage per touched production file must not drop. Always keep regression tests (a fix commit added them), boundary cases, one auth denial per endpoint, and money and data-loss guards.
5. **Stop the regrowth.** Read the repo's agent and contributor rules (CLAUDE.md, AGENTS.md, CONTRIBUTING, PR templates). Rules such as "full suite before every commit", "new page → new test file", or "end-to-end test per field" grow and slow the suite. Propose replacements: focused tests in the inner loop, the full suite once at the branch gate, and each rule tested at one layer. The user owns these rules: show the diff and get agreement.
6. **Keep a ledger.** In the PR description, or a docs file for multi-session work: the baseline, each batch with time, count, and coverage before → after, and each deleted cluster with the kept test and the planted bug that proved it.

Slow tests that must stay (browser, publish, real database) move to a named tier that CI or the release runs. They are not skipped and not deleted.

## Common Mistakes

| Excuse | Reality |
|---|---|
| "Deleting duplicates will get us under 5 minutes" | One repo ran 504 tests in 2m26s one day and 17m another. The environment owned the time. Measure first. |
| "The table-driven cases keep the same coverage" | Line coverage shows the code ran, not that an assertion checks it. Plant the bug. |
| "Never remove tests that CLAUDE.md requires" | The rules are part of the cause. Propose a rule change. |
| "Parallel runs first: one attribute in AssemblyInfo.cs" | Shared state turns parallel runs into flaky runs. Remove it, then run each suite several times. |

## It's working if

- The report gives time, count, and coverage before and after, from the same commands.
- Speed fixes landed before deletions, each with its own number.
- Every deleted cluster names a kept test and the planted bug it failed on.
- The repo's rules no longer require a full run per change, or the user declined the change.
