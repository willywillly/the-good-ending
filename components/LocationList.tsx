'use client';

import { RankedSpot } from '@/lib/claude';
import { LocationCard } from './LocationCard';

interface LocationListProps {
  spots: RankedSpot[];
}

export function LocationList({ spots }: LocationListProps) {
  const visible = spots.slice(0, 3);

  return (
    <div className="px-4">
      <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-3 px-1">
        Walkable Spots
      </h2>
      <div className="flex flex-col gap-2">
        {visible.map((spot, i) => (
          <LocationCard key={spot.id} spot={spot} isBest={i === 0} />
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-stone-500 px-1">No nearby spots found. Try enabling location access.</p>
        )}
      </div>
    </div>
  );
}
