# Pre-dispatch conflict scan

Part of `razorback:subagent-driven-development` Step 1. Read it before Task 1 is dispatched.

Before dispatching Task 1, scan the plan once for conflicts: tasks that contradict each other or the plan's Global Constraints, requirements treated as defects, self-contradictions. The scan's output is a table, not a verdict:

- one row for every pair of tasks that share a file or an interface (what one produces against what the other consumes, and what you found);
- one row for every task checking its own internal agreement (tests specified against code specified, files created vs touched).

Write the table to the ledger. A plan whose tasks share nothing gets the single line `Pre-flight: no shared interfaces`.

Rule on every conflict found before execution begins. The spec is the binding authority and the plan is its argument. Record each ruling in the ledger beside its row as a `Ruling:` line with what it costs if wrong.
