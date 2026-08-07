# Digest Kit

The component kit for razorback's visual digest — a model-authored,
information-dense, single-file HTML view of a plan, design doc, or morning
report. Skills that generate digests load this file for the layout contract,
the CSS, and the authoring rules. There is no page template: compose the
components below per document.

## Layout contract

Every digest has this shape:

- **Header** — document title, one-line goal, and the progress figure: the
  hero number with a meter under it. Exactly one hero figure per digest.
- **Timeline spine** (the main view) — one stage per batch/phase, with its
  completion state shown on the stage dot and its chip. Inside each stage,
  task rows in execution order: status word + task + one-line note. Inline
  warning-flag callouts sit at the exact point in the timeline where a
  criterion was revised or a judgment call was recorded. A "you are here"
  marker sits on the active task.
- **Tabs** beside Timeline:
  - **Decisions** — one card per ruling: what was found, what landed, what
    must not be undone.
  - **Guardrails** — the never-touch list, the held-constant list, and the
    verification gates.
- **Footer** — links the canonical markdown document.

Completed documents keep the same shape; the timeline is fully settled —
every stage done, no "you are here" marker.

### Component patterns

Minimal semantic HTML per component. Wrap the whole digest body in
`<section class="digest">`.

Status chip — icon + label, never color alone. States: `done` ✓, `inprogress`
◐, `queued` ○, `revised` ⚠ (label "Done, revised"):

```html
<span class="chip done"><span class="ico">✓</span>Done</span>
```

Header with the hero figure:

```html
<header>
  <div>
    <h1>Plan title</h1>
    <p class="goal">One-line goal.</p>
  </div>
  <div class="hprog">
    <div class="n">9<small> / 13 tasks</small></div>
    <div class="meter" aria-label="69% complete"><i style="width:69%"></i></div>
  </div>
</header>
```

Tab bar and panes — exactly these three tabs, Timeline first and active:

```html
<nav class="tabs" aria-label="Digest sections">
  <button class="on" data-pane="timeline">Timeline</button>
  <button data-pane="decisions">Decisions</button>
  <button data-pane="rails">Guardrails</button>
</nav>
<div class="pane on" id="timeline">…</div>
```

Stage on the spine — state classes: `done`, `now`, none (upcoming). Task-row
status classes: `done`, `inprogress`, `queued`:

```html
<div class="spine">
  <div class="stage done">
    <h2>Batch A — Name <span class="chip done"><span class="ico">✓</span>3 / 3</span></h2>
    <p class="why">Why this stage runs first.</p>
    <div class="trow"><span class="st done">✓ Done</span>
      <span class="what"><b>1</b>Task name <span>— one-line note</span></span></div>
  </div>
</div>
```

Warning-flag callout, inline at the revision point:

```html
<div class="flag"><b>⚠ Criterion revised — Task 5.</b>
  <p>What changed, and the ruling that landed.</p></div>
```

"You are here" marker, directly before the active task row:

```html
<div class="here">You are here — Task 9 running</div>
```

Decision card (Decisions pane):

```html
<div class="card dec">
  <h3>Ruling title <span class="where">Task 5</span></h3>
  <p>What was found. <b>Landed:</b> what landed. What must not be undone.</p>
</div>
```

Guardrails list (Guardrails pane) — repeat the `h3` + `ul` pair for "Never
touch", "Held constant", and "Verification gates":

```html
<div class="rail">
  <h3>Never touch</h3>
  <ul><li><strong>Item</strong> — why.</li></ul>
</div>
```

Summary card under the timeline, and the footer:

```html
<div class="card remains"><b>Remaining:</b> what is left, in one or two sentences.</div>
<footer>Digest of <a href="the-document.md">the full plan</a></footer>
```

## Kit CSS

Copy this block whole into each digest's `<head>`.

```html
<style>
  :root {
    color-scheme: light;
    --page:      #f9f9f7;
    --surface:   #fcfcfb;
    --ink:       #0b0b0b;
    --ink-2:     #52514e;
    --muted:     #898781;
    --hairline:  #e1e0d9;
    --border:    rgba(11,11,11,0.10);
    --accent:    #2a78d6;
    --accent-track: #cde2fb;
    --good:      #0ca30c;
    --good-text: #006300;
    --warning:   #fab219;
    --serious:   #ec835a;
    --critical:  #d03b3b;
    --good-wash:    rgba(12,163,12,0.09);
    --warn-wash:    rgba(250,178,25,0.14);
    --accent-wash:  rgba(42,120,214,0.10);
    --muted-wash:   rgba(137,135,129,0.10);
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --page:      #0d0d0d;
      --surface:   #1a1a19;
      --ink:       #ffffff;
      --ink-2:     #c3c2b7;
      --muted:     #898781;
      --hairline:  #2c2c2a;
      --border:    rgba(255,255,255,0.10);
      --accent:    #3987e5;
      --accent-track: #104281;
      --good-text: #0ca30c;
      --good-wash:    rgba(12,163,12,0.16);
      --warn-wash:    rgba(250,178,25,0.14);
      --accent-wash:  rgba(57,135,229,0.16);
      --muted-wash:   rgba(137,135,129,0.14);
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --page:      #0d0d0d;
    --surface:   #1a1a19;
    --ink:       #ffffff;
    --ink-2:     #c3c2b7;
    --muted:     #898781;
    --hairline:  #2c2c2a;
    --border:    rgba(255,255,255,0.10);
    --accent:    #3987e5;
    --accent-track: #104281;
    --good-text: #0ca30c;
    --good-wash:    rgba(12,163,12,0.16);
    --warn-wash:    rgba(250,178,25,0.14);
    --accent-wash:  rgba(57,135,229,0.16);
    --muted-wash:   rgba(137,135,129,0.14);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--page);
    color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .digest { max-width: 860px; margin: 0 auto; padding: 28px 24px; }

  /* Status chips: icon + label, never color alone */
  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; line-height: 1;
    padding: 4px 9px; border-radius: 999px; white-space: nowrap;
  }
  .chip .ico { font-size: 11px; }
  .chip.done       { background: var(--good-wash);   color: var(--good-text); }
  .chip.inprogress { background: var(--accent-wash); color: var(--accent); }
  .chip.queued     { background: var(--muted-wash);  color: var(--ink-2); }
  .chip.revised    { background: var(--warn-wash);   color: var(--ink); }

  /* Meter: track is a lighter step of the fill's own ramp; 4px rounded data end */
  .meter { height: 10px; border-radius: 0 4px 4px 0; background: var(--accent-track); position: relative; overflow: hidden; }
  .meter > i { position: absolute; inset: 0 auto 0 0; background: var(--accent); border-radius: 0 4px 4px 0; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .digest header { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end; margin-bottom: 8px; }
  .digest h1 { font-size: 20px; font-weight: 650; }
  .digest .goal { color: var(--ink-2); font-size: 14px; margin-top: 3px; max-width: 62ch; }
  /* Hero figure / stat tile */
  .digest .hprog { text-align: right; }
  .digest .hprog .n { font-size: 26px; font-weight: 600; }
  .digest .hprog .n small { font-size: 13px; color: var(--muted); font-weight: 500; }
  .digest .hprog .meter { width: 180px; margin-top: 6px; }

  .digest .spine { position: relative; margin-top: 22px; padding-left: 30px; }
  .digest .spine::before { content: ""; position: absolute; left: 9px; top: 6px; bottom: 6px; width: 2px; background: var(--hairline); }
  .digest .stage { position: relative; margin-bottom: 26px; }
  .digest .stage::before {
    content: ""; position: absolute; left: -27px; top: 4px; width: 12px; height: 12px; border-radius: 50%;
    background: var(--surface); border: 2px solid var(--muted);
  }
  .digest .stage.done::before { background: var(--good); border-color: var(--good); }
  .digest .stage.now::before  { background: var(--accent); border-color: var(--accent); }
  .digest .stage h2 { font-size: 15px; font-weight: 650; display: flex; align-items: baseline; gap: 10px; }
  .digest .stage h2 .chip { position: relative; top: -1px; }
  .digest .stage .why { font-size: 13px; color: var(--muted); margin: 1px 0 8px; }
  .digest .trow {
    display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: baseline;
    padding: 6px 0; border-top: 1px solid var(--hairline); font-size: 13.5px;
  }
  .digest .trow:first-of-type { border-top: 0; }
  .digest .trow .st { font-size: 12px; font-weight: 600; }
  .digest .trow .st.done { color: var(--good-text); }
  .digest .trow .st.inprogress { color: var(--accent); }
  .digest .trow .st.queued { color: var(--muted); }
  .digest .trow .what b { color: var(--muted); margin-right: 4px; }
  .digest .trow .what span { color: var(--ink-2); }
  .digest .flag {
    border-left: 3px solid var(--warning); background: var(--warn-wash);
    border-radius: 0 8px 8px 0; padding: 9px 12px; margin: 8px 0; font-size: 13px;
  }
  .digest .flag b { font-weight: 650; }
  .digest .flag p { color: var(--ink-2); margin-top: 2px; }
  .digest .here {
    display: inline-flex; gap: 8px; align-items: center; margin: 2px 0 8px;
    font-size: 12.5px; font-weight: 650; color: var(--accent);
  }
  .digest .here::before { content: "▶"; font-size: 10px; }
  .digest .remains { margin-top: 4px; padding: 12px 16px; font-size: 13.5px; color: var(--ink-2); }
  .digest .remains b { color: var(--ink); }
  .digest footer { margin-top: 14px; font-size: 13px; color: var(--muted); }
  .digest .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--hairline); margin-top: 16px; }
  .digest .tabs button {
    appearance: none; border: 0; background: none; cursor: pointer;
    font: 600 13.5px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--ink-2); padding: 10px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .digest .tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
  .digest .pane { display: none; }
  .digest .pane.on { display: block; }
  .digest .dec { padding: 14px 16px; margin: 12px 0 10px; }
  .digest .dec h3 { font-size: 14px; font-weight: 650; display: flex; gap: 8px; align-items: baseline; }
  .digest .dec .where { font-size: 12px; color: var(--muted); font-weight: 500; }
  .digest .dec p { font-size: 13.5px; color: var(--ink-2); margin-top: 4px; }
  .digest .dec p b { color: var(--ink); }
  .digest .rail h3 { font-size: 13px; font-weight: 650; margin: 14px 0 6px; }
  .digest .rail li { margin: 0 0 7px 18px; font-size: 13.5px; color: var(--ink-2); }
  .digest .rail li strong { color: var(--ink); font-weight: 600; }
</style>
```

### Tab toggle

The only script a digest carries — place it at the end of `<body>`:

```html
<script>
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("on"));
      document.querySelectorAll(".pane").forEach(p => p.classList.remove("on"));
      btn.classList.add("on");
      document.getElementById(btn.dataset.pane).classList.add("on");
    });
  });
</script>
```

## Authoring rules

- The digest is a view, not a transcript. Every sentence earns its place.
- Decisions, status, blockers, and acceptance criteria go in. Detail stays in
  the markdown and is linked from the digest.
- Agents never read the HTML. The markdown stays canonical — regenerate the
  digest from it, never the reverse.
- The digest is one self-contained file: sibling basename (`<name>.html` next
  to `<name>.md`), same git fate as its markdown — committed, moved, and
  deleted together.
- Inline the kit CSS above into each digest. No external fetches, no
  libraries; the tab toggle is the only script.
- Exactly one hero figure per digest.
