# Logic Prototype

A tiny interactive shell — terminal app or single HTML file — that lets whoever renders the verdict drive a state model by hand. Right when the question is about **business logic, state transitions, or data shape** — things that look reasonable on paper but only feel wrong once pushed through real cases.

If the question is "what should this look like" — wrong branch, use [UI.md](UI.md).

## Pick the Shell

Keyed to **who renders the verdict**:

- **A developer at a terminal** → the TUI shell (step 4).
- **Anyone else — designer, PM, domain expert — or an async verdict** → a **single self-contained HTML file**: plain HTML/CSS/JS, no build, no server, opens by double-click, survives being emailed.

Same pure module underneath either way; only the disposable shell differs.

## Process

### 1. State the question

One paragraph at the top of the prototype's entry file or README: the state model under test and the question it must answer. A prototype answering the wrong question is pure waste.

### 2. Match the host project

Use the project's language, runtime, and task runner. Orient with Miller (`context` on the area, `inspect` the neighboring module) so the prototype uses the project's real domain vocabulary. No new package managers or runtimes. The HTML shell is the one exception on language — always plain HTML/CSS/JS — but the Miller orientation still applies: its labels come from the host project's domain vocabulary.

### 3. Isolate the logic in a portable module

Put the logic that answers the question behind a small pure interface that could later be lifted into the real codebase — the shape the question demands:

- **Pure reducer** `(state, action) => state` — discrete events over a single value
- **Explicit state machine** — when "which actions are even legal now" is part of the question
- **Set of pure functions** over plain data — when there's no current state, just transformations

Keep it pure: no I/O, no terminal or DOM code inside the module. The shell imports it; nothing flows the other way. This module is the only part with a life after the verdict — and even it re-enters the codebase through the approved design, not by direct promotion.

### 4. Build the smallest interactive shell

**TUI shell.** On every action: clear the screen, re-render one full frame — current state pretty-printed (one field per line), then keyboard shortcuts at the bottom (`[a] add  [u] undo  [q] quit`). Read one keystroke, dispatch to the module, re-render. The whole frame fits on one screen.

**HTML shell.** One file, everything inline, written for a non-developer — every label in **domain language**, not code. Top to bottom:

- **The question** — title plus the paragraph from step 1, visible on the page, not buried in a comment.
- **State panel** — the full state as labeled fields (no raw JSON dump), re-rendered after every click.
- **Free-play controls** — one button per action, always available, any order.
- **Guided walkthroughs** — tabs, one named scenario per tab: a plain-language description of the situation and what to watch for, plus the ordered controls to press. Starting a walkthrough resets to a known state so the scenario runs the same way every time. Pick scenarios that hit the awkward cases — the happy path, a tricky edge, an action that should be illegal.

Either shell: scripted case-runs may exist alongside as a warm-up, but the interactive shell is the deliverable.

### 5. One command to run

TUI: wire it into the project's existing task runner (`package.json` script, `Makefile`, `justfile`) and hand the user the command. HTML: the file is the command — send it or open it; double-click is the whole install.

### 6. The user drives

The interesting moments are "wait, that shouldn't be possible" and "huh, I assumed X" — bugs in the *idea*, which are the whole point. Add actions on request; prototypes evolve. Do not pre-empt this step by reporting your own conclusions as the verdict.

### 7. Capture

Follow Capture in [SKILL.md](SKILL.md). The validated module shape informs the design doc; the module itself and its shell ride to the `prototype/<slug>` branch.

## Anti-patterns

- **Tests** — a prototype that needs tests is no longer a prototype
- **Real database** — in-memory unless persistence IS the question
- **Generalizing** — no "what if we later want X"; one question
- **Logic bleeding into the shell** — a reducer that calls `console.log` or reaches for `document` is no longer portable
- **Framework, bundler, or server under the HTML shell** — one double-clickable file or it isn't shareable
- **Promoting the shell** — it's tuned for hand-driving, not production
