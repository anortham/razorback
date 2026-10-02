# Claude Programmatic Billing

**Applies to:** `claude -p`, Agent SDK, GitHub Actions, third-party harnesses.

## The split

Claude subscriptions bill usage from two pools:

| Usage type | Draws from | Cap |
|---|---|---|
| Interactive (chat, `claude` in a terminal without `-p`, IDE, desktop) | General subscription pool | Soft (weekly limits + 5-hour rolling window) |
| Programmatic (`claude -p`, Agent SDK, GitHub Actions, third-party agents) | **Agent SDK Credits** | Hard (fixed monthly credit, metered at API rates) |

## Credit amounts (monthly, no rollover)

- **Pro:** $20
- **Max 5x:** $100
- **Max 20x:** $200
- **Team Premium:** $100/seat
- **Enterprise Premium:** $200/seat

## Constraints

- Unused credits expire at the end of each month.
- When the credits run out, programmatic usage stops unless "extra usage" billing is enabled at standard API rates.
- Interactive usage is not affected; it still draws from the subscription pool.

## What this means for the review recipes

- Every `claude -p` review draws from Agent SDK Credits at API rates.
- `--max-budget-usd` only limits API overage on OAuth subscriptions, not subscription usage. Razorback's review recipes do not set it: a dollar cap truncates a review and costs more in missed findings than it saves.

## Old patterns

<details>
<summary>Before the Agent SDK Credits split (live 2026-06-15)</summary>

`claude -p` drew from the general subscription pool, so it cost nothing extra within plan limits.
</details>
