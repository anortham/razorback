# UI Prototype

Several **structurally different** UI variants on a single route, switchable in the browser. The user flips between them, picks one (or steals bits from each), and the verdict goes back through brainstorming.

If the question is about logic or state — wrong branch, use [LOGIC.md](LOGIC.md).

## Embed in the real app (strongly preferred)

A variant is judged against real surroundings — actual header, sidebar, data density. An empty new route is a vacuum: every variant looks fine in isolation.

- **Existing page (default):** render variants on the existing route, gated by a `?variant=` search param. Existing data fetching, params, and auth stay; only the rendered subtree swaps. A component that *would* live inside an existing page still counts — mount the variants inside that page.
- **New page (last resort):** only when there is genuinely no host page. Follow the project's routing convention and put `prototype` in the path or filename. Same `?variant=` pattern.

## Process

### 1. State the question and pick N

Default **3 variants**, cap at 5. Write the plan in one line at the top of the switcher file: "Three variants of <page>, switchable via `?variant=`, on <route>."

### 2. Generate radically different variants

Orient with Miller first (`inspect` the host page, find the project's component library). Each variant: uses the page's real purpose and data, the project's styling system, and a clear exported name (`VariantA` …). Variants must differ in **structure** — layout, information hierarchy, primary affordance — not color or copy. Two drafts too similar? Redo one with an explicit constraint ("no card grid").

### 3. Wire a switcher

One switcher component on the route renders the variant named by `?variant=` (default `A`) plus a floating bottom bar: prev/next arrows, `B — Sidebar layout` label. Arrows update the URL via the framework's router so variants are shareable and reload-stable; `←`/`→` keys also cycle (not when an input is focused). Style the bar so it's obviously not part of the design under evaluation, and gate it out of production builds (`NODE_ENV !== 'production'` or equivalent) so a stray merge can't ship it.

### 4. Mock data honestly, mutate nothing

Read-only against real data is ideal. Otherwise a fixed mock dataset frozen at a constant clock, so frames stay comparable. Mutations point at stubs — the question is "what should this look like," not "does the backend work."

### 5. The user flips

Hand over the URL and the variant keys. The best feedback is "the header from B with the sidebar from C" — that composite IS the design. Adjust variants on request.

### 6. Capture

Follow Capture in [SKILL.md](SKILL.md). The verdict (winning variant or composite, and why) goes into the design doc; the full variant set and switcher ride to the `prototype/<slug>` branch — including the losers, which document what was rejected. The winner is rebuilt properly through the approved design, not promoted as-is: it was written under prototype constraints.

## Anti-patterns

- **Variants differing only in color/copy** — that's a tweak, not a prototype
- **Shared layout between variants** — a shared `<Header>` is fine; a shared `<Layout>` defeats the point
- **Wiring variants to real mutations**
- **Promoting prototype code directly to production**
