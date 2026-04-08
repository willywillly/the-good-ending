import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  sunset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:sunset',
  }),
  locations: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:locations',
  }),
  playlist: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:playlist',
  }),
  pushSubscribe: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:push-subscribe',
  }),
};

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous';
}

export async function applyRateLimit(
  limiter: Ratelimit,
  req: NextRequest,
): Promise<NextResponse | null> {
  const { success } = await limiter.limit(getIP(req));
  if (!success) {
    return new NextResponse('Too many requests', { status: 429 });
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
