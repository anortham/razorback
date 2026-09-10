# Visual Companion Guide

Browser companion for mockups, diagrams, and visual options. Decide per question: browser when the content itself is visual (mockups, architecture diagrams, side-by-side comparisons, look-and-feel, state machines as diagrams); terminal when the answer is words (requirements, scope, conceptual A/B/C, tradeoffs, technical decisions). "What kind of wizard do you want?" is terminal; "Which of these wizard layouts feels right?" is browser.

## How It Works

The server watches `screen_dir` and serves the newest HTML file. The user clicks to select options; clicks land in `state_dir/events` for your next turn. A file starting with `<!DOCTYPE` or `<html` is served as-is (helper script injected); anything else is wrapped in the frame template (header, theme CSS, selection indicator, interaction). **Write content fragments by default.**

## Starting a Session

```bash
scripts/start-server.sh --project-dir /path/to/project
# {"type":"server-started","port":52341,"url":"http://localhost:52341",
#  "screen_dir":".../.razorback/brainstorm/<session>/content",
#  "state_dir":".../.razorback/brainstorm/<session>/state"}
```

- Save `screen_dir` and `state_dir`; tell the user to open the URL. The same JSON is in `$STATE_DIR/server-info` if you did not capture stdout.
- Always pass `--project-dir` so mockups persist in `.razorback/brainstorm/`; without it they go to `/tmp`. Remind the user to gitignore `.razorback/`.
- Windows: the script runs in the foreground; run the command in the background and read `server-info` next turn. Codex: the script detects `CODEX_CI` and switches to foreground; no flags needed. Other environments that reap detached processes: `--foreground` plus your platform's background mechanism.
- URL unreachable (remote/container): add `--host 0.0.0.0 --url-host localhost`.

## The Loop

1. Check `$STATE_DIR/server-info` exists and `$STATE_DIR/server-stopped` does not; otherwise restart (the server exits after 30 idle minutes). Write a new file in `screen_dir` with the Write tool, never cat/heredoc. Semantic names, never reused: `layout.html`, `layout-v2.html`.
2. End your turn: repeat the URL, summarize what is on screen, ask for terminal feedback ("Click to select an option if you'd like").
3. Next turn: read `$STATE_DIR/events` (JSON lines, cleared on each new screen) and merge with the terminal text. Terminal text is primary; the click sequence shows exploration and hesitation. No file = no browser interaction.
4. Iterate on the current screen until validated, then advance.
5. When the next step is terminal-only, push a waiting screen so stale choices do not linger:
   ```html
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">Continuing in terminal...</p>
   </div>
   ```

## Content Fragments

No `<html>`, CSS, or `<script>`; the frame provides them. Frame classes:

```html
<h2>Which layout works better?</h2>
<p class="subtitle">Consider readability and visual hierarchy</p>

<div class="options">  <!-- add data-multiselect for multiple picks -->
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content"><h3>Single Column</h3><p>Clean, focused reading</p></div>
  </div>
</div>

<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- mockup --></div>
    <div class="card-body"><h3>Name</h3><p>Description</p></div>
  </div>
</div>

<div class="split">
  <div class="mockup"><div class="mockup-header">Preview: A</div><div class="mockup-body"><!-- html --></div></div>
  <div class="mockup"><!-- right --></div>
</div>

<div class="pros-cons">
  <div class="pros"><h4>Pros</h4><ul><li>Benefit</li></ul></div>
  <div class="cons"><h4>Cons</h4><ul><li>Drawback</li></ul></div>
</div>

<div class="mock-nav">Logo | Home | About</div>
<div style="display:flex"><div class="mock-sidebar">Nav</div><div class="mock-content">Main</div></div>
<button class="mock-button">Action</button>
<input class="mock-input" placeholder="Input">
<div class="placeholder">Placeholder area</div>
```

Typography: `h2` page title, `h3` section, `.subtitle`, `.section` (block with margin), `.label` (small uppercase).

Events format: `{"type":"click","choice":"a","text":"Option A - Simple Layout","timestamp":1706000101}`.

## Design Tips

- Scale fidelity to the question: wireframes for layout, polish for polish questions.
- State the question on each page; 2-4 options per screen.
- Real content when it matters (a portfolio needs real images); placeholder content hides design issues.

## Cleaning Up

`scripts/stop-server.sh $SESSION_DIR`. Project-dir sessions keep their mockups; only `/tmp` sessions are deleted.

Reference: `scripts/frame-template.html` (CSS), `scripts/helper.js` (client).
