# Logic Prototype

A tiny interactive terminal app that lets the user drive a state model by hand. Right when the question is about **business logic, state transitions, or data shape** — things that look reasonable on paper but only feel wrong once pushed through real cases.

If the question is "what should this look like" — wrong branch, use [UI.md](UI.md).

## Process

### 1. State the question

One paragraph at the top of the prototype's entry file or README: the state model under test and the question it must answer. A prototype answering the wrong question is pure waste.

### 2. Match the host project

Use the project's language, runtime, and task runner. Orient with Miller (`context` on the area, `inspect` the neighboring module) so the prototype uses the project's real domain vocabulary. No new package managers or runtimes.

### 3. Isolate the logic in a portable module

Put the logic that answers the question behind a small pure interface that could later be lifted into the real codebase — the shape the question demands:

- **Pure reducer** `(state, action) => state` — discrete events over a single value
- **Explicit state machine** — when "which actions are even legal now" is part of the question
- **Set of pure functions** over plain data — when there's no current state, just transformations

Keep it pure: no I/O, no terminal code inside the module. The shell imports it; nothing flows the other way. This module is the only part with a life after the verdict — and even it re-enters the codebase through the approved design, not by direct promotion.

### 4. Build the smallest interactive shell

On every action: clear the screen, re-render one full frame — current state pretty-printed (one field per line), then keyboard shortcuts at the bottom (`[a] add  [u] undo  [q] quit`). Read one keystroke, dispatch to the module, re-render. The whole frame fits on one screen. Scripted case-runs may exist alongside as a warm-up, but the interactive shell is the deliverable.

### 5. One command to run

Wire it into the project's existing task runner (`package.json` script, `Makefile`, `justfile`). Hand the user the command.

### 6. The user drives

The interesting moments are "wait, that shouldn't be possible" and "huh, I assumed X" — bugs in the *idea*, which are the whole point. Add actions on request; prototypes evolve. Do not pre-empt this step by reporting your own conclusions as the verdict.

### 7. Capture

Follow Capture in [SKILL.md](SKILL.md). The validated module shape informs the design doc; the module itself and its shell ride to the `prototype/<slug>` branch.

## Anti-patterns

- **Tests** — a prototype that needs tests is no longer a prototype
- **Real database** — in-memory unless persistence IS the question
- **Generalizing** — no "what if we later want X"; one question
- **Logic bleeding into the shell** — a reducer that calls `console.log` is no longer portable
- **Promoting the shell** — it's tuned for hand-driving, not production
