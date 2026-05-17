# MyBoard

A quiet place for everything on your mind — questions, sparks, errands, plans. One board, all yours.

MyBoard is a personal canvas you grow over time. Capture interests, questions, goals, keywords, tasks, bills, reminders, and more. All data is saved per user on the server.

## Deploy on Coolify

1. Push this repo to GitHub
2. In Coolify: **New Resource → Git Repository → Dockerfile**
3. Set environment variables:
   ```
   JWT_SECRET=some-long-random-string-here
   ANTHROPIC_API_KEY=sk-ant-...   # optional, enables the 🤖 AI buttons
   APP_URL=https://your.domain    # required for Stripe redirects
   # ── Stripe (see "Paywall" section below) ─────────────────────────────
   STRIPE_MODE=test               # 'test' or 'live'. Stays 'test' until you flip it.
   STRIPE_SECRET_KEY_TEST=sk_test_...
   STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
   STRIPE_WEBHOOK_SECRET_TEST=whsec_...
   STRIPE_PRICE_NOK_MONTHLY_TEST=price_...
   STRIPE_PRICE_NOK_SETUP_TEST=price_...
   STRIPE_PRICE_EUR_MONTHLY_TEST=price_...
   STRIPE_PRICE_EUR_SETUP_TEST=price_...
   # When ready for live, also set the _LIVE variants and switch STRIPE_MODE=live.
   ```
4. Add a **persistent volume** — this is critical, keeps your database across deploys:
   - Destination: `/app/data`
5. Deploy — done. Visit your domain and register an account.

## Run locally

```bash
npm install
JWT_SECRET=devsecret ANTHROPIC_API_KEY=sk-ant-... node server/index.js
# Open http://localhost:3000
# ANTHROPIC_API_KEY is optional — without it the 🤖 buttons return 503
# Stripe env vars are optional locally — without them the paywall is bypassed.
```

Or with Docker:
```bash
docker compose up
# Open http://localhost:3000
```

## Paywall (Stripe)

The app charges **NOK 10 (≈ €0.85) for the first 30 days**, then **NOK 70 (≈ €5.95) per month**, cancel any time. Currency is picked by the user (browser locale auto-selects, but they can switch).

Everyone who already had an account before the paywall was deployed is **automatically grandfathered onto free access** (one-time migration on the first server boot after upgrade). Only new signups hit the paywall.

### One-time Stripe setup

You need **four Stripe Price objects per mode** (test + live = 8 prices total). Create them in the Stripe Dashboard → Products:

| Price | Currency | Type | Amount |
|---|---|---|---|
| `STRIPE_PRICE_NOK_MONTHLY_*` | NOK | Recurring (monthly) | 70.00 |
| `STRIPE_PRICE_NOK_SETUP_*`   | NOK | One-time            | 10.00 |
| `STRIPE_PRICE_EUR_MONTHLY_*` | EUR | Recurring (monthly) | 5.95  |
| `STRIPE_PRICE_EUR_SETUP_*`   | EUR | One-time            | 0.85  |

How the trial-like first month works: Checkout starts a subscription with the monthly price + a 30-day trial, plus the one-time setup price billed immediately. Net effect: customer pays the setup amount today, then nothing for 30 days, then the monthly amount every month after that.

### Webhook

Add an endpoint in the Stripe Dashboard → Developers → Webhooks pointing to:

```
https://your.domain/api/stripe/webhook
```

Subscribe to these events (minimum):
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET_TEST` (or `_LIVE`).

For local development, use the Stripe CLI to forward events:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
# Copy the whsec_... it prints into STRIPE_WEBHOOK_SECRET_TEST
```

### Customer Portal

In Stripe Dashboard → Settings → Billing → Customer Portal, enable:
- Cancel subscription (immediately or at period end — your call)
- Update payment method
- View invoices

The app links signed-in subscribers to the portal via the "Manage subscription" button.

### Going live

1. Run a full subscribe → cancel cycle in test mode using card `4242 4242 4242 4242` (any future expiry, any CVC).
2. Create the live-mode prices and webhook in Stripe Dashboard.
3. Set the `_LIVE` env vars.
4. Flip `STRIPE_MODE=live` and redeploy.

If Stripe env vars are missing the paywall is automatically disabled — the app falls back to the previous "open to anyone with a login" behaviour, so a misconfigured deploy doesn't lock anybody out.

## Stack

- **Frontend**: Vanilla JS, no frameworks
- **Backend**: Node.js + Express
- **Database**: SQLite via sql.js (zero native dependencies)
- **Auth**: bcrypt passwords + JWT tokens (7 day sessions)
- **Type**: Instrument Serif + Geist
- **i18n**: Norwegian 🇳🇴 / English 🇬🇧 switcher
