'use client';

import { useState } from 'react';

export function PushPrompt() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    setStatus('loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Get user location for timing
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(Array.from(new Uint8Array(sub.getKey('p256dh')!)).map((b) => String.fromCharCode(b)).join('')),
            auth: btoa(Array.from(new Uint8Array(sub.getKey('auth')!)).map((b) => String.fromCharCode(b)).join('')),
          },
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });

      setStatus('subscribed');
    } catch {
      setStatus('denied');
    }
  }

  if (status === 'subscribed') {
    return (
      <div className="mx-4 rounded-2xl border border-stone-800/40 bg-stone-900/20 px-5 py-4 text-center">
        <p className="text-xs text-stone-500">You&apos;ll get a nudge ~60 min before golden hour.</p>
      </div>
    );
  }

  if (status === 'unsupported' || status === 'denied') return null;

  return (
    <div className="mx-4 rounded-2xl border border-stone-800/60 bg-stone-900/30 px-5 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-stone-300 font-medium text-sm">Get the nudge</span>
        <p className="text-xs text-stone-500 leading-relaxed">
          We&apos;ll notify you 60 minutes before golden hour so you have time to get there.
        </p>
      </div>
      <button
        onClick={subscribe}
        disabled={status === 'loading'}
        className="w-full py-2.5 rounded-xl bg-stone-800 border border-stone-700/50 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Setting up…' : 'Notify me before golden hour'}
      </button>
    </div>
  );
}
