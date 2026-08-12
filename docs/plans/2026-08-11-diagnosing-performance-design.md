# Design: `diagnosing-performance` skill

**Date:** 2026-08-11
**Status:** approved
**Architecture impact:** none — a new leaf skill plus one cross-reference.

## Problem

Razorback has no performance skill. `systematic-debugging` lists "Performance problems" in
its When-to-Use block and then gives no method for them. The four debugging phases assume a
defect with a wrong answer; a slow system returns the right answer too late. The evidence,
the tools, and the proof of the fix are all different.

Without a skill, an agent that meets a slow endpoint does the predictable thing: it reads
the code, picks the line that looks expensive, changes it, and declares victory with no
number on either side of the change.

## Scope

Diagnosis only. The skill triggers when something IS slow. It does not cover performance
budgets at design time, and it does not add a performance lens to code review. Those were
considered and cut.

## The law

```
NO PERFORMANCE CHANGE WITHOUT A BEFORE NUMBER AND AN AFTER NUMBER
```

Reading code is legitimate evidence for a hypothesis. An N+1 in a loop is visible without a
profiler, and the skill permits acting on that sighting. Reading code is never evidence that
the fix worked. Both numbers come from the same workload, measured the same way.

## The four phases

Same shape as `systematic-debugging`, so the two skills read as a pair.

1. **Baseline.** Reproduce the slowness. Pick one metric, one workload, one realistic data
   volume. Record p95 across at least three warm runs.
2. **Locate.** Split the wall time by layer — client, network, app, database, external
   service — before guessing a line. Count operations as well as time; query counts and
   round-trip counts are deterministic and cheap to capture.
3. **Name the cause.** Map the measurement to a catalog entry. State the hypothesis with the
   number attached.
4. **Fix and prove.** One change. Re-measure the same workload the same way. Add a
   regression guard when the fix can silently come undone.

## Files

| Path | Contents |
|---|---|
| `skills/diagnosing-performance/SKILL.md` | Law, when to use, four phases, anti-rationalization table, quick reference, related skills |
| `skills/diagnosing-performance/bottleneck-catalog.md` | Symptom → likely cause → how to confirm → typical fix, in eight layers |
| `skills/diagnosing-performance/measurement-playbook.md` | How to get a number: workload rules, layer split, counting over timing, per-stack tools, how to guard the fix |

Supporting files sit flat in the skill directory, matching `systematic-debugging`.

## Catalog layers

1. **Database and data access** — N+1, unusable index, over-fetch, filter or sort in app
   code, deep `OFFSET` paging, per-row writes, transaction held across I/O, pool exhaustion
   counted as query time, cartesian join from stacked includes, stale plan.
2. **Async, concurrency, parallelism** — sequential awaits over independent calls, unbounded
   fan-out, sync-over-async and thread-pool starvation, one hot global lock, lock held across
   I/O, parallelism applied to I/O-bound or tiny work, missing backpressure, retry storms,
   CPU work on a single-threaded event loop, missing timeouts.
3. **Network and service boundaries** — chatty round trips, no connection reuse, oversized
   payloads, serialization cost, serial chains that could run together.
4. **Algorithms and data structures** — accidental O(n²), loop-invariant work, repeated
   sorts, string building in a loop, regex recompiled per call.
5. **Memory and allocation** — allocation churn, whole-file loads instead of streams,
   unbounded caches, container memory throttling.
6. **Caching** — only after the cost is known: key granularity, hit rate, stampede,
   invalidation cost.
7. **Startup, build, and test suite** — real I/O per test, fixtures rebuilt per test, sleeps
   instead of condition waits, cold start, non-incremental builds.
8. **Client and rendering** — request waterfalls, re-render storms, unvirtualized lists,
   bundle size.

## Integration

One edit to an existing skill. `systematic-debugging/SKILL.md` currently lists "Performance
problems" as an in-scope issue and drops it; it routes here instead, and gains a
Related-skills entry. No other skill changes.

## Acceptance criteria

- [ ] `skills/diagnosing-performance/SKILL.md` exists with valid frontmatter (`name`,
      `description`), and the description states the trigger.
- [ ] The law appears verbatim in a fenced block.
- [ ] Four phase headings are present, in order.
- [ ] An anti-rationalization table has at least 10 rows, including caching-first,
      parallelize-first, index-without-EXPLAIN, and one-run-is-proof.
- [ ] `bottleneck-catalog.md` covers all eight layers, each with a symptom → cause →
      confirm → fix table.
- [ ] `measurement-playbook.md` covers workload rules, the layer split, counting over
      timing, per-stack tools, and regression guards.
- [ ] `systematic-debugging/SKILL.md` routes performance problems to the new skill.
- [ ] All cross-references use the `razorback:` prefix; no `superpowers:` references.
- [ ] `tests/diagnosing-performance.test.mjs` pins the frontmatter, the law, the phase
      headings, the catalog layers, the table size, and the routing edit.
- [ ] `npm test` passes.

## Rejected alternatives

- **Profile-before-hypothesis.** Blocks a cheap, certain N+1 fix behind profiler setup. The
  cost of the strict rule exceeds the guess-optimizing it prevents, because the after-number
  requirement already catches a wrong hypothesis.
- **Two tiers by fix cost.** A light path for code-visible smells and a full path for
  everything else. Rejected as a second gate to reason about with no extra safety: the
  before/after numbers are cheap in the light cases anyway.
- **Design-time performance budgets.** Real value, wrong skill. It belongs with
  `razorback:writing-plans`, not with a diagnosis loop.
