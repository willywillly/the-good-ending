export interface WeatherInputs {
  cloudCoverPercent: number; // 0–100
  aqi: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  visibilityMiles: number;
  humidityPercent: number;
}

export function computeQualityScore(inputs: WeatherInputs): number {
  const { cloudCoverPercent, aqi, visibilityMiles, humidityPercent } = inputs;

  // Cloud cover: 0% = 40pts, 100% = 0pts (linear, but partial clouds can enhance color)
  // Sweet spot is 20-40% for dramatic skies
  let cloudScore: number;
  if (cloudCoverPercent <= 20) {
    cloudScore = 35 + (20 - cloudCoverPercent) * 0.25; // 35–40
  } else if (cloudCoverPercent <= 50) {
    cloudScore = 40 - ((cloudCoverPercent - 20) / 30) * 10; // 30–40 (partial clouds can be great)
  } else {
    cloudScore = 30 - ((cloudCoverPercent - 50) / 50) * 30; // 0–30
  }
  cloudScore = Math.max(0, Math.min(40, cloudScore));

  // AQI score
  const aqiScores: Record<string, number> = {
    Good: 25,
    Moderate: 15,
    'Unhealthy for Sensitive Groups': 8,
    Unhealthy: 0,
    'Very Unhealthy': 0,
    Hazardous: 0,
  };
  const aqiScore = aqiScores[aqi] ?? 0;

  // Visibility: 10mi+ = 20pts, scaled down below
  const visibilityScore = Math.min(20, (visibilityMiles / 10) * 20);

  // Humidity: 20-40% is ideal for light scattering
  let humidityScore: number;
  if (humidityPercent >= 20 && humidityPercent <= 40) {
    humidityScore = 15;
  } else if (humidityPercent < 20) {
    humidityScore = (humidityPercent / 20) * 12;
  } else if (humidityPercent <= 60) {
    humidityScore = 15 - ((humidityPercent - 40) / 20) * 8;
  } else {
    humidityScore = 7 - ((humidityPercent - 60) / 40) * 7;
  }
  humidityScore = Math.max(0, Math.min(15, humidityScore));

  return Math.round(cloudScore + aqiScore + visibilityScore + humidityScore);
}
