# Bottleneck Catalog

## Overview

Recurring causes of slowness, grouped by the layer that owns the time. Reach this file in
Phase 3, after Phase 2 told you which layer holds the cost.

Each row carries a confirmation step. Run it before the fix. Confirmation is always cheaper
than the change it justifies, and it is the difference between a diagnosis and a guess.

**Read the section for your layer. Do not read all eight.**

## 1. Database and Data Access

The default suspect. Most "slow application" reports are slow data access, and most of those
are one of the first three rows.

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| Query count grows with row count | **N+1**: a lazy relation read inside a loop, often in a serializer or template | Log queries for one request; compare count at 10 rows vs 100 | Eager-load the relation in the initial query; batch the child fetch by parent id |
| One query is slow, and time grows with table size | **Missing index** on the filter or join column | `EXPLAIN` shows a sequential/full scan | Add the index on the filtered column, ordered to match the query |
| The index exists and is still not used | **Unusable index**: a function or cast wraps the column (`LOWER(email)`), a leading wildcard (`LIKE '%x'`), or a type mismatch between column and parameter | `EXPLAIN` shows a scan despite the index | Match the types; index the expression; use a trigram or full-text index for infix search |
| Query is fast alone, slow in the request | **Connection pool wait** counted as query time | Compare pool checkout time against query execution time | Fix the query holding connections; size the pool to the database, not to the app |
| Response is large and slow to serialize | **Over-fetch**: `SELECT *` pulling wide columns, blobs, or unused relations | Compare bytes fetched against bytes used in the response | Select the columns the caller needs; move blobs to a separate fetch |
| App loads many rows and keeps few | **Filter or sort in application code** | Count rows returned vs rows rendered | Push the `WHERE`, `ORDER BY`, and `LIMIT` into the query |
| Page 1 is fast, page 500 is slow | **Deep `OFFSET` paging** — the database still walks the skipped rows | Time page 1 against a deep page | Keyset (seek) pagination: `WHERE id > :last ORDER BY id LIMIT n` |
| Import or bulk write takes minutes | **Per-row `INSERT`/`UPDATE`**, each with its own round trip and transaction | Count statements against row count | Batch inserts, multi-row `VALUES`, or the bulk-copy path; one transaction per batch |
| Writes stall intermittently; deadlocks appear | **Transaction held open across I/O**, a queue publish, or user think-time | Measure transaction duration, not just query duration | Shrink the transaction to the writes; do external calls outside it; take locks in a consistent order |
| One row multiplies into thousands | **Cartesian join** from two or more one-to-many joins in one query | Row count returned is the product of the child counts | Split into separate queries, or use a subquery/lateral join per collection |
| Suddenly slow after a data load, no code change | **Stale statistics** or a plan flip from parameter sniffing | Compare estimated vs actual rows in `EXPLAIN ANALYZE` | Update statistics; add a plan hint or recompile option only after the statistics fix fails |
| List endpoint slows as the table grows | **No pagination**, or a `COUNT(*)` of the whole table on every request | Check whether the query has a `LIMIT`, and time the count separately | Require a page size; use an approximate count or cache the total |
| Bursty latency with locks in the wait graph | **Lock contention** on a hot row or table; lock escalation | Inspect the lock/wait statistics view during the burst | Shorten the transaction; narrow the update; use per-key rather than table-wide locking |

## 2. Async, Concurrency, and Parallelism

The layer where the code looks concurrent and behaves sequentially — or the reverse, where it
is concurrent enough to bring down a dependency.

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| Total time equals the sum of independent calls | **Sequential awaits in a loop** — each call is started only after the previous completes | Compare total against the slowest single call | Start all calls, then await together (`Promise.all`, `asyncio.gather`, `Task.WhenAll`), with a bounded degree |
| Started concurrently, still sequential | **Awaiting each task at creation** — the await is inside the loop that creates it | Read the loop: is the await on the same line as the call? | Collect the tasks, await the collection |
| Downstream service or database starts failing under our load | **Unbounded fan-out** — one request spawns N concurrent calls with no cap | Count concurrent outbound calls at peak | Bound the concurrency (semaphore, worker pool, chunked batches) |
| Latency cliff under load; CPU stays low | **Thread-pool or event-loop starvation** — every worker is blocked waiting | Watch queue delay and available workers, not CPU | Remove the blocking call from the async path; grow the pool only after that |
| Sporadic deadlock or total stall; async code that mostly works | **Sync-over-async**: `.Result`, `.Wait()`, `block_on`, or a blocking read inside an async path | Find the blocking call on an async stack | Make the path async end to end; never block on an async result from a pool thread |
| Single-threaded runtime freezes during a request | **CPU work on the event loop** (Node, Python asyncio, UI thread) blocking every other task | Measure event-loop lag during the request | Move the CPU work to a worker thread, a process, or a queue |
| Throughput is flat no matter how many threads are added | **One hot global lock** serializing the work | Sample stacks: many threads waiting on the same monitor | Shard the lock per key; use a concurrent data structure; shorten the critical section |
| Lock waits grow with dependency latency | **Lock held across I/O** — a network or disk call inside the critical section | Compare lock hold time against the I/O time inside it | Do the I/O outside the lock; take the lock only to publish the result |
| Parallel version is slower than the serial one | **Parallelism on I/O-bound or trivially small work** — coordination costs more than the work | Compare serial vs parallel at the real item size | Use async concurrency for I/O; keep the serial path for small batches; raise the per-task chunk size |
| Memory grows and latency rises when the producer is fast | **No backpressure** — an unbounded queue absorbing the mismatch | Watch the queue depth over time | Bound the queue; make the producer wait; shed load deliberately |
| A dependency slows down and the whole system collapses | **Retry storm** — retries amplify load exactly when the dependency is weakest | Compare outbound request rate against the inbound rate during the incident | Cap retries, add exponential backoff with jitter, add a circuit breaker |
| One slow dependency exhausts every worker | **Missing timeout** on the outbound call | Check the client's default timeout — it is often infinite | Set an explicit timeout below the caller's own deadline |
| High CPU in the scheduler, low useful throughput | **Oversubscription** — more runnable threads than cores | Compare thread count against core count; watch context switches | Size pools to cores for CPU work; use async for I/O rather than more threads |
| Cache-heavy parallel loop scales badly | **False sharing** — separate counters on one cache line | Rare. Confirm with a hardware-counter profile before acting | Pad the per-thread state; aggregate per thread and combine at the end |

## 3. Network and Service Boundaries

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| One user action produces dozens of requests | **Chatty API** — the client assembles what one endpoint could return | Count requests per user action | Add a batch or composite endpoint; fetch by id list rather than per id |
| Every call pays a fixed setup cost | **No connection reuse** — a new client, and a new TLS handshake, per call | Compare connect time against total time per request | Reuse one long-lived client; enable keep-alive and pooling |
| Time scales with payload size | **Oversized payload** — no compression, or fields nobody reads | Compare bytes on the wire against fields used | Enable compression; return only requested fields; paginate |
| CPU is hot but the work looks like I/O | **Serialization cost** on a large object graph | Profile: serializer frames dominate | Trim the graph; use a faster codec; stream instead of materializing |
| Total equals the sum of independent dependencies | **Serial dependency chain** that has no ordering requirement | Draw the call graph; look for real data dependencies | Issue independent calls together; keep only the true chains serial |
| First request after idle is slow, the rest are fast | **Cold start**: DNS, connection warmup, JIT, or lazy container start | Compare first-call against steady-state timing | Warm the pool at startup; keep a minimum instance; pre-resolve and pin connections |

## 4. Algorithms and Data Structures

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| Time grows much faster than input size | **Accidental O(n²)** — a linear scan (`list.contains`, `find`, a nested loop) inside a loop | Time at n and 2n: 4× means quadratic | Index the inner collection into a hash set or map first |
| A pure function dominates the profile | **Loop-invariant work** — the same value recomputed every iteration | Check what inside the loop depends on the loop variable | Hoist it out; compute once |
| Sorting appears repeatedly in the profile | **Repeated sorting**, or a full sort where the top k suffices | Count sort calls per request | Sort once and keep it sorted; use a heap for top-k |
| String building dominates a loop | **Quadratic concatenation** — each `+=` copies the whole string | Profile shows allocation and copy frames | Use a string builder, a list plus join, or a writer |
| Regex work is hot | **Recompiled per call**, or **catastrophic backtracking** from nested quantifiers | Time the same pattern against a slightly longer input — a cliff means backtracking | Hoist the compiled pattern; rewrite the pattern to avoid nested quantifiers; anchor it |
| Memory spikes before the work starts | **Eager materialization** of a collection that could stream | Watch peak memory against result size | Stream, iterate lazily, and process in chunks |
| Lookup-heavy code is slow with small data | **Wrong container** — a list where a hash or a sorted structure belongs | Count the comparisons per lookup | Match the container to the access pattern |

## 5. Memory and Allocation

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| Regular latency spikes, sawtooth memory | **Allocation churn** driving garbage collection | Compare GC time and pause count against the request timeline | Allocate less per request; reuse buffers; avoid per-item wrapper objects |
| Memory grows and never returns | **Leak**: an unbounded cache, a detached-but-referenced handler, or a growing static collection | Compare heap snapshots taken an hour apart | Bound the cache with a size and a TTL; unsubscribe; drop the static reference |
| Large inputs kill the process | **Whole-file or whole-result load** into memory | Compare peak memory against input size | Stream the file; page the result set; process in chunks |
| Container restarts under load | **Memory limit hit** — the orchestrator kills or throttles the process | Check for OOM kills and throttling in the platform events | Fix the allocation cause first; raise the limit only with evidence |
| Copy frames dominate a hot path | **Large value copies** or defensive copying on every access | Profile shows copy/clone frames | Pass by reference; make the type smaller; copy once at the boundary |

## 6. Caching

Caching belongs here, at the end of the investigation. A cache added before Phase 3 hides the
cause and buys invalidation bugs at full price.

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| The cache is in place and it is still slow | **Low hit rate** from a key that is too specific | Measure hits against misses, and inspect the key | Coarsen the key; cache the shared part rather than the personalized one |
| Latency spike exactly at expiry | **Stampede** — every caller misses at once and recomputes | Correlate the spike with the TTL boundary | Single-flight the recompute; stagger TTLs with jitter; serve stale while revalidating |
| Users see stale or wrong data | **Invalidation gap** — a write path that does not evict | Trace every writer of the cached data | Invalidate at the write; prefer a short TTL over clever invalidation |
| Cache helps in one place, not another | **Wrong layer cached** — the expensive step sits above or below the cache | Compare the cost inside the cached unit against the total | Move the cache to the boundary that owns the cost |
| Memory grows with traffic | **Unbounded cache** with no eviction | Watch cache size over time | Set a maximum size and an eviction policy |

## 7. Startup, Build, and Test Suite

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| The suite takes minutes and CPU sits idle | **No parallelism**, or tests serialized by a shared resource | Compare CPU use against wall time | Run in parallel; isolate the shared fixture per worker |
| Every test hits a real database, file, or network | **Real I/O per test** where a boundary test would do | Count the I/O operations for one test file | Keep real I/O for the integration layer; unit-test above it (see `razorback:test-driven-development`) |
| Setup dominates every test | **Fixtures or migrations rebuilt per test** | Time setup against assertion time | Build once per suite; roll back per test in a transaction |
| Suite time is dominated by waiting | **Sleeps instead of condition waits** | Grep for `sleep`, `setTimeout`, `Thread.Sleep` in the tests | See `../systematic-debugging/condition-based-waiting.md` |
| A few tests own most of the time | **A long tail hidden in the total** | List the slowest 10 tests | Fix or re-scope those; the rest of the suite is fine |
| Process start is slow before any work | **Startup scanning**: reflection, dependency-graph assembly, or eager module loading | Profile the process from launch to first request | Defer the non-critical work; cache the scan; trim the dependency graph |
| Every build recompiles the world | **No incremental build or cache** | Compare a no-change rebuild against a clean build | Enable the build cache; split the compilation unit; fix the file that invalidates everything |

## 8. Client and Rendering

| Symptom | Likely cause | Confirm | Typical fix |
|---|---|---|---|
| The page loads in visible stages | **Request waterfall** — each resource is discovered only after the previous one loads | Read the network waterfall in the browser tools | Preload the critical resources; inline what blocks first paint |
| Interaction lags on a busy screen | **Re-render storm** — an unstable prop or a subscription re-rendering the tree | Profile the component render counts | Memoize; stabilize the identity; move the state down |
| A long list scrolls badly | **Every row is in the DOM** | Count the rendered nodes | Virtualize the list |
| First load is slow on a cold cache | **Bundle size** — everything ships up front | Read the bundle report | Split by route; lazy-load the heavy dependency; drop it if it earns nothing |
| Scrolling or animation stutters | **Layout thrash** — reading a layout property after every write forces a reflow | Look for read-after-write loops on layout properties | Batch the reads, then the writes; animate on compositor properties |
| Images dominate load time | **Unsized or unoptimized images** | Compare delivered pixels against displayed pixels | Serve the display size; use a modern format; lazy-load below the fold |

## Not in the Catalog

If nothing here matches the measurement, say so explicitly rather than forcing the nearest
row. State what you measured, what you ruled out, and what you plan to try. A genuinely novel
cause is possible — but "not in the catalog" usually means the measurement in Phase 2 was not
specific enough to name a cause yet.
