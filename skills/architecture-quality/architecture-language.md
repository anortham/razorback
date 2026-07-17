# Architecture Language

Use these terms consistently in Gate Mode, Candidate Mode, and review notes.

- **Module:** anything with an interface and an implementation. A file, class, package, service, or worker prompt can count when the boundary matters.
- **Interface:** everything a caller must know to use the module correctly: types, invariants, ordering, error modes, config, lifecycle, and performance expectations.
- **Implementation:** the code inside a module that satisfies the interface. Internal helpers, storage, and control flow live here.
- **Depth:** leverage at the interface. A deep module hides meaningful behavior behind a smaller interface and fewer caller obligations. A shallow module is the opposite — its interface is nearly as complex as the implementation it hides. Shallow modules are the main deepening targets.
- **Locality:** change, bugs, knowledge, and verification stay in one place instead of spreading across callers.
- **Leverage:** callers get more capability without learning more details.
- **Seam:** the place where a module's interface lives and where change can enter. A deep module may also have internal seams — private to its implementation and its own tests, never part of the caller-facing interface.
- **Adapter:** concrete code that satisfies an interface at a seam, usually translating shapes, protocols, or policies. One adapter at a seam is a hypothesis; a second adapter proves the seam is real.
- **Deletion test:** if deleting a module makes complexity disappear, it was probably pass-through ceremony. If deleting it spreads complexity into callers, it was earning its keep.
- **Test surface:** the caller-facing interface through which behavior should be tested.

The interface is the test surface.
