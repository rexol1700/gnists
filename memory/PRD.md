# MyBoard — Pricing Refactor (Free Tier + Once-Per-User Trial)

## Original problem statement (Jan 30, 2026)

> Alter the pricing structure of my app. There should be a free option that
> includes 10 ai generations a month. Can still keep the 10kr for the first
> 30 days and then 70kr a month. But they don't lose anything if payment
> fails later, their subscription just downgraded to free tier.

## Source

- Repo: https://github.com/rexol1700/gnists (a.k.a. MyBoard, live at https://myboard.org)
- Stack: Node.js + Express + sql.js (SQLite), bcrypt+JWT auth, Anthropic Haiku 4.5,
  Stripe paywall. Vanilla JS frontend in `/app/public`.

## Pricing model (after this change)

| Tier              | Cost                                   | Limits |
|-------------------|----------------------------------------|--------|
| **Free**          | 0 kr forever                           | 10 AI generations / rolling 30 days, full app otherwise |
| **Trial (new)**   | 10 NOK / €0.85 for the first 30 days   | Unlimited AI |
| **Paid (after)**  | 70 NOK / €5.95 per month               | Unlimited AI (soft EUR budget €4/mo) |

### User choices captured
- Free 30-day window starts on the user's **first AI generation** (not signup)
- Existing paid users keep paid access until **end of current billing period**, then downgrade to free (no data loss)
- When a free user hits 10/10 → toast + non-blocking upgrade view (app stays usable)
- Intro trial price (NOK 10 / €0.85 for 30 days) is **once per user** — sticky `has_used_trial` flag, returning users see the regular monthly price only
- Payment provider: **Stripe** (already wired)

## Architecture

- **Backend** (`/app/server/index.js`, single file)
  - New DB columns (idempotent migration): `ai_gen_count`, `ai_gen_period_start`, `has_used_trial`
  - `isPaid(user)` — replaces `hasAccess()`. True for `grandfathered | trialing | active | (past_due in grace)`
  - `freeGenState(userId)` / `freeGenRecord(userId)` — rolling 30-day counter, lazy window start
  - `requireActiveSubscription` middleware **removed** from all `/api/data`/`/api/tasks` routes — free users have full app access
  - `/api/ai` two-tier gate: paid users hit the EUR budget; free users hit the 10-gen cap (returns 402 `code: 'free_limit_reached'`)
  - `/api/billing/status` now returns `{ tier, isPaid, canTrial, freeGenerations: {used, limit, remaining, resetAtMs}, ... }`
  - `/api/billing/checkout` branches on `canTrial`: trial-eligible = setup price + 30-day trial; trial-used = monthly price only
  - `applySubscriptionToUser` sets `has_used_trial=1` whenever it sees trialing/active/past_due

- **Frontend** (`/app/public`)
  - Login/register/onboarding no longer paywall-block — users land on the home board immediately on the free tier
  - `paywallView.js` is now a **non-blocking upgrade view** with a "Back to board" exit. Trial-eligible card vs. no-trial card branches on `billing.canTrial`. NaN-guarded
  - Account menu shows "Free plan" + "X / 10 AI generations used" + sage-green "Upgrade · unlimited AI" CTA
  - `aiErrorToast` handles the new `free_limit_reached` code: shows the toast and auto-opens the upgrade view after 600ms
  - New i18n strings (EN + NO): `ai_free_limit_reached`, `paywall_free_note`, `paywall_btn_no_trial`, `paywall_back_to_board`, `paywall_no_trial_note`, `account_status_free`, `account_free_usage`, `account_upgrade`

## What's implemented (Jan 30, 2026)

- ✅ Free-tier 10 generations / 30 rolling days enforced server-side, surfaces 402 with structured payload
- ✅ Once-per-user intro trial flag (`has_used_trial`) — Checkout omits trial + setup price for returning users
- ✅ Payment-failed → downgrade to free path (no explicit migration; `isPaid()` returns false after Stripe transitions past `period_end`)
- ✅ Backend `/api/billing/status` returns new `tier`, `freeGenerations`, `canTrial` shape; legacy `hasAccess` kept as always-true for backwards-compat
- ✅ Non-blocking upgrade view (frontend), reachable from the AI nudge and the account menu
- ✅ Account menu shows free-tier counter + upgrade CTA for free users; "Manage subscription" + "Cancel subscription" for paid users
- ✅ AI errors mapped to user-facing toasts (`free_limit_reached` vs `ai_budget_exceeded`)
- ✅ DB migration is idempotent; tested via supervisor restart
- ✅ Manual + testing-agent verification: backend 12/12 tests pass, frontend test-IDs (`account-upgrade-btn`, `account-tier-label`, `account-free-usage`, `paywall-free-note`, `paywall-checkout-btn`, `upgrade-close-btn`) all wired

## Backlog (P1 → P2)

- **P1** Add a dev-only test endpoint to bump `ai_gen_count` for E2E testing of the 402 path without burning real generations (called out by the testing agent — currently only exercisable via direct sql.js writes)
- **P2** Customer Portal: surface `cancel_at_period_end` + the actual period-end date in the account menu so users know exactly when they downgrade
- **P2** Track abandoned-checkout funnel (`checkout.session.expired` webhook → re-engagement email — needs email integration)
- **P2** Per-currency trial-redemption: today the `has_used_trial` flag is global; could be per-region if we want returning EUR customers to get a fresh NOK trial (unlikely needed)

## Notes for future agents

- DO call `integration_playbook_expert_v2` if extending Stripe (new prices, coupons, webhooks)
- The legacy `hasAccess: true` field in `/api/billing/status` is a backwards-compat shim for older mobile clients (Flutter app at `/app/mobile`). Don't remove without verifying the mobile build
- `requireActiveSubscription` middleware is intentionally **gone** from data routes. If you reintroduce paid-only features in the future, gate them with the new `isPaid()` helper, not by re-adding that middleware globally
- Stripe + Anthropic are unconfigured in the dev container — endpoints return 503 with clear errors. The pricing gate itself runs and is fully exercisable via curl + DB-write helpers (see `/app/memory/test_credentials.md`)
