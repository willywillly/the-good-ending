import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Vercel KV env var names (KV_REST_API_URL / KV_REST_API_TOKEN).
// Redis is optional caching — if env vars are absent the app still works.
function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function makeRateLimiter(redis: Redis, limiter: Ratelimit['limiter'], prefix: string): Ratelimit {
  return new Ratelimit({ redis, limiter, prefix });
}

const redis = makeRedis();

export const rateLimiters = redis
  ? {
      sunset: makeRateLimiter(redis, Ratelimit.slidingWindow(20, '1 h'), 'rl:sunset'),
      locations: makeRateLimiter(redis, Ratelimit.slidingWindow(20, '1 h'), 'rl:locations'),
      playlist: makeRateLimiter(redis, Ratelimit.slidingWindow(5, '1 h'), 'rl:playlist'),
      pushSubscribe: makeRateLimiter(redis, Ratelimit.slidingWindow(3, '1 h'), 'rl:push-subscribe'),
    }
  : null;

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous';
}

// Fails open: if Redis is unavailable or throws, the request is allowed through.
export async function applyRateLimit(
  key: keyof NonNullable<typeof rateLimiters>,
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!rateLimiters) return null;
  try {
    const { success } = await rateLimiters[key].limit(getIP(req));
    if (!success) return new NextResponse('Too many requests', { status: 429 });
  } catch {
    // Redis error — let the request through rather than blocking the route
  }
  return null;
}

// Rejects cross-origin requests. Requests without an Origin header (same-origin
// or server-to-server) are always allowed.
export function checkCORS(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  const allowed = process.env.NEXTAUTH_URL;
  if (!allowed) return null;
  if (origin !== allowed) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return null;
}

export function validateCoords(lat: number, lng: number): string | null {
  if (isNaN(lat) || isNaN(lng)) return 'lat and lng must be valid numbers';
  if (lat < -90 || lat > 90) return 'lat must be between -90 and 90';
  if (lng < -180 || lng > 180) return 'lng must be between -180 and 180';
  return null;
}

export function validateTimezone(tz: string): string | null {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return null;
  } catch {
    return `Invalid timezone: ${tz}`;
  }
}

export function validateDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'date must be in YYYY-MM-DD format';
  if (isNaN(new Date(date).getTime())) return 'date is invalid';
  return null;
}
