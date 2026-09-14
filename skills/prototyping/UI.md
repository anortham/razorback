# UI Prototype

Several **structurally different** UI variants on one route, switchable in the browser. The user flips, picks one (or composes bits of each), and the verdict goes back through brainstorming. For logic or state questions, use [LOGIC.md](LOGIC.md).

## Embed in the Real App

A variant is judged against real surroundings (header, sidebar, data density); an empty route makes every variant look fine.

- **Existing page (default):** render variants on the existing route, gated by `?variant=`. Data fetching, params, and auth stay; only the rendered subtree swaps. A component that would live inside an existing page mounts inside that page.
- **New page (last resort):** only when no host page exists. Follow the routing convention and put `prototype` in the path or filename.

## Process

1. **State the question and pick N.** Default 3 variants, cap 5. One line at the top of the switcher: "Three variants of <page>, switchable via `?variant=`, on <route>."
2. **Generate radically different variants.** Orient with code-kb first (`file_skeleton` the host page, find the component library). Each variant uses the page's real purpose and data, the project's styling system, and a clear exported name (`VariantA`...). Differ in **structure** (layout, information hierarchy, primary affordance), not color or copy. Two too similar? Redo one under an explicit constraint ("no card grid").
3. **Wire a switcher.** One component renders the variant named by `?variant=` (default `A`) plus a floating bottom bar: prev/next arrows and a `B — Sidebar layout` label. Arrows update the URL via the router (shareable, reload-stable); `←`/`→` cycle unless an input is focused. Style the bar so it is obviously not part of the design, and gate it out of production builds (`NODE_ENV !== 'production'` or equivalent).
4. **Mock data honestly, mutate nothing.** Read-only real data is ideal; otherwise a fixed dataset frozen at a constant clock. Mutations hit stubs.
5. **The user flips.** Hand over the URL and variant keys. "The header from B with the sidebar from C" is the design. Adjust on request.
6. **Capture** per [SKILL.md](SKILL.md). The verdict (winner or composite, and why) goes in the design doc; the full variant set, losers included, rides to the `prototype/<slug>` branch. The winner is rebuilt through the approved design, not promoted as-is.

## Anti-patterns

- Variants differing only in color/copy
- A shared `<Layout>` between variants (a shared `<Header>` is fine)
- Wiring variants to real mutations
- Promoting prototype code to production
