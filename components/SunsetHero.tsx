'use client';

interface SunsetHeroProps {
  beThereBy: string;      // golden hour start time
  sunsetTime: string;     // actual sunset time
  score: number;          // 0–100
  message: string;        // nightly message from Claude
  isTomorrow?: boolean;   // true when showing next day's sunset
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
    score >= 40 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                  'bg-zinc-600/20 text-zinc-400 border-zinc-600/30';
  const label =
    score >= 70 ? 'Excellent' :
    score >= 40 ? 'Decent' :
                  'Marginal';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${color}`}>
      <span className="font-mono">{score}</span>
      <span className="opacity-60">/100</span>
      <span className="mx-1 opacity-30">·</span>
      {label}
    </span>
  );
}

export function SunsetHero({ beThereBy, sunsetTime, score, message, isTomorrow }: SunsetHeroProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-12 pb-8 gap-5">
      {/* Sun orb */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_0_60px_20px_rgba(201,74,18,0.35)]" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-amber-100/10" />
      </div>

      {/* Message */}
      <p className="text-sm text-amber-200/60 max-w-xs leading-relaxed italic">{message}</p>

      {/* Be there by */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] uppercase tracking-[0.2em] text-amber-200/40 font-medium">be there by</span>
        <span className="font-mono text-7xl font-light text-amber-100 tracking-tight leading-none">
          {beThereBy}
        </span>
        {isTomorrow && (
          <span className="text-[11px] tracking-wide text-amber-200/30 mt-0.5">tomorrow</span>
        )}
      </div>

      {/* Sunset time + score */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-amber-200/40">sun sets at {sunsetTime}</span>
        <span className="text-amber-200/20">·</span>
        <ScorePill score={score} />
      </div>
    </div>
  );
}
