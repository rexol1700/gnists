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
```

Or with Docker:
```bash
docker compose up
# Open http://localhost:3000
```

## Stack

- **Frontend**: Vanilla JS, no frameworks
- **Backend**: Node.js + Express
- **Database**: SQLite via sql.js (zero native dependencies)
- **Auth**: bcrypt passwords + JWT tokens (7 day sessions)
- **Type**: Instrument Serif + Geist
- **i18n**: Norwegian 🇳🇴 / English 🇬🇧 switcher
