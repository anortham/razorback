# Claude Programmatic Billing Context

**Effective:** June 15, 2026
**Applies to:** `claude -p`, Agent SDK, GitHub Actions, third-party harnesses

## The Split

Anthropic split Claude subscription usage into two pools:

| Usage Type | Draws From | Capped? |
|---|---|---|
| Interactive (chat, `claude` in terminal without `-p`, IDE, desktop) | General subscription pool | Soft (weekly limits + 5hr rolling) |
| Programmatic (`claude -p`, Agent SDK, GitHub Actions, third-party agents) | **Agent SDK Credits** | Hard (fixed monthly credit at API rates) |

## Credit Amounts (monthly, non-rollover)

- **Pro:** $20
- **Max 5x:** $100
- **Max 20x:** $200
- **Team Premium:** $100/seat
- **Enterprise Premium:** $200/seat

## Key Constraints

- Credits are **use-it-or-lose-it** — no rollover month-to-month
- Once exhausted, programmatic usage stops unless "extra usage" billing is enabled at standard API rates
- Interactive usage is **not affected** — still draws from subscription pool
- Credits are billed at API rates ($3/M input, $15/M output for Sonnet), so $200 is ~13M input tokens or ~2.6M output tokens

## Historical Context

- **April 2026:** Anthropic banned third-party harnesses (OpenClaw, Conductor)
- **May 13, 2026:** Announced Agent SDK Credits as replacement
- **June 15, 2026:** Change goes live

## What This Means for Skill Usage

- Pre June 15: `claude -p` draws from subscription — effectively "free" within plan limits
- Post June 15: `claude -p` draws from Agent SDK Credits — metered at API rates
- `--max-budget-usd` only limits API overage on OAuth subscriptions, not subscription usage
