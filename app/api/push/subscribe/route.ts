import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  applyRateLimit,
  checkCORS,
  validateCoords,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const corsError = checkCORS(req);
  if (corsError) return corsError;

  const rateLimitError = await applyRateLimit('pushSubscribe', req);
  if (rateLimitError) return rateLimitError;

  const body = await req.json();
  const { endpoint, keys, lat, lng, region } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 });
  }
  const coordError = validateCoords(lat, lng);
  if (coordError) return NextResponse.json({ error: coordError }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, lat, lng, region: region ?? '' },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, lat, lng, region: region ?? '' },
  });

  return NextResponse.json({ ok: true });
}
