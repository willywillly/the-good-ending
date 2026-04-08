'use client';

interface GoldenHourBarProps {
  start: string;
  end: string;
  windowMinutes: number;
}

export function GoldenHourBar({ start, end, windowMinutes }: GoldenHourBarProps) {
  return (
    <div className="mx-4 rounded-2xl border border-orange-500/20 bg-orange-950/30 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-orange-300/50 font-medium">Golden Hour</span>
          <span className="text-orange-200 font-mono text-lg">
            {start} – {end}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-orange-200/40">{windowMinutes} min window</span>
        </div>
      </div>

      {/* Progress bar — decorative, represents golden hour window */}
      <div className="mt-3 h-1 rounded-full bg-orange-950/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: `${Math.min(100, (windowMinutes / 40) * 100)}%` }}
        />
      </div>
    </div>
  );
}
