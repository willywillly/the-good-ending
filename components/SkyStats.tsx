'use client';

interface SkyStatsProps {
  cloudCoverPercent: number;
  aqi: string;
  visibilityMiles: number;
  humidityPercent: number;
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-stone-900/60 border border-stone-800/50">
      <span className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium">{label}</span>
      <span className="text-stone-200 font-mono text-xl font-light">{value}</span>
      {sub && <span className="text-[11px] text-stone-500">{sub}</span>}
    </div>
  );
}

export function SkyStats({ cloudCoverPercent, aqi, visibilityMiles, humidityPercent }: SkyStatsProps) {
  return (
    <div className="px-4">
      <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-3 px-1">Sky Conditions</h2>
      <div className="grid grid-cols-2 gap-2">
        <StatCell
          label="Cloud Cover"
          value={`${cloudCoverPercent}%`}
          sub={cloudCoverPercent < 30 ? 'Clear' : cloudCoverPercent < 70 ? 'Partly cloudy' : 'Overcast'}
        />
        <StatCell
          label="Air Quality"
          value={aqi}
        />
        <StatCell
          label="Visibility"
          value={`${visibilityMiles.toFixed(1)} mi`}
          sub={visibilityMiles >= 8 ? 'Excellent' : visibilityMiles >= 5 ? 'Good' : 'Reduced'}
        />
        <StatCell
          label="Humidity"
          value={`${humidityPercent}%`}
          sub={humidityPercent >= 20 && humidityPercent <= 40 ? 'Ideal scattering' : undefined}
        />
      </div>
    </div>
  );
}
