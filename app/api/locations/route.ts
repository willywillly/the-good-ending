import { NextRequest, NextResponse } from 'next/server';
import { getNearbySpots } from '@/lib/places';
import { getSolarData } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { rankLocations } from '@/lib/claude';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const [spots, solar, weather] = await Promise.all([
    getNearbySpots(lat, lng),
    getSolarData(lat, lng),
    getWeatherData(lat, lng),
  ]);

  const ranked = await rankLocations(spots, solar, weather);

  return NextResponse.json({ locations: ranked });
}
