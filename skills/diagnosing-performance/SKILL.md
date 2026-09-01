---
name: diagnosing-performance
description: Use when something is slow — a slow endpoint, query, page, job, build, or test suite — or when a change may have made something slower, before proposing any optimization, cache, index, or parallelism.
---

# Diagnosing Performance

## Overview

A slow system returns the right answer too late. That makes it different from a bug: there is
no wrong output to trace back to a wrong line. Every line is a candidate, so intuition picks
the one that *looks* expensive, and intuition is wrong most of the time.

**Core principle:** Measure the cost, then remove the largest one. Never optimize what you
have not measured.

**Violating the letter of this process is violating the spirit of performance work.**

## The Iron Law

```
NO PERFORMANCE CHANGE WITHOUT A BEFORE NUMBER AND AN AFTER NUMBER
```

Reading code is legitimate evidence for a hypothesis. A lazy-loaded relation inside a loop is
an N+1 whether or not a profiler says so, and you may act on that sighting.

Reading code is never evidence that the fix worked. Both numbers come from the same workload,
measured the same way. A change you cannot prove is a change you must revert.

## When to Use

Use for any complaint about time, throughput, or resource use:

- An endpoint, page, query, or job is slow
- Throughput fell, or latency rose, after a release
- The service falls over under load but works fine in development
- Memory grows until the process restarts or the container is killed
- The test suite or build takes too long
- Cloud spend rose without a traffic change

**Use this ESPECIALLY when:**

- The fix seems obvious ("it just needs an index", "it just needs a cache")
- You are about to add concurrency, caching, or a database index
- Someone has already tried an optimization that did not help
- The problem appears only at production data volume

**Route elsewhere when:**

- The output is wrong, not late → `razorback:systematic-debugging`
- The test is flaky from timing, not slow → the `razorback:systematic-debugging` skill's `condition-based-waiting.md`

**A performance change is not quick-fix tier.** `razorback:fixing-small-issues` covers small
reversible repairs; a performance fix carries a measurement obligation that the quick-fix tier
does not run. Diagnose here, then let the fix meet whatever tier it belongs to.

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Establish the Baseline

**BEFORE reading any code for optimization ideas:**

1. **Define slow with a number**

   "It's slow" is not a baseline. Convert the complaint into one metric:

   | Complaint | Metric |
   |---|---|
   | "The page takes forever" | p95 wall time to first byte, and to interactive |
   | "The job never finishes" | items processed per second, and total wall time |
   | "It falls over under load" | latency at a fixed request rate, plus error rate |
   | "It eats memory" | peak resident set, and growth per hour |
   | "The suite is slow" | total wall time, and the slowest 10 tests |

   Pick ONE. A change that improves two metrics and worsens a third is a trade, and you cannot
   see the trade if you tracked one number by accident.

2. **Fix the workload**

   Write down the exact request, dataset, and concurrency level. This is now the only workload
   that counts. Changing it mid-investigation invalidates every number you have.

3. **Use realistic data volume**

   An N+1 costs nothing at 10 rows and kills the service at 10,000. A missing index is
   invisible on a seeded dev database. If the local dataset does not reproduce the slowness,
   the dataset is the first thing to fix — not the code.

4. **Measure warm, and measure more than once**

   Discard the first run: it pays for cold caches, JIT, and connection setup. Take at least
   three runs after that. Report p95, not the mean — the mean hides the tail that users
   actually complain about.

5. **Record the baseline where it survives**

   Write the number, the workload, and the command into your notes or the plan before you
   touch anything. A baseline you remember is a baseline you will misremember in your favor.

See `measurement-playbook.md` in this directory for the workload rules and per-stack tools.

**If you cannot reproduce the slowness locally:** do not guess. Measure in the environment
where it is slow — request timing, database statistics, and log timestamps are all evidence.
An unreproduced slowness with production numbers beats a reproduced one with invented numbers.

### Phase 2: Locate the Cost

**Measure the layer before you guess the line.**

1. **Split the wall time**

   Attribute the total across the boundaries before you look inside any of them:

   ```
   total
     ├── client render / CLI startup
     ├── network + TLS
     ├── app compute
     ├── database (query time + connection wait)
     └── external services
   ```

   Most investigations end here. The layer that owns 80% of the time is the only layer worth
   opening.

2. **Count operations, not just time**

   Counts are deterministic, cheap to capture, and easy to assert in a test later:

   - How many queries did one request issue?
   - How many HTTP calls, and were any of them the same call twice?
   - How many rows came back, and how many did the code use?
   - How many allocations, file reads, or serialization passes?

   A count that scales with the input size names the cause on its own. 1 query at 10 rows and
   400 at 400 rows is an N+1, and no profiler is needed to say so.

3. **Profile, do not stare**

   When the cost is inside app compute, use a profiler. Reading code to find hot spots is the
   single most common way to waste a day. Get the flame graph or the sampled stack list.

4. **Distinguish latency from queueing**

   A slow response under load is often not slow work. Check whether time is spent *waiting for
   a worker, a connection, or a lock* rather than doing work. The signature is a latency cliff:
   fine up to some request rate, then a sharp rise with flat CPU. That is saturation, and
   optimizing the work will not fix it.

**Use Miller for the code-side investigation:**

- **Inspect** the slow function — callers, callees, and type flow with `inspect(target, depth=full)`
- **Find references** — every call site that reaches the hot path with `trace(target)`
- **Orient** on the subsystem you are about to change with `context(query)`
- **Assess blast radius** before the fix with `impact(target)`

### Phase 3: Name the Cause

**Map the measurement to a known pattern before writing anything.**

1. **State the hypothesis with the number attached**

   Not: "the serializer is slow."
   Instead: "the endpoint issues 412 queries for 411 orders because the serializer reads
   `order.customer` per row; the database accounts for 2.1s of the 2.4s total."

   A hypothesis with no number in it is a hunch, and you are back in Phase 1.

2. **Look the pattern up**

   `bottleneck-catalog.md` in this directory lists the recurring causes by layer, each with
   the symptom, the confirmation step, and the usual fix. Find yours there. If it is not there,
   say so explicitly — a genuinely novel cause is possible and worth naming, but "not in the
   catalog" is usually "not yet understood".

3. **Confirm before fixing**

   Every catalog entry carries a confirmation step, and it is always cheaper than the fix. Run
   `EXPLAIN` before adding the index. Log the query count before restructuring the serializer.
   Check the pool wait time before enlarging the pool.

4. **Check the algorithm before the constant**

   If the cost grows faster than the input, no amount of tuning saves it. Ask what happens at
   10× the data. A change from O(n²) to O(n) beats every micro-optimization combined, and
   micro-optimizing an O(n²) loop just moves the cliff slightly to the right.

### Phase 4: Fix and Prove

1. **One change at a time**

   Bundle an index, a cache, and a query rewrite together and you will never know which one
   worked — or which one of them made it worse. Fix, measure, keep or revert. Then the next one.

2. **Re-measure identically**

   Same workload, same data volume, same warm-up, same number of runs, same metric. A different
   measurement is not a comparison.

3. **Report both numbers and the trade**

   > p95 2.4s → 180ms on the 411-order workload (3 warm runs). Query count 412 → 2.
   > Cost: the serializer now eager-loads customers, so the single-order path fetches one extra row.

   State the regression risk you accepted. Every performance fix trades something — memory,
   staleness, complexity, or a slower path elsewhere.

4. **Guard the fix**

   A performance fix silently comes undone the first time someone adds a field to a serializer.
   Add the cheapest guard that would catch that:

   - **Prefer a count assertion** — "this endpoint issues at most 3 queries" is deterministic,
     fast, and fails for the right reason. Use `razorback:test-driven-development` to write it.
   - **A benchmark** when the cost is compute, not I/O. Compare against a committed baseline.
   - **A timing assertion only as a last resort.** Wall-clock thresholds in CI are flaky, and a
     flaky guard gets deleted within a month.

5. **If the fix did not help**

   The hypothesis was wrong. Revert it — do not leave a speculative optimization in the code
   because it "shouldn't hurt". Return to Phase 2 with what you learned about where the time
   is *not* going.

6. **If three fixes did not help**

   Stop. Three failed performance fixes means the cost is structural: the data model forces
   the access pattern, or the architecture forces the round trips. Take it to
   `razorback:architecture-quality`. Do not attempt fix #4.

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

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Baseline** | One metric, one workload, realistic volume, warm runs | A recorded number you can reproduce |
| **2. Locate** | Split time by layer, count operations, profile the hot layer | You know WHERE the time goes |
| **3. Name** | Map to catalog, state hypothesis with the number, confirm cheaply | You know WHY it is slow |
| **4. Prove** | One change, re-measure identically, guard the fix | Before and after numbers, plus a regression guard |

## It's working if

- Every performance change reports a before number and an after number from the same workload.
- The hypothesis carried a measurement before any code changed.
- Fixes landed one at a time, and the ones that did not help were reverted.
- The fix left a guard behind — a count assertion, a benchmark, or (last resort) a timing check.

## Supporting Techniques

Available in this directory:

- **`bottleneck-catalog.md`** — recurring causes by layer: symptom, confirmation, and fix
- **`measurement-playbook.md`** — how to get a trustworthy number, per layer and per stack

**Related skills:**

- **razorback:systematic-debugging** — when the output is wrong, not late
- **razorback:test-driven-development** — for the regression guard in Phase 4
- **razorback:verification-before-completion** — the before/after numbers are the evidence
- **razorback:architecture-quality** — when three fixes fail and the cost is structural
- **razorback:harvesting-debt** — mark an accepted performance ceiling with a `razorback:` comment
