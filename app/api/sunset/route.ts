import { NextRequest, NextResponse } from 'next/server';
import { getSolarData, formatTime } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { computeQualityScore } from '@/lib/score';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');
  const tz = searchParams.get('tz') ?? undefined;

  // Accept an optional YYYY-MM-DD date param for fetching tomorrow's data
  const dateParam = searchParams.get('date');
  // Parse at noon local time to avoid UTC date boundary issues
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

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
