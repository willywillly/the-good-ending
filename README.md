# Golden

A daily ritual app. It tells you the best nearby spot to watch tonight's sunset, the exact time to be there (golden hour start, not sunset), and builds a personal wind-down playlist from your Spotify listening history.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Prisma** + Vercel Postgres
- **NextAuth** (Spotify OAuth)
- **SunCalc** (solar position math)
- **Open-Meteo** (weather, no API key needed)
- **Google Places API** (nearby viewpoints)
- **Claude** (`@anthropic-ai/sdk`) — spot ranking, nightly message, playlist sequencing
- **web-push** — PWA push notifications

## Setup

### 1. Copy env vars
```bash
cp .env.example .env.local
```
Fill in all values in `.env.local`.

### 2. Generate VAPID keys
```bash
npx web-push generate-vapid-keys
```
Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same as public key) to `.env.local`.

### 3. Spotify App
Go to [developer.spotify.com](https://developer.spotify.com) and add these redirect URIs:
- `http://localhost:3000/api/auth/callback/spotify`
- `https://your-vercel-url.vercel.app/api/auth/callback/spotify`

### 4. Database
After adding `POSTGRES_URL` to `.env.local`:
```bash
npx prisma db push
```

### 5. Run locally
```bash
npm run dev
```

## Deployment

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add all env vars in Vercel → Project → Settings → Environment Variables
4. Add Vercel Postgres from the Storage tab (auto-populates DB vars)
5. Add your Vercel URL as Spotify redirect URI

The cron job in `vercel.json` runs hourly and fires push notifications ~60 min before golden hour.
