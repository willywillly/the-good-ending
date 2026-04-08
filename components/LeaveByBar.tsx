'use client';

interface LeaveByBarProps {
  leaveByTime: string;
  topSpotLat?: number;
  topSpotLng?: number;
  topSpotName?: string;
}

export function LeaveByBar({ leaveByTime, topSpotLat, topSpotLng, topSpotName }: LeaveByBarProps) {
  const mapsUrl = topSpotLat && topSpotLng
    ? `https://maps.google.com/?daddr=${topSpotLat},${topSpotLng}&travelmode=walking`
    : undefined;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="m-3 rounded-2xl border border-orange-500/20 bg-[#1a0a00]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-orange-300/50 font-medium">Leave by</span>
          <span className="font-mono text-2xl text-amber-100 font-light leading-none">{leaveByTime}</span>
          {topSpotName && (
            <span className="text-[11px] text-stone-500 mt-0.5 truncate max-w-[160px]">→ {topSpotName}</span>
          )}
        </div>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors shadow-lg"
          >
            Open in Maps
          </a>
        ) : (
          <button
            className="px-5 py-3 rounded-xl bg-stone-800 text-stone-500 text-sm font-medium cursor-default"
            disabled
          >
            Open in Maps
          </button>
        )}
      </div>
    </div>
  );
}
