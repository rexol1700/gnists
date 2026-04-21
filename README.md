# Gnists ✦

A personal learning board — capture sparks of curiosity before they disappear.
Collect interests, questions, goals, keywords and tasks. All data is saved per user on the server.

## Deploy on Coolify

1. Push this repo to GitHub
2. In Coolify: **New Resource → Git Repository → Dockerfile**
3. Set environment variable:
   ```
   JWT_SECRET=some-long-random-string-here
   ```
4. Add a **persistent volume** — this is critical, keeps your database across deploys:
   - Destination: `/app/data`
5. Deploy — done. Visit your domain and register an account.

## Run locally

```bash
npm install
JWT_SECRET=devsecret node server/index.js
# Open http://localhost:3000
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
- **i18n**: Norwegian 🇳🇴 / English 🇬🇧 switcher
