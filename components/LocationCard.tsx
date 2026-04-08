'use client';

import { RankedSpot } from '@/lib/claude';

interface LocationCardProps {
  spot: RankedSpot;
  isBest: boolean;
}

export function LocationCard({ spot, isBest }: LocationCardProps) {
  const mapsUrl = `https://maps.google.com/?q=${spot.lat},${spot.lng}`;

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 flex items-start justify-between gap-3 transition-colors ${
        isBest
          ? 'bg-orange-950/40 border-orange-500/30'
          : 'bg-stone-900/40 border-stone-800/40'
      }`}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          {isBest && (
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/20">
              Best
            </span>
          )}
          <span className={`font-medium truncate ${isBest ? 'text-amber-100' : 'text-stone-300'}`}>
            {spot.name}
          </span>
        </div>
        {spot.reason && (
          <p className="text-xs text-stone-500 leading-snug">{spot.reason}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-stone-500">{spot.distanceMiles} mi</span>
          <span className="text-stone-700">·</span>
          <span className="text-xs text-stone-500">{spot.walkMinutes} min walk</span>
        </div>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[11px] text-orange-400/70 hover:text-orange-300 underline underline-offset-2 mt-1"
      >
        Map
      </a>
    </div>
  );
}
