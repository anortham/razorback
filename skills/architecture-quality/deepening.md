# Deepening

Use this file when a refactor candidate is accepted and the deepened module's dependencies must be classified to choose the test strategy. Assumes the vocabulary in `architecture-language.md`.

## Dependency Categories

Classify each dependency of the module being deepened — find them with Miller `trace`/`impact` on the modules being merged. The category dictates how the deepened module is tested across its seam.

1. **In-process** — pure computation, in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter.
2. **Local-substitutable** — the dependency has a faithful local test stand-in (PGLite for Postgres, an in-memory filesystem). Deepenable when the stand-in exists; tests run against the stand-in. The seam stays internal — no port at the caller-facing interface.
3. **Remote but owned** — your own services across a network boundary (internal APIs, microservices). Define a port at the seam; the deep module owns the logic, the transport is an injected adapter. Production gets the HTTP/gRPC/queue adapter; tests get an in-memory adapter.
4. **True external** — third-party services you do not control (Stripe, Twilio). The deepened module takes the dependency as an injected port; tests provide a mock adapter.

## Seam Discipline

- One adapter at a seam is a hypothesis; a second adapter proves the seam is real. Do not introduce a port unless at least two adapters are justified (typically production + test).
- Do not promote an internal seam into the caller-facing interface just because tests use it.

## Testing Strategy: Replace, Don't Layer

- Once tests exist at the deepened module's interface, old unit tests on the swallowed shallow modules are waste — delete them, do not keep both layers.
- New tests assert observable outcomes through the caller-facing interface, not internal state.
- Tests should survive internal refactors. A test that must change when the implementation changes is testing past the interface.
