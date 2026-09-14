---
name: diagnosing-performance
description: Use when something is slow — a slow endpoint, query, page, job, build, or test suite — or when a change may have made something slower, before proposing any optimization, cache, index, or parallelism.
---

# Diagnosing Performance

A slow system returns the right answer too late: no wrong line to trace, so intuition picks the line that *looks* expensive. **Measure the cost, then remove the largest one.**

## The Iron Law

```
NO PERFORMANCE CHANGE WITHOUT A BEFORE NUMBER AND AN AFTER NUMBER
```

Reading code is legitimate evidence for a hypothesis (a lazy-loaded relation in a loop is an N+1). Reading code is never evidence that the fix worked. Both numbers come from the same workload, measured the same way. A change you cannot prove is a change you must revert.

## When to Use

Any complaint about time, throughput, or resource use — including regressions after a release, load collapse, memory growth, slow suites or builds, and cloud spend. Especially when the fix "seems obvious" (index, cache), you are about to add concurrency, an optimization already failed, or it appears only at production volume.

**Route elsewhere:** wrong output → `razorback:systematic-debugging`; flaky timing, not slow → that skill's `condition-based-waiting.md`.

**A performance change is not quick-fix tier.** `razorback:fixing-small-issues` covers small reversible repairs; a performance fix carries a measurement obligation. Diagnose here, then let the fix meet whatever tier it belongs to.

## The Four Phases

Complete each phase before the next.

### Phase 1: Establish the Baseline

Before reading code for optimization ideas:

1. **Define slow with ONE metric:** p95 wall time (page), items/second (job), latency at a fixed request rate plus error rate (load), peak RSS and growth/hour (memory), total wall time and slowest 10 tests (suite). Two metrics hide the trade when a change helps one and hurts the other.
2. **Fix the workload.** Exact request, dataset, concurrency. Changing it mid-investigation invalidates every number.
3. **Use realistic volume.** An N+1 is free at 10 rows and fatal at 10,000. If local data does not reproduce the slowness, fix the dataset before the code.
4. **Measure warm, more than once.** Discard the first run (cold caches, JIT, connections). Take at least three more. Report p95, not the mean.
5. **Record the baseline** — number, workload, command — in notes or the plan before touching anything. A baseline you remember is a baseline you will misremember in your favor.

Read `measurement-playbook.md` for workload rules and per-stack tools. Cannot reproduce locally? Measure where it is slow (request timing, DB statistics, log timestamps) — production numbers beat invented ones.

### Phase 2: Locate the Cost

Measure the layer before you guess the line.

1. **Split wall time across boundaries:** client render / CLI startup, network + TLS, app compute, database (query + connection wait), external services. The layer owning 80% is the only one worth opening.
2. **Count operations:** queries, HTTP calls (duplicates?), rows returned vs used, allocations, serialization passes. A count that scales with input names the cause: 400 queries at 400 rows is an N+1.
3. **Profile, do not stare.** Cost inside app compute → flame graph or sampled stacks.
4. **Latency vs queueing.** A latency cliff — fine up to a rate, then sharp rise with flat CPU — is saturation (waiting on a worker, connection, or lock). Optimizing the work will not fix it.

code-kb: `get_context_slice` or `get_symbol_body` on the slow function; `find_references(symbol_name, direction="callers")` for every call site reaching the hot path; `codebase_outline` to orient; `blast_radius` before the fix.

### Phase 3: Name the Cause

1. **Hypothesis with the number attached.** Not "the serializer is slow" but "412 queries for 411 orders because the serializer reads `order.customer` per row; DB is 2.1s of 2.4s." No number → back to Phase 1.
2. **Look it up** in `bottleneck-catalog.md` (causes by layer: symptom, confirmation, fix). Not there? Say so — "not in the catalog" usually means "not yet understood".
3. **Confirm before fixing.** Every entry has a confirmation step cheaper than the fix: `EXPLAIN` before the index, query count before restructuring, pool wait before enlarging the pool.
4. **Algorithm before constant.** If cost grows faster than input, tuning cannot save it. O(n²)→O(n) beats every micro-optimization.

### Phase 4: Fix and Prove

1. **One change at a time.** Fix, measure, keep or revert. Then the next.
2. **Re-measure identically.** Same workload, same data volume, same warm-up, same number of runs, same metric.
3. **Report both numbers and the trade:** "p95 2.4s → 180ms on the 411-order workload (3 warm runs). Queries 412 → 2. Cost: eager-loading adds one row to the single-order path." Every fix trades memory, staleness, complexity, or a slower path elsewhere.
4. **Guard the fix.** Prefer a count assertion ("at most 3 queries"), written with `razorback:test-driven-development`. A benchmark against a committed baseline when the cost is compute. A timing assertion only as a last resort: wall-clock CI thresholds flake, and a flaky guard gets deleted within a month.
5. **Fix did not help?** Revert it — nothing stays because it "shouldn't hurt". Back to Phase 2.
6. **Three fixes failed?** The cost is structural (data model or architecture forces the access pattern). Take it to `razorback:architecture-quality`. Do not attempt fix #4.

## Red Flags — STOP and Return to Phase 1

Every row below — your own thought or a redirection from the user — means the same thing:
**STOP. Get a number.**

| Signal | Reality |
|--------|---------|
| "This is obviously the slow part" | Obvious is wrong most of the time. That is why profilers exist. |
| "Let me add a cache" | A cache hides the cost instead of removing it, and buys invalidation bugs at full price. Find the cost first. |
| "It just needs an index" | An index on the wrong column, or a column wrapped in a function, does nothing. Run `EXPLAIN` first. |
| "Let me parallelize it" | Parallelism multiplies a bad algorithm and hides the real cost behind scheduling noise. Fix the work, then consider concurrency. |
| "It's faster on my machine now" | One run is noise. Three warm runs and a p95, or it did not happen. |
| "It's slow because the language/framework is slow" | Almost never true, and unfalsifiable as stated. The runtime is the same one that is fast for everyone else. |
| "I'll optimize this while I'm in here" | An unmeasured optimization is a risk with no proven benefit. It also poisons the next measurement. |
| "We'll measure it in production later" | Later never comes, and by then the change is load-bearing. |
| "The profiler is a hassle to set up" | One hour of setup against a week of guessing. Set it up. |
| "Micro-optimizing this loop should help" | Check the complexity first. Constants do not save an O(n²). |
| "It's fine, it's only slow with a lot of data" | A lot of data is called production. |
| "The test suite is just slow, that's normal" | Suites are slow for findable reasons: real I/O, rebuilt fixtures, and sleeps. See the catalog. |
| User asks "How much faster?" | You changed something without measuring the result. |
| User asks "Did you check the query count?" | You optimized compute while the database held the time. |
| User says "Stop guessing" | You are proposing fixes without a measurement. |

## Quick Reference

Baseline (one metric, one workload, warm runs) → Locate (split by layer, count, profile) → Name (catalog, numbered hypothesis, cheap confirmation) → Prove (one change, identical re-measure, guard).

## It's working if

- Every performance change reports a before and an after number from the same workload.
- The hypothesis carried a measurement before any code changed.
- Fixes landed one at a time; the ones that did not help were reverted.
- The fix left a guard — a count assertion, a benchmark, or (last resort) a timing check.

## Supporting Files

- `bottleneck-catalog.md` — recurring causes by layer: symptom, confirmation, fix
- `measurement-playbook.md` — how to get a trustworthy number, per layer and per stack

**Related skills:** razorback:systematic-debugging (wrong, not late); razorback:test-driven-development (the guard); razorback:verification-before-completion (the numbers are the evidence); razorback:architecture-quality (structural cost); razorback:harvesting-debt (mark an accepted ceiling with a `razorback:` comment).
