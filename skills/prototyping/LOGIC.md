# Logic Prototype

A tiny interactive shell (terminal app or single HTML file) that lets whoever renders the verdict drive a state model by hand. For questions about **business logic, state transitions, or data shape**. For "what should this look like", use [UI.md](UI.md).

## Pick the Shell

- **A developer at a terminal** → TUI shell.
- **Anyone else (designer, PM, domain expert) or an async verdict** → one self-contained HTML file: plain HTML/CSS/JS, no build, no server, opens by double-click, survives being emailed.

Same pure module under either; only the disposable shell differs.

## Process

1. **State the question.** One paragraph at the top of the entry file: the state model under test and the question it must answer.
2. **Match the host project.** Its language, runtime, and task runner; no new package managers. Orient with Miller (`context` on the area, `inspect` the neighboring module) so labels use the project's domain vocabulary. The HTML shell is the one language exception; the vocabulary rule still applies.
3. **Isolate the logic in a portable module** behind a small pure interface: a reducer `(state, action) => state` for discrete events; an explicit state machine when "which actions are legal now" is the question; pure functions over plain data when there is no current state. No I/O, terminal, or DOM code inside. The shell imports it; nothing flows back. Even this module re-enters the codebase through the approved design, never by promotion.
4. **Build the smallest interactive shell.**
   - TUI: on every action clear the screen and render one full frame: state pretty-printed one field per line, shortcuts at the bottom (`[a] add  [u] undo  [q] quit`). Read one keystroke, dispatch, re-render.
   - HTML: one file, everything inline, every label in domain language. Top to bottom: the question (visible title + paragraph), a state panel of labelled fields re-rendered after every click, free-play controls (one button per action, any order), and guided walkthrough tabs (one named scenario each: what to watch for plus the ordered controls; starting one resets to a known state). Pick scenarios that hit the awkward cases: happy path, a tricky edge, an action that should be illegal.
   Scripted case-runs may exist as a warm-up; the interactive shell is the deliverable.
5. **One command to run.** TUI: wire into the project's task runner and hand over the command. HTML: the file is the command.
6. **The user drives.** The interesting moments are "that shouldn't be possible" and "huh, I assumed X". Add actions on request. Do not report your own conclusions as the verdict.
7. **Capture** per [SKILL.md](SKILL.md). The validated module shape informs the design doc; module and shell ride to the `prototype/<slug>` branch.

## Anti-patterns

- Tests: a prototype that needs tests is no longer a prototype
- Real database: in-memory unless persistence IS the question
- Generalizing: one question, no "what if we later want X"
- Logic bleeding into the shell: a reducer that calls `console.log` or touches `document` is no longer portable
- Framework, bundler, or server under the HTML shell
- Promoting the shell: it is tuned for hand-driving, not production
