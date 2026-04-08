import { NextRequest, NextResponse } from 'next/server';
import { getSolarData, formatTime } from '@/lib/solar';
import { getWeatherData } from '@/lib/weather';
import { computeQualityScore } from '@/lib/score';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const [solar, weather] = await Promise.all([
    getSolarData(lat, lng),
    getWeatherData(lat, lng),
  ]);

  const score = computeQualityScore(weather);

  return NextResponse.json({
    sunsetTime: solar.sunsetTime.toISOString(),
    sunsetTimeFormatted: formatTime(solar.sunsetTime),
    goldenHourStart: solar.goldenHourStart.toISOString(),
    goldenHourStartFormatted: formatTime(solar.goldenHourStart),
    goldenHourEnd: solar.goldenHourEnd.toISOString(),
    goldenHourEndFormatted: formatTime(solar.goldenHourEnd),
    windowMinutes: solar.windowMinutes,
    azimuth: solar.azimuth,
    weather,
    score,
  });
}
