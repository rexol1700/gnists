# Test Credentials — MyBoard

## Pre-registered Test User

| Field    | Value      |
| -------- | ---------- |
| Username | `testuser1` |
| Password | `pass1234`  |

Created on first iteration to exercise the new Calendar + Habit Tracker panels.
The account has no Stripe subscription (paywall is auto-disabled because
billing env vars are not configured), so it has full access to the app.

## Notes
- New users can register through the landing page → "Create your board" with
  any username (3–50 chars, `[a-zA-Z0-9_.-]`) and password (4–128 chars).
- Tokens last 7 days (JWT).
- Auth endpoints: `POST /api/register`, `POST /api/login`.
