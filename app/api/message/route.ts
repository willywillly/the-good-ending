import { NextRequest, NextResponse } from 'next/server';
import { writeNightlyMessage } from '@/lib/claude';
import type { Spot } from '@/lib/places';

export async function POST(req: NextRequest) {
  const { score, goldenHourStart, spotName, spotDistance } = await req.json();

  const spot: Spot = {
    id: 'top',
    name: spotName ?? 'a nearby spot',
    lat: 0,
    lng: 0,
    distanceMiles: spotDistance ?? 0.5,
    walkMinutes: Math.round((spotDistance ?? 0.5) * 1.3 / 3 * 60),
    elevationProxy: 0,
    vicinity: '',
  };

  const message = await writeNightlyMessage(score, new Date(goldenHourStart), spot);
  return NextResponse.json({ message });
}
