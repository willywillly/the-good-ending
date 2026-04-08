import SunCalc from 'suncalc';

export interface SolarData {
  sunsetTime: Date;
  goldenHourStart: Date;
  goldenHourEnd: Date;
  windowMinutes: number;
  azimuth: number; // degrees, direction of sunset
}

export function getSolarData(lat: number, lng: number, date: Date = new Date()): SolarData {
  const times = SunCalc.getTimes(date, lat, lng);
  const sunPosition = SunCalc.getPosition(times.sunset, lat, lng);

  const sunsetTime = times.sunset;
  // Golden hour start = civil twilight end (dusk) or sunset - 25min as fallback
  const goldenHourStart = isNaN(times.dusk.getTime())
    ? new Date(sunsetTime.getTime() - 25 * 60 * 1000)
    : new Date(Math.min(times.dusk.getTime() - 50 * 60 * 1000, sunsetTime.getTime() - 25 * 60 * 1000));

  const goldenHourEnd = sunsetTime;
  const windowMinutes = Math.round((goldenHourEnd.getTime() - goldenHourStart.getTime()) / 60000);

  // Convert azimuth from radians to degrees (0 = south, positive = west)
  const azimuthDeg = (sunPosition.azimuth * 180) / Math.PI + 180;

  return {
    sunsetTime,
    goldenHourStart,
    goldenHourEnd,
    windowMinutes,
    azimuth: azimuthDeg,
  };
}

export function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });
}
