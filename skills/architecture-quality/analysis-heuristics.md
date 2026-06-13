# Analysis Heuristics

Use these checks when Gate Mode finds structural relevance, when Candidate Mode is requested, or during an Audit Mode sweep. The point is not to decorate the plan. The point is to decide whether a structural change is real, useful, and local enough to justify itself.

Each heuristic's `Find it` line names the Miller calls that gather its evidence. Run those instead of grep chains or whole-file reads.

## Pass-Through Modules

Smell: the module mostly forwards calls, renames values, or wraps behavior with no local policy.

Find it: `inspect(symbol, depth=full)` shows a body that only forwards; `trace(symbol)` shows callers gaining nothing from the layer.

Evidence: deleting it does not shrink caller burden and usually just removes a layer of ceremony.

Do not act when the boundary is needed for protocol, ownership, or test isolation.

Tests: wrapper-only tests are weak. Prefer tests through the caller-facing interface.

## Duplicated Logic

Smell: the same policy, parsing, or validation shows up in multiple files.

Find it: `search(<rule or validation phrase>, mode=source)` — hits across multiple files are the evidence.

Evidence: the same bug fix, rule, or fallback keeps appearing in different places.

Do not act when the duplication is temporary, intentionally divergent, or part of a staged migration.

Tests: shared behavior should be tested once through the shared interface, not copied across call sites.

## Wrong Abstraction Level

Smell: callers need to know implementation details, or a helper exposes the wrong amount of behavior.

Find it: `inspect(symbol)` for the interface shape; `trace(symbol)` for what every caller is forced to know.

Evidence: the API shape leaks storage, transport, or orchestration details that callers should not own.

Do not act when a simple private helper is enough and no one is being forced to understand internals.

Tests: tests should talk to the level the caller actually uses, not the level that is easiest to mock.

## Tests Reaching Past The Caller-Facing Interface

Smell: tests mock internals, assert private state, or poke at methods callers never use.

Find it: `trace(<internal helper>)` — test files in a private helper's caller list are the smell; force test code into results with `search(..., exclude_tests=false)`.

Evidence: refactors break tests even when behavior does not change.

Do not act when you must test an external side effect or a real boundary such as a transport or file system.

Tests: move the test to the caller-facing interface whenever possible. The interface is the test surface.

## Speculative Seams

Smell: a new abstraction, plugin point, or adapter appears before the variation exists.

Find it: `trace(<interface>)` — one implementation and no second adapter means the seam is hypothetical.

Evidence: only one implementation exists, no real caller need is present, and the seam adds indirection.

Do not act when the seam is required by an actual protocol, ownership boundary, or compatibility contract.

Tests: every seam should earn a test that proves the variation or the boundary is real.

## Shotgun Surgery

Smell: one behavior change requires edits in many files.

Find it: `impact(<symbol>)` — a wide blast radius for a single rule is the signal.

Evidence: the same rule, shape, or guard is scattered across call sites or duplicated branches.

Do not act when the many-file change is the actual product change, such as an intentional API move.

Tests: shotgun surgery is often a sign that the test surface or module boundary is too wide.

## Swallowed Errors

Smell: a catch block, fallback, or guard hides failure and the code keeps going as if nothing happened.

Find it: `search(<catch / fallback / default keywords>, mode=source)` scoped with `file_pattern` to the area under review.

Evidence: the failure is logged, ignored, or converted into a default value without a clear recovery path.

Do not act when the fallback is intentionally best-effort and the loss is acceptable by design.

Tests: assert the error path or explicit fallback. Silent failure is usually a bug with a nice blazer on.

## Primitive Obsession

Smell: raw strings, numbers, and flags carry hidden invariants that are repeated everywhere.

Find it: `search(<validation or parsing snippet>, mode=source)` — the same guard repeated across callers.

Evidence: the same validation or parsing appears in multiple callers.

Do not act when the value is genuinely trivial and adding a type would only create ceremony.

Tests: value objects or typed wrappers should be tested at their interface, where invariants live.

## Over-Decomposition

Smell: the code was split into many tiny pieces, but the pieces did not buy any leverage.

Find it: `inspect(path)` listing many tiny symbols in one file; `trace` showing chains of single-caller hops.

Evidence: caller code gets longer, the number of seams grows, and no complexity actually disappeared.

Do not act when small pieces are independently meaningful or when a pipeline step needs its own test surface.

Tests: if the module is shallow, end-to-end interface tests usually matter more than tests for each fragment.

## Additive-Only Changes

Smell: new code gets added without integrating with or removing the old path.

Find it: `trace(<old symbol>)` — zero remaining callers means a dead path; `search` both paths to confirm the overlap.

Evidence: two paths now do the same thing, or dead code remains next to the new path.

Do not act when the overlap is a deliberate rollout step with a clear cleanup boundary.

Tests: prove the old path is gone, or prove the new path is the only one that matters.

## Repeated Review Findings

Smell: the same architecture comment keeps showing up in reviews.

Find it: not a code search — check `docs/adr/`, review notes, and Goldfish recall for the same comment recurring across diffs.

Evidence: reviewers keep pointing at the same seam, wrapper, coupling pattern, or test smell across different diffs.

Do not act when the finding is one-off or caused by a narrow bug fix that does not generalize.

Tests: repeated findings often justify a candidate or an ADR instead of another local patch.

## When Not To Act

Stop when the deletion test says the module still earns its keep and the change is already local.

Stop when the proposed fix would introduce a speculative seam, an adapter with no real variation, or a wider blast radius than the problem.

Stop when the issue is not repeatable, not caller-visible, or not worth the cost of changing the interface.
