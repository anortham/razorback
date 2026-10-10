---
name: building-feedback-loops
description: Builds and keeps a check that runs the changed behavior for real (a run script, a fake upstream service on localhost, fixture data, a browser or terminal driver) so the agent verifies its own work without a human. Use when the repo has no way to run the change locally, when unit tests mock the boundary that matters (webhooks, HTTP clients, UI, CLI output), or before handing verification back to the user. Not for claim-time evidence rules (razorback:verification-before-completion).
---

# Building Feedback Loops

Tests prove the code under test; a feedback loop proves the behavior. When the repo gives no way to run the change, building the smallest loop is part of the task, not a request to the user.

Not for a pure function whose tests exercise the real behavior, or a repo whose existing run command already shows the change: run that.

## Core Pattern

Before: "Unit tests pass with Slack mocked. Not verified: please send one test webhook."

After: start the service on localhost with its Slack base URL pointed at a 20-line fake server; POST a `pull_request.labeled` payload copied from GitHub's docs; read which channel the fake received. Commit the fixture and the script.

## Loops by Surface

| Change surface | Loop |
|---|---|
| Web UI | Dev server plus a browser driver: Playwright MCP, `@playwright/cli`, Chrome DevTools MCP, or Claude Code `/run` and `/verify`. Codex CLI has no built-in browser: add Playwright MCP. |
| CLI | Build the binary; run it on a committed fixture input. |
| TUI | tmux or Herdr: send keys, capture the pane. |
| HTTP service, webhook | Start it locally with a fake upstream on localhost; replay a fixture payload. |
| Job or queue worker | Run one job against a seeded local store; read the state it wrote. |
| Library | A short example program that calls the public API. |

## Steps

1. At the start, name the loop: the command that runs the behavior and the output that proves it.
2. If it is missing, build the smallest one. Use an existing seam (env var, config, base URL). A seam you must add stays small and goes in the report.
3. Take fixtures from a real source: provider docs, a recorded payload, an installed package that ships examples, the repo's own types. A payload shape from memory is a guess (razorback:grounding-in-current-docs). When no source is reachable, mark the fixture unverified in the report.
4. Run the loop after the change, and read the output or look at the screenshot.
5. Keep it with the change, where the repo keeps such files (`scripts/`, `testdata/`), not in a scratchpad; it ships in the change's commit. A browser check made through MCP calls leaves no file: when it will repeat, save it as a browser test or a run skill. A fast, deterministic loop becomes a test.
6. Report what the loop showed and what it cannot reach (the real Slack workspace, production data).

## UI Changes

A screenshot is evidence only after you compare it with the request. Capture a phone width and a desktop width, every interactive state, and the console (Playwright MCP `browser_console_messages`). For new visual design, use an installed design skill: Anthropic `frontend-design` or Impeccable for direction, Vercel `web-design-guidelines` for review.

## It's working if

- The report names the command that ran the behavior and what it showed.
- No check went back to the user that localhost could run.
- Fixtures cite their source.
- The loop ships with the change, and a later session can run it.
