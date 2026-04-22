# Blocker Taxonomy

Reference for autonomous execution: what counts as a real stop-and-report blocker versus a decide-and-log judgment call. Linked from execution skills (`executing-plans`, `subagent-driven-development`) so the taxonomy stays DRY.

A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. If a reasonable path exists, take it and log the choice.

## Real blockers (stop and report)

1. **Credentials / auth / env broken** — a required command fails on environmental grounds (missing token, unreachable service, wrong toolchain version) and the plan doesn't say how to recover.
2. **Destructive action not authorized by the plan** — deleting data, force-pushing, dropping tables, running a migration in prod, or any irreversible action outside the plan's explicit scope.
3. **Plan-contradicting data** — codebase reality contradicts a load-bearing plan assumption in a way that invalidates the approach (e.g. plan says "modify X", but X was replaced last week and the plan's strategy no longer applies).
4. **Safety-critical ambiguity** — two plausible interpretations with non-trivial cost if chosen wrong (security boundary, data integrity, billing, auth flow), AND the plan doesn't disambiguate.
5. **Unresolvable test failures** — repeated fix attempts do not converge, the failure is not explained by a plan-level issue the agent can flag-and-skip, and no further strategy is available.

## Not a blocker (decide + log in the morning report)

- Naming, style, or minor design choices
- A detail the plan doesn't spell out but has an obvious plan-consistent answer
- Non-safety-critical ambiguity — pick the plan-consistent option
- A failing review iteration — retry with reframed context; if still failing, flag the task and continue with others
- An adjacent bug on the path — fix if small, flag if not
- An external reviewer finding the lead judges as false positive — dismiss with reason in the report
- Any situation where a reasonable plan-consistent path exists once the agent reads the code, checks the plan, and makes the call

## Bias rules

- **When in doubt, press on and flag.** A line in the morning report is always cheaper than a false wake-up.
- **Never silently swallow a judgment call.** Every non-obvious decision ends up in the report with file:line + reason.
- **If you can reason your way through it, it is not a blocker.** Take the best plan-consistent path and keep going.
