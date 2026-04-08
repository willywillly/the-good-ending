import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<void> {
  await getWebPush().sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload)
  );
}

export function buildPushMessage(score: number, time: string, spotName: string): PushPayload {
  if (score >= 70) {
    return {
      title: 'Golden Hour',
      body: `Tonight's looking good — ${score}/100. Leave by ${time} to catch the full show.`,
      url: '/',
    };
  } else if (score >= 40) {
    return {
      title: 'Golden Hour',
      body: `Decent sunset tonight — ${score}/100. Worth a quick look from ${spotName}.`,
      url: '/',
    };
  } else {
    return {
      title: 'Golden Hour',
      body: `Sky's not great tonight. We found somewhere worth going anyway.`,
      url: '/',
    };
  }
}
