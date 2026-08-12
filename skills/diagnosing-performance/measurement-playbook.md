# Measurement Playbook

## Overview

How to get a number you can trust, and how to keep it honest across the fix. Used in Phase 1
(baseline), Phase 2 (locating the cost), and Phase 4 (proving the fix).

**Core principle:** A measurement is a comparison. Anything that differs between the before
run and the after run — data, warm-up, machine, concurrency — is a confound, not a result.

## Workload Rules

Six rules. Breaking any one of them invalidates the comparison.

1. **One metric.** Choose before you measure. Latency, throughput, memory, or wall time — not
   a vague sense of "faster".
2. **One workload.** Fix the request, the dataset, and the concurrency. Write them down.
3. **Realistic volume.** An N+1 and a missing index are both invisible at development scale.
   If the local dataset does not reproduce the slowness, fix the dataset first.
4. **Warm runs.** Discard the first run — it pays for cold caches, JIT, connection setup, and
   lazy loading. Then take at least three.
5. **p95, not the mean.** The mean hides the tail users complain about. Report the spread when
   the runs disagree; wide spread is itself a finding.
6. **A quiet machine.** No build running, no other suite, no laptop on battery saver. Cloud
   instances with burst credits are especially unreliable for repeated timing.

## Counting Beats Timing

Prefer a count wherever one exists. Counts are deterministic, survive a noisy machine, and can
become a regression test without flaking.

| Count | Answers |
|---|---|
| Queries per request | N+1, missing batch, chatty repository |
| Rows returned vs rows used | Over-fetch, filter in app code |
| Outbound HTTP calls per action | Chatty API, missing batch endpoint |
| Allocations or bytes per operation | GC pressure, per-item wrapper objects |
| Lock acquisitions, or lock hold time | Contention, critical section too wide |
| Queue depth over time | Missing backpressure |
| Rendered DOM nodes | Missing virtualization |

A count that scales with input size names the cause on its own.

## Splitting the Wall Time

Attribute the total across boundaries before opening any of them. Sources, cheapest first:

- **Existing request logs** — most frameworks already log total time and database time
- **A `Server-Timing` response header** — splits server phases and shows up in browser tools
- **Distributed tracing spans**, if the system already emits them
- **Manual stopwatch instrumentation** at the boundaries — crude, effective, and removable

Add up the parts. A large unattributed remainder is itself a finding: the time is going
somewhere you have not instrumented, and that is usually queueing.

**Distinguish work from waiting.** Under load, check whether time is spent waiting for a
worker, a connection, or a lock rather than doing work. The signature is a latency cliff at a
threshold request rate with flat CPU. Optimizing the work will not move a saturation cliff.

## Tools by Layer

Names to reach for. Use whatever the project already has before installing anything.

### Database

| Need | Tool |
|---|---|
| Why is this query slow | `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL, `EXPLAIN ANALYZE` in MySQL, actual execution plan in SQL Server |
| Which queries cost the most overall | `pg_stat_statements`, the MySQL slow query log, Query Store |
| What did one request issue | The ORM's SQL logging, or a query-count interceptor in a test |
| Is the plan estimate wrong | Compare estimated vs actual rows in the analyzed plan |
| Lock and wait analysis | `pg_locks` / `pg_stat_activity`, `sys.dm_exec_requests`, `SHOW ENGINE INNODB STATUS` |

Read the plan bottom-up. The scan or join with the largest actual time is the answer, and the
row-count estimate that is wildly off is why the planner chose it.

### Application runtimes

| Runtime | Sampling profiler | Counters / live metrics | Microbenchmark |
|---|---|---|---|
| .NET | `dotnet-trace`, `dotnet-stack` | `dotnet-counters` (thread pool queue, GC, exceptions) | BenchmarkDotNet |
| Python | `py-spy record`, `cProfile` + `snakeviz` | `py-spy dump` for stuck threads | `timeit`, `pytest-benchmark` |
| Node.js | `node --cpu-prof`, `clinic flame`, Chrome DevTools inspector | `clinic doctor` for event-loop lag | `tinybench`, `mitata` |
| JVM | `async-profiler`, JDK Flight Recorder | JFR event streams, JMX | JMH |
| Go | `net/http/pprof`, `go tool pprof` | runtime metrics, execution tracer | `go test -bench` |
| Rust | `perf` + `flamegraph`, `samply` | — | `criterion` |
| Native / any | `perf record` / `perf stat` | `perf stat` for cache and branch counters | `hyperfine` |

**Sampling beats instrumenting** for a first look: lower overhead, and it does not distort the
shape of what it measures. Read the flame graph by width, not by depth.

### Whole-command and service level

| Need | Tool |
|---|---|
| Wall time of a CLI or build, with repeats and warm-up | `hyperfine` |
| Load and latency distribution against an HTTP service | `k6`, `wrk`, `oha`, `vegeta` |
| Where the memory goes | The runtime's heap snapshot, taken twice and diffed |
| Browser page and interaction cost | DevTools Performance panel, Lighthouse, the network waterfall |

For load tests, measure at a **fixed request rate**, not at maximum throughput. Open-loop
generators expose queueing; closed-loop generators hide it behind their own back-pressure.

## Recording the Baseline

Write this down before touching anything:

```
Metric:    p95 response time
Workload:  GET /orders?range=90d as user 4711, 411 orders, sequential
Data:      restored production snapshot 2026-08-01
Command:   hyperfine --warmup 1 --runs 5 'curl -s localhost:5000/orders?range=90d'
Baseline:  p95 2.41s  (runs: 2.38 2.40 2.41 2.44 2.39)
Counts:    412 queries, 411 orders returned
```

A baseline you keep in your head is a baseline you will misremember in your favor.

## Proving the Fix

Re-run the recorded command, unchanged, on the same data. Then report both numbers, the counts,
and the trade:

> p95 2.41s → 0.18s (5 runs, same workload). Queries 412 → 2.
> Trade: the serializer now eager-loads customers, so the single-order path fetches one extra row.

**If the runs disagree more than the improvement**, you have not measured an improvement. Take
more runs, or find a less noisy environment.

## Guarding the Fix

A performance fix comes undone the first time someone adds a field to a serializer. Add the
cheapest guard that would catch that, in this order of preference:

1. **A count assertion.** "This endpoint issues at most 3 queries." Deterministic, fast, and
   it fails for the right reason with a readable message. Most ORMs and HTTP clients can be
   instrumented in a test to count.
2. **A complexity assertion.** Run the operation at n and at 2n, and assert the count does not
   scale with n. Catches an N+1 without pinning an exact number that churns.
3. **A committed benchmark** when the cost is compute rather than I/O. Compare against a stored
   baseline with a generous threshold, and treat a regression as a review signal.
4. **A wall-clock threshold, last.** CI timing is noisy, a flaky guard gets deleted within a
   month, and a deleted guard protects nothing. If you must, set the threshold far above the
   measured value so that only a real regression trips it.

Write the guard with `razorback:test-driven-development`: make it fail against the old code
first, so you know it can detect the regression it exists to catch.
