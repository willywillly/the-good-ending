import { NextRequest, NextResponse } from 'next/server';
import { getSolarData, formatTime } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { computeQualityScore } from '@/lib/score';
import {
  applyRateLimit,
  checkCORS,
  rateLimiters,
  validateCoords,
  validateDate,
  validateTimezone,
} from '@/lib/security';

export async function GET(req: NextRequest) {
  const corsError = checkCORS(req);
  if (corsError) return corsError;

  const rateLimitError = await applyRateLimit(rateLimiters.sunset, req);
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

  const tz = searchParams.get('tz') ?? undefined;
  if (tz) {
    const tzError = validateTimezone(tz);
    if (tzError) return NextResponse.json({ error: tzError }, { status: 400 });
  }

  const dateParam = searchParams.get('date');
  if (dateParam) {
    const dateError = validateDate(dateParam);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  }

  // Parse at noon local time to avoid UTC date boundary issues
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();

  const [solar, weather] = await Promise.all([
    getSolarData(lat, lng, date),
    getWeatherData(lat, lng),
  ]);

  const score = computeQualityScore(weather);

  return NextResponse.json({
    sunsetTime: solar.sunsetTime.toISOString(),
    sunsetTimeFormatted: formatTime(solar.sunsetTime, tz),
    goldenHourStart: solar.goldenHourStart.toISOString(),
    goldenHourStartFormatted: formatTime(solar.goldenHourStart, tz),
    goldenHourEnd: solar.goldenHourEnd.toISOString(),
    goldenHourEndFormatted: formatTime(solar.goldenHourEnd, tz),
    windowMinutes: solar.windowMinutes,
    azimuth: solar.azimuth,
    weather,
    score,
  });
}
