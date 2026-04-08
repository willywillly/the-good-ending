import { NextRequest, NextResponse } from 'next/server';
import { getNearbySpots } from '@/lib/places';
import { getSolarData } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { rankLocations } from '@/lib/claude';
import {
  applyRateLimit,
  checkCORS,
  validateCoords,
} from '@/lib/security';

export async function GET(req: NextRequest) {
  const corsError = checkCORS(req);
  if (corsError) return corsError;

  const rateLimitError = await applyRateLimit('locations', req);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(req.url);

  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const coordError = validateCoords(lat, lng);
  if (coordError) return NextResponse.json({ error: coordError }, { status: 400 });

  const [spots, solar, weather] = await Promise.all([
    getNearbySpots(lat, lng),
    getSolarData(lat, lng),
    getWeatherData(lat, lng),
  ]);

  const ranked = await rankLocations(spots, solar, weather);

  return NextResponse.json({ locations: ranked });
}
