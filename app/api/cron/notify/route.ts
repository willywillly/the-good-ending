import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getSolarData, formatTime } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { computeQualityScore } from '@/lib/score';
import { getNearbySpots } from '@/lib/places';
import { sendPushNotification, buildPushMessage } from '@/lib/push';

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization header with CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  const now = new Date();
  const sent: string[] = [];
  const skipped: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub: typeof subscriptions[number]) => {
      try {
        const solar = getSolarData(sub.lat, sub.lng, now);
        const minutesUntilGolden = (solar.goldenHourStart.getTime() - now.getTime()) / 60000;

        // Only fire if golden hour is 55–65 minutes away
        if (minutesUntilGolden < 55 || minutesUntilGolden > 65) {
          skipped.push(sub.id);
          return;
        }

        const [weather, spots] = await Promise.all([
          getWeatherData(sub.lat, sub.lng),
          getNearbySpots(sub.lat, sub.lng),
        ]);

        const score = computeQualityScore(weather);
        const topSpot = spots[0];
        const leaveByTime = formatTime(new Date(solar.goldenHourStart.getTime() - 10 * 60000));

        const payload = buildPushMessage(score, leaveByTime, topSpot?.name ?? 'your spot');

        await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );
        sent.push(sub.id);
      } catch {
        skipped.push(sub.id);
      }
    })
  );

  return NextResponse.json({ sent: sent.length, skipped: skipped.length });
}
