# README accuracy pass + GitHub Pages landing page

**Date:** 2026-08-07
**Status:** approved
**Architecture Quality:** No Architecture Impact — static content plus a README
correction. No module boundaries, interfaces, or runtime code change.

## Goal

Two deliverables, independent of each other:

1. Bring `README.md` back in line with what v0.28.0 actually shipped.
2. Publish a single-page GitHub Pages site that takes a coworker who has
   nothing installed all the way to a working razorback setup.

## Why

v0.28.0 landed 15 tasks across SDD hardening, upstream adoption, and the visual
digest. The README was not updated with it, so it now under-reports the skill
set and never mentions the headline feature. Separately, the user wants to
recommend razorback to coworkers, and a GitHub repo README is a poor first
contact for someone deciding whether to adopt a workflow.

## Part 1 — README accuracy pass

Edit `README.md` in place. Do not restructure it. The README stays the
reference document; the site does not replace it.

### Confirmed drift

| # | Drift | Fix |
|---|-------|-----|
| 1 | `skills/harvesting-debt/` exists but is absent from the Skills table | Add a row |
| 2 | The visual digest is never mentioned; `skills/using-razorback/references/digest-kit.md` is 328 lines and is wired into three read moments | Add a **Visual digest** subsection under Workflow |
| 3 | Prompt Templates table lists 4 prompt files, omits the SDD scripts that v0.28.0 changed | Rename to **Prompt templates and scripts**; add `sdd-workspace`, `task-brief`, `review-package` |
| 4 | `test-driven-development/testing-anti-patterns.md` was replaced by `writing-good-tests.md` | Name `writing-good-tests.md` in the TDD row |
| 5 | `security-review` gained branch-gate scopes and `finishing-a-development-branch` gained 51 lines of ladder changes in v0.28.0 | Refresh both rows to match the shipped skills |

### Verification

Every claim in an edited row must be checked against the skill file it
describes. Read the skill's frontmatter and body before writing its row. Do
not describe a skill from memory.

## Part 2 — the landing page

### Mechanism

Copy the pattern already proven in the Miller repo:

- Hand-written static files under `docs/site/`.
- `.github/workflows/pages.yml` deploys with `actions/upload-pages-artifact`,
  triggered on pushes to `main` that touch `docs/site/**` or the workflow
  itself.
- `docs/site/.nojekyll` disables Jekyll processing.

No build step, no framework, no runtime dependency. This preserves razorback's
"pure-content plugin" property: nothing about the site changes what a plugin
user installs.

Only `docs/site` is uploaded, so `docs/plans/` and `docs/specs/` stay
unpublished.

### Files

| Path | Contents |
|------|----------|
| `docs/site/index.html` | The whole landing page |
| `docs/site/style.css` | Page styles, light and dark |
| `docs/site/script.js` | Install-tab switching only |
| `docs/site/404.html` | Minimal not-found page linking home |
| `docs/site/.nojekyll` | Empty file |
| `docs/site/assets/razorback-small.svg` | Copied from `assets/` |
| `.github/workflows/pages.yml` | Deploy workflow |

### Look

Structural CSS follows the Miller site's conventions — the same section rhythm
and declarative sentence headings — so the two sites read as a family. The
palette is razorback's own, taken from `assets/razorback-small.svg`:

| Token | Light | Role |
|-------|-------|------|
| `--accent` | `#B31B1B` | Crimson, from the logo |
| `--ink` | `#141418` | Near-black, from the logo |
| `--bg` | `#FFF4E0` warm-neutral derivative | Page ground |

The page must support light and dark. Define the full light palette on bare
`:root`, then redefine only the changed tokens under
`@media (prefers-color-scheme: dark)`. Give `body` an explicit background.

### Sections, in order

1. **Hero** — name, one-line claim, current version, GitHub link.
2. **Why** — the re-discovery token burn, then the three answers: Miller-first
   for every worker, delegated execution with inline lead review, autonomous
   plan runs.
3. **The workflow** — brainstorm, plan, TDD, execute, review, finish; plus the
   execution fork between `subagent-driven-development`, `executing-plans`, and
   `fixing-small-issues`.
4. **Skills** — all 26 skills grouped into families. Not a 26-row table.
5. **The visual digest** — the v0.28.0 differentiator, with a small sample
   rendered inline using the digest kit's own component classes.
6. **Setup** — one ordered path for a coworker who has nothing: Node.js,
   Miller, Goldfish, razorback. Harness-specific commands sit in tabs
   (Claude Code, Codex CLI / ChatGPT desktop app, OpenCode). The Copilot
   instruction-tier path and the frozen-Cursor note sit below the tabs, not in
   them.
7. **Honest limits** — Miller and Goldfish are mandatory; the harness tier
   table.
8. **Footer** — MIT license, Superpowers credit.

### Content rules

- Every install command on the page must be copied from a source of truth in
  this repo (`README.md`, `.codex/INSTALL.md`, `.opencode/INSTALL.md`) or from
  the Miller README's quickstart. Do not invent commands.
- The skill list must match `skills/` exactly. Count it, do not recall it.
- The version shown in the hero must match `package.json`.
- No external network fetches: no CDN, no web font, no remote image. The logo
  is a local SVG.
- No inline event-handler attributes. `script.js` is the only script.

## Acceptance criteria

### Part 1 — README

- [ ] `harvesting-debt` appears in the Skills table with an accurate purpose
- [ ] A **Visual digest** subsection exists under Workflow, naming
      `digest-kit.md` and the three read moments that emit a digest
- [ ] The templates table is renamed and lists `sdd-workspace`, `task-brief`,
      and `review-package` with accurate purposes
- [ ] The TDD row names `writing-good-tests.md`
- [ ] The `security-review` and `finishing-a-development-branch` rows match
      their current skill files
- [ ] Every skill directory under `skills/` has exactly one row in the table
- [ ] `npm test` passes

### Part 2 — site

- [ ] `docs/site/index.html` renders all eight sections in order
- [ ] The page is fully self-contained: no request leaves the origin
- [ ] Light and dark both render with readable contrast; `body` has an
      explicit background in both
- [ ] The page does not scroll horizontally at 360px width; wide blocks scroll
      inside their own container
- [ ] Install tabs switch with `script.js`; with JavaScript disabled the
      first tab's commands are still visible
- [ ] The setup section covers Node.js, Miller, Goldfish, and razorback in
      that order
- [ ] Every command on the page matches a source of truth in this repo or the
      Miller README
- [ ] The hero version matches `package.json`
- [ ] `.github/workflows/pages.yml` triggers only on `docs/site/**` and itself,
      and uploads only `docs/site`
- [ ] `docs/site/.nojekyll` exists
- [ ] `npm test` passes

## Out of scope

- A generated per-skill reference. The user chose a landing page only.
- A custom domain.
- Any change to skill content, hooks, or manifests.

## Requires a human

GitHub Pages source must be set to **GitHub Actions** in the repository
settings. The workflow cannot deploy until that is done, and an agent cannot
change it.
