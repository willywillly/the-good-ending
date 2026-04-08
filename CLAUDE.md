# CLAUDE.md — The Good Ending

> This file is the project brain. Read it before touching anything.

---

## Project Vision

**The Good Ending** is a daily ritual app for people who want to actually see the sunset instead of missing it. Not a weather app. Not a calendar. A nudge that says: *here's where to go, here's when to leave, here's what to listen to.*

The emotional experience: calm, intentional, unhurried. Like a friend who quietly notices beautiful things and tells you about them at the right moment. The app should feel like holding warm ceramic — dark backgrounds, amber glows, soft typography, no noise.

**Design language:**
- Deep dark brown background (`#1a0a00`) — not black, not navy, specifically this warm char color
- Amber/orange gradient palette (`amber-100` → `orange-500` → `#c94a12`)
- Monospace font (Geist Mono) for all times and numbers — makes them feel precise, not decorative
- Minimal chrome. No headers, no nav, no tabs. One scroll. One purpose.
- Sun orb illustration on the splash screen with SVG rays that spin at 90s/revolution
- Everything is `max-w-md mx-auto` — designed as a mobile-first PWA

The app is installable as a PWA. Push notifications are a first-class feature, not an afterthought.

---

## What The App Does

**Full user flow:**

1. **Splash / Location Gate** (`LocationPermission`): App opens to a half-sun illustration on a dark background. Asks for GPS. If denied, falls back to city-name geocoding via Open-Meteo's free geocoding API.

2. **Loading** (`LoadingScreen`): Pulsing sun orb, "Reading the sky…" text. Fires in parallel: sunset data + ranked location list.

3. **Main Screen** (single scrollable page):
   - **`SunsetHero`**: Giant monospace time ("be there by"), Claude-written one-sentence message, sunset time, quality score pill (0–100, Excellent/Decent/Marginal).
   - **`GoldenHourBar`**: Golden hour window (start–end), duration in minutes, decorative progress bar.
   - **`SkyStats`**: 2×2 grid — cloud cover %, AQI proxy, visibility in miles, humidity %.
   - **`LocationList`**: Top 3 nearby spots ranked by Claude. Best spot gets highlighted orange. Each card shows name, distance, walk time, Claude's one-sentence reason for the top pick, and a Maps link.
   - **`SpotifyConnect`**: If not authenticated → connect button. If authenticated → shows the sequenced tracklist ("Tonight's Arc") with energy dots. Playlist is fetched once coords + session are both available.
   - **`PushPrompt`**: One-tap push notification subscription. Disappears after subscribed.

4. **`LeaveByBar`** (fixed bottom): Sticky bar with "Leave by [time]" and "Open in Maps" → walking directions to top spot.

5. **If sunset already passed**: Shows tomorrow's sunset automatically. "Tomorrow" label appears under the time.

**Push notification flow**: Vercel cron runs daily at 17:00 UTC. For each stored subscription, checks if golden hour is 55–65 min away. If yes, fetches weather + spots and sends a push. User taps notification → opens app.

---

## Tech Stack & Architecture

| Layer | Tech | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Standard choice; API routes + RSC in one repo |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Auth | NextAuth v4 (Spotify provider) | Handles OAuth dance with minimal config |
| Solar math | SunCalc | Accurate sunset/golden hour/azimuth calculations |
| Weather | Open-Meteo (free, no key) | Cloud cover, visibility, humidity; 30-min cache |
| Places | Google Places API (Nearby Search) | Parks + natural features within 5mi |
| AI | Anthropic Claude (`claude-opus-4-6`) | 3 uses: rank spots, write nightly message, sequence playlist |
| Spotify | Spotify Web API (direct fetch) | Top tracks + audio features for playlist |
| Database | PostgreSQL via Prisma + pg | Stores push subscriptions + session logs |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) | Sliding window limits per route |
| Push | web-push (VAPID) | PWA push notifications |
| PWA | Service worker + Web App Manifest | Installable, push-capable |
| Deployment | Vercel | Cron jobs, serverless functions, Postgres |

**Architecture note**: The entire app is one client-side page (`'use client'`). All API calls go to Next.js Route Handlers. No server components in use currently (page.tsx is fully client). The page fetches data from its own API routes, not directly from external APIs — except one bug (see Current State).

---

## Data Flow

### On load (GPS granted):
```
Browser GPS → coords (lat, lng)
  → Promise.all([
      GET /api/sunset?lat&lng&tz     → solar math (SunCalc) + weather (Open-Meteo) → quality score
      GET /api/locations?lat&lng     → Google Places (parks + natural) → Claude ranks → top 3
    ])
  → If sunset already passed → GET /api/sunset?lat&lng&tz&date=tomorrow
  → Dynamic import lib/claude.writeNightlyMessage() [BUG — see below]
  → If session.accessToken → GET /api/playlist?lat&lng
      → Spotify top 30 tracks (medium_term) + audio features
      → Claude sequences by energy/valence/tempo arc
      → Returns ordered tracks
```

### Quality score algorithm (`lib/score.ts`):
- Cloud cover: 0–40 pts (sweet spot 20–40% partial clouds)
- AQI proxy: 0–25 pts (Good=25, Moderate=15, USG=8, Unhealthy=0)
- Visibility: 0–20 pts (linear, 10mi+ = full 20)
- Humidity: 0–15 pts (20–40% ideal for light scattering)
- **Total: 0–100**. ≥70 = Excellent, ≥40 = Decent, <40 = Marginal

### Spotify OAuth scopes:
- `user-top-read` — needed for top tracks + audio features
- `user-read-private` — required by Spotify for top reads
- `user-read-email` — required by NextAuth for session identity

### GPS / location handling:
- Browser `navigator.geolocation.getCurrentPosition` with 10s timeout
- Fallback: city name → Open-Meteo geocoding API (free, no key) → lat/lng
- Location is never persisted server-side (only stored in push subscriptions)

### Push subscription data stored in DB:
```
endpoint, p256dh, auth, lat, lng, region (often empty string)
```

---

## File & Component Map

### App
- `app/layout.tsx` — Root layout. Sets metadata ("The Good Ending"), PWA meta tags, registers service worker inline, Geist fonts, `#1a0a00` bg.
- `app/page.tsx` — Entire app UI. Client component. Owns all state (coords, sunsetData, locations, playlist, message). Orchestrates all fetches.
- `app/providers.tsx` — Wraps children in `<SessionProvider>` for NextAuth.
- `app/globals.css` — CSS variables (`--background: #1a0a00`, `--foreground: #f5e6d3`), `sun-rays` spin animation.

### API Routes
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (GET + POST).
- `app/api/sunset/route.ts` — GET. Validates coords/tz/date, runs SunCalc + Open-Meteo, returns score + formatted times.
- `app/api/locations/route.ts` — GET. Google Places → Claude ranking → returns top spots.
- `app/api/playlist/route.ts` — GET. Requires Spotify session. Fetches top tracks + audio features, Claude sequences, returns ordered list.
- `app/api/message/route.ts` — POST. Calls `writeNightlyMessage`. **Currently unused by the frontend** (see Current State / bugs).
- `app/api/push/subscribe/route.ts` — POST. Upserts push subscription into DB.
- `app/api/push/send/route.ts` — POST. Manual push trigger, protected by `x-cron-secret` header.
- `app/api/cron/notify/route.ts` — GET. Called by Vercel cron. Iterates all subscriptions, checks timing, sends push if golden hour is 55–65 min away.

### Components
- `components/SunsetHero.tsx` — Hero section. Sun orb, Claude message, "be there by" time (huge mono), score pill, tomorrow label.
- `components/GoldenHourBar.tsx` — Orange card with golden hour window times + decorative progress bar.
- `components/SkyStats.tsx` — 2×2 grid of weather stat cells.
- `components/LocationList.tsx` — Renders top 3 `LocationCard`s, empty state.
- `components/LocationCard.tsx` — Individual spot card. "Best" badge, distance/walk, Claude reason, Google Maps link.
- `components/SpotifyConnect.tsx` — Connect button (unauthenticated) or tracklist with energy dots (authenticated).
- `components/LeaveByBar.tsx` — Fixed-bottom bar. Leave-by time + "Open in Maps" (walking directions deep link).
- `components/PushPrompt.tsx` — Push notification opt-in. Requests permission, subscribes via VAPID, POSTs to `/api/push/subscribe`.
- `components/LocationPermission.tsx` — Splash screen. Animated half-sun SVG, GPS request button, city-name fallback form.

### Lib
- `lib/solar.ts` — `getSolarData()` using SunCalc. Returns sunset, golden hour start/end, window minutes, azimuth in degrees. `formatTime()` with timezone support.
- `lib/weather.ts` — `getWeatherData()` from Open-Meteo. Hourly cloud cover, visibility, humidity. Maps visibility to AQI proxy. 30-min Next.js cache.
- `lib/score.ts` — `computeQualityScore()`. Pure function, 4 inputs → 0–100.
- `lib/places.ts` — `getNearbySpots()`. Two Google Places calls (parks + natural_feature), deduplicates, calculates haversine distance, walk time (3mph × 1.3 path factor), elevation proxy from name keywords. Returns top 10 within 5mi.
- `lib/claude.ts` — Three Claude functions: `rankLocations()` (spots → ranked with reason), `writeNightlyMessage()` (score + top spot → 1 sentence), `sequencePlaylist()` (tracks → ordered IDs). All use `claude-opus-4-6`.
- `lib/spotify.ts` — `getTopTracks()` (top 30 medium-term + audio features batch), `buildSpotifyPlaylistUrl()` (unused currently).
- `lib/auth.ts` — NextAuth config. Spotify provider. JWT callback stores `accessToken` + `refreshToken` + `expiresAt`. Session callback exposes `accessToken`.
- `lib/db.ts` — Prisma singleton via global `__prisma`. Uses `@prisma/adapter-pg` with `pg.Pool`.
- `lib/push.ts` — `sendPushNotification()`, `buildPushMessage()` (3 tiers based on score).
- `lib/security.ts` — Rate limiters (Upstash Redis), `applyRateLimit()`, `checkCORS()`, `validateCoords()`, `validateTimezone()`, `validateDate()`.

### Config & Infra
- `prisma/schema.prisma` — Two models: `PushSubscription` (endpoint, keys, lat/lng, region), `SessionLog` (region, score, spot, map/playlist/fallback flags).
- `public/sw.js` — Service worker. Handles `push` event (shows notification) and `notificationclick` (opens/focuses app).
- `public/manifest.json` — PWA manifest. Name: "The Good Ending", short_name: "Good Ending", theme: `#c94a12`, icons: `/icon-192.png` + `/icon-512.png`.
- `vercel.json` — Cron: `/api/cron/notify` at `0 17 * * *` (daily 5pm UTC).
- `next.config.mjs` — Only config: `serverComponentsExternalPackages: ['@prisma/client', '.prisma/client']`.
- `types/next-auth.d.ts` — Extends `Session` with `accessToken`, `JWT` with `accessToken`, `refreshToken`, `expiresAt`.

---

## Current State

### Working
- Full sunset data pipeline: GPS → solar math → weather → quality score → display
- Location list: Google Places → Claude ranking → top 3 spots with reasons
- Tomorrow's sunset fallback when today's has passed
- Golden hour bar, sky stats, leave-by bar (all display correctly)
- Spotify OAuth flow: connect → top tracks → Claude sequencing → tracklist display
- Push notification subscription flow (UI → VAPID → DB)
- Service worker installation and push receive/click handling
- CORS validation, rate limiting, input validation on all API routes
- PWA installability (manifest + service worker)
- City-name fallback geocoding when GPS is denied
- Fade-in animation on splash screen

### Known Bugs / Broken

1. ~~**Returning users always see the location screen**~~ **FIXED** — `page.tsx` now checks `localStorage` for `tge_coords` + `tge_visited` on mount. If present, coords are restored and `LocationPermission` is skipped. A silent background `getCurrentPosition` call refreshes coords and overwrites cache if successful. `handleCoords` now saves both keys after any successful location grant.

2. ~~**`writeNightlyMessage` is called client-side (bug)**~~ **FIXED** — Replaced dynamic `import('@/lib/claude')` in `page.tsx` with a `POST /api/message` fetch. The server route has access to `ANTHROPIC_API_KEY`. Message shows a pulse animation while the fetch is in-flight (`messageLoading` prop on `SunsetHero`).

2. **Cron timing mismatch** — Vercel cron fires daily at 17:00 UTC. The cron handler only sends push if golden hour is 55–65 min away (i.e., ~18:00–18:05 UTC). This only works for users where golden hour is around 6pm UTC (which is roughly UK/West Africa in summer). For US users (golden hour 8–9pm local), the cron never fires for them. The cron needs to run hourly (e.g., `0 * * * *`), not daily.

3. **No Spotify token refresh** — `auth.ts` stores `expiresAt` in the JWT but never refreshes it. After 1 hour, Spotify calls fail with 401. Playlist silently returns nothing.

4. **PWA icons missing** — `manifest.json` and `sw.js` reference `/icon-192.png` and `/icon-512.png` but these files don't exist in `/public/`. PWA install and notification icon will be broken.

5. **`SessionLog` model never written** — The `SessionLog` Prisma model exists in the schema but is never populated anywhere in the codebase. It was likely planned for analytics.

6. **`buildSpotifyPlaylistUrl()` unused** — `lib/spotify.ts` exports this function but it's never called. Probably meant to link to Spotify.

7. **`region` field always empty** — `PushPrompt.tsx` doesn't send a `region` field to `/api/push/subscribe`. The DB stores empty string.

### In Progress / Uncertain
- No grain/texture overlay on backgrounds yet (the design vision mentions "grainy" feel — not implemented)
- `SessionLog` analytics infrastructure exists but is dormant

---

## Active Decisions & Conventions

- **All times displayed in user's local timezone** via `Intl.DateTimeFormat().resolvedOptions().timeZone` passed to `/api/sunset` as `tz` param.
- **Claude model is `claude-opus-4-6`** across all three AI calls — do not downgrade to Haiku/Sonnet without testing output quality.
- **Golden hour start ≠ sunset time.** App displays golden hour start as the "be there by" time, not actual sunset. This is intentional and correct — golden hour starts before sunset.
- **The `goldenHourStart` calculation** in `lib/solar.ts` uses `dusk - 50min` or `sunset - 25min` (whichever is earlier). This is a custom heuristic, not a SunCalc built-in.
- **Quality score is 0–100, not a letter grade.** Score pill shows Excellent/Decent/Marginal as a label but always shows the numeric score too.
- **Top 3 spots shown in `LocationList`** (`.slice(0, 3)`) — not configurable.
- **Leave-by time = golden hour start** (same as the hero time). `LeaveByBar` uses `goldenHourStartFormatted`.
- **API routes all validate CORS + rate limits first** before any business logic. Pattern in all route files: `checkCORS → applyRateLimit → validate inputs → business logic`.
- **Prisma is initialized lazily** in a global singleton (`global.__prisma`) to avoid connection exhaustion in serverless environments.
- **Background color is `#1a0a00`** everywhere — hardcoded in Tailwind classes, CSS variables, manifest, viewport theme. Do not change this.
- **Primary action color is `#c94a12`** (burnt orange) — used for CTA buttons, score highlights, service worker theme.
- **All client components** — entire page is `'use client'`. No RSC data fetching. This was a deliberate simplicity choice.
- **Open-Meteo for weather** (no API key required). Visibility is used as an AQI proxy since Open-Meteo doesn't provide real AQI.
- **Google Places uses legacy Nearby Search** (not Places API New). The `nearbysearch` endpoint returns up to 20 results; we take the top 10 after filtering to 5mi.

---

## Do Not Touch

- `app/globals.css` — The `sun-rays` animation with its specific `transform-origin: 100px 116px` matches the SVG sun center in `LocationPermission`. Changing either without changing both will break the spin.
- `lib/score.ts` — The scoring algorithm is calibrated. The cloud cover sweet spot logic (partial clouds can be great for dramatic sunsets) is intentional.
- `lib/solar.ts` — The azimuth conversion (`* 180 / Math.PI + 180`) converts SunCalc's radian output (0 = south, clockwise) to standard compass degrees. This is correct.
- `public/sw.js` — Service workers are tricky to update in browsers once installed. Don't modify unless you understand cache busting and SW lifecycle.
- `types/next-auth.d.ts` — The module augmentation pattern for NextAuth types. Required for TypeScript to know `session.accessToken` exists.

---

## Next Steps (Priority Order)

1. **Fix the nightly message bug** — Replace the direct `lib/claude` import in `page.tsx` with a `POST /api/message` call. The route already exists at `app/api/message/route.ts`.

2. **Add PWA icons** — Create `/public/icon-192.png` and `/public/icon-512.png`. The app is effectively non-installable without them. A simple sun design in `#c94a12` on `#1a0a00` would match the aesthetic.

3. **Fix the cron schedule** — Change `vercel.json` cron from `0 17 * * *` to `0 * * * *` so the notification can fire at the right time for users in any timezone.

4. **Implement Spotify token refresh** — In `lib/auth.ts` JWT callback, check `token.expiresAt` and call `https://accounts.spotify.com/api/token` with the refresh token if expired. Standard NextAuth pattern.

5. **Wire up SessionLog** — Either populate it in `/api/locations` (after ranking) or remove the model. Currently dead schema weight.

6. **Grain texture** — Add a subtle noise/grain overlay to match the design vision. Either an SVG filter or a PNG texture as a fixed pseudo-element on `body`.

7. **Send `region` in push subscribe** — Update `PushPrompt.tsx` to include `region: Intl.DateTimeFormat().resolvedOptions().timeZone` in the subscribe POST body.

8. **Spotify playlist link** — `buildSpotifyPlaylistUrl()` exists in `lib/spotify.ts` but is never called. Consider adding an "Open in Spotify" link in `SpotifyConnect.tsx`.
