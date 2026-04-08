import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { endpoint, keys, lat, lng, region } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth || !lat || !lng) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, lat, lng, region: region ?? '' },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, lat, lng, region: region ?? '' },
  });

  return NextResponse.json({ ok: true });
}
