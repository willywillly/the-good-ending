import { WeatherInputs } from './score';

export interface WeatherData extends WeatherInputs {
  cloudCoverPercent: number;
  visibilityMiles: number;
  humidityPercent: number;
  aqi: WeatherInputs['aqi'];
}

function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

// Map visibility to a rough AQI proxy when real AQI isn't available
function visibilityToAqi(visibilityMiles: number): WeatherInputs['aqi'] {
  if (visibilityMiles >= 8) return 'Good';
  if (visibilityMiles >= 5) return 'Moderate';
  if (visibilityMiles >= 3) return 'Unhealthy for Sensitive Groups';
  return 'Unhealthy';
}

export async function getWeatherData(lat: number, lng: number): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('hourly', 'cloudcover,visibility,relativehumidity_2m');
  url.searchParams.set('daily', 'sunset');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const data = await res.json();

  // Find the hour index closest to now (or sunset hour)
  const now = new Date();
  const currentHour = now.getHours();
  const hourIndex = Math.min(currentHour + 1, (data.hourly?.time?.length ?? 1) - 1); // +1 for near-sunset

  const cloudCoverPercent: number = data.hourly?.cloudcover?.[hourIndex] ?? 50;
  const visibilityMeters: number = data.hourly?.visibility?.[hourIndex] ?? 10000;
  const humidityPercent: number = data.hourly?.relativehumidity_2m?.[hourIndex] ?? 50;

  const visibilityMiles = metersToMiles(visibilityMeters);
  const aqi = visibilityToAqi(visibilityMiles);

  return {
    cloudCoverPercent,
    visibilityMiles,
    humidityPercent,
    aqi,
  };
}
