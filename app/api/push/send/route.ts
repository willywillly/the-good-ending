import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification, PushPayload } from '@/lib/push';

// Manual push trigger — protected by a secret header
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { subscription: { endpoint: string; p256dh: string; auth: string }; payload: PushPayload } = await req.json();
  const { subscription, payload } = body;

  await sendPushNotification(subscription, payload);
  return NextResponse.json({ ok: true });
}
