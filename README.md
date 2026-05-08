# MyBoard

A personal canvas for everything on your mind — questions, sparks, errands, plans.
One board, all yours. Drag panels in, drag them around, let it grow with you.

> Rebranded from Gnists ✦. Same engine, new face.

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

## Design system

MyBoard's visual direction is light, paper-and-ink, with sage as the brand
accent and coral reserved for "now / urgent". The two accents share matched
chroma and lightness (oklch L 0.68 / C 0.08) so they sit together quietly.

- **Display & headlines**: Instrument Serif (italic for emphasis)
- **UI & body**: Geist
- **Meta & code**: Geist Mono
