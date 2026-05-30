# Test Credentials — MyBoard

## Pre-registered Test User (free tier)

| Field    | Value         |
| -------- | ------------- |
| Username | `pricetest1`  |
| Password | `testpw`      |

Free-tier user used to exercise the new pricing structure. Starts each test
window with `freeGenerations.used = 0` (resets if you set `ai_gen_count = 0,
ai_gen_period_start = 0` in `/app/data/myboard.db`).

## Driving DB state in tests

The legacy `testuser1` / `pass1234` user mentioned in older docs **no longer
exists** in `/app/data/myboard.db`. Register fresh users via the API instead:

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","password":"mypass"}'
```

To force a user "at the AI limit" (10/10 used) without burning real
generations, stop the server and patch the DB:

```js
// stop frontend supervisor first, then:
const fs = require('fs'); const initSqlJs = require('sql.js');
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync('/app/data/myboard.db'));
db.run("UPDATE users SET ai_gen_count = 10, ai_gen_period_start = ? WHERE username = 'pricetest1'", [Date.now()]);
fs.writeFileSync('/app/data/myboard.db', Buffer.from(db.export()));
// then restart frontend supervisor
```

## Notes

- New users can register through the landing page → "Create your board" with
  any username (3–50 chars, `[a-zA-Z0-9_.-]`) and password (4–128 chars).
- Tokens last 7 days (JWT). Header: `Authorization: Bearer <token>`.
- Auth endpoints: `POST /api/register`, `POST /api/login`.
- Pricing endpoints: `GET /api/billing/status`, `POST /api/billing/checkout`,
  `POST /api/billing/portal`.
- Local dev has Stripe + Anthropic **unconfigured** — `/api/billing/checkout`
  returns 503 (paywall disabled) and `/api/ai` returns 503 after passing
  the free-tier gate. The gate itself is fully exercised.
