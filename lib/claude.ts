import Anthropic from '@anthropic-ai/sdk';
import { Spot } from './places';
import { SolarData } from './solar';
import { WeatherData } from './weather';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface RankedSpot extends Spot {
  rank: number;
  reason?: string;
}

export async function rankLocations(
  spots: Spot[],
  solarData: SolarData,
  weatherData: WeatherData
): Promise<RankedSpot[]> {
  if (spots.length === 0) return [];

  const spotsJson = spots.map((s) => ({
    id: s.id,
    name: s.name,
    distanceMiles: s.distanceMiles,
    walkMinutes: s.walkMinutes,
    elevationScore: s.elevationProxy,
  }));

  const prompt = `Tonight's sunset azimuth is ${Math.round(solarData.azimuth)}° (where 270° = due west). Quality score: ${weatherData.cloudCoverPercent}% cloud cover, ${weatherData.visibilityMiles.toFixed(1)}mi visibility, ${weatherData.humidityPercent}% humidity.

Nearby spots:
${JSON.stringify(spotsJson, null, 2)}

Rank these spots best to worst for watching tonight's sunset. Prefer: western-facing open areas, elevated spots, less walking is a tiebreaker. Return a JSON array with objects: { id, rank, reason } where reason is one short sentence for the top pick only (others null). No extra text, just the JSON array.`;

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const ranked: { id: string; rank: number; reason: string | null }[] = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : [];

  const rankMap = new Map(ranked.map((r) => [r.id, r]));

  return spots
    .map((s) => ({
      ...s,
      rank: rankMap.get(s.id)?.rank ?? 99,
      reason: rankMap.get(s.id)?.reason ?? undefined,
    }))
    .sort((a, b) => a.rank - b.rank);
}

export async function writeNightlyMessage(
  score: number,
  goldenHourStart: Date,
  topSpot: Spot
): Promise<string> {
  const timeStr = goldenHourStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const quality = score >= 70 ? 'excellent' : score >= 40 ? 'decent' : 'poor';

  const prompt = `Write a single short sentence (max 12 words) for tonight's sunset moment. Quality: ${quality} (score ${score}/100). Golden hour starts at ${timeStr}. Best spot: ${topSpot.name}, ${topSpot.distanceMiles} miles away.

If score > 70: inviting and specific, makes you want to go.
If score 40-69: acknowledges it's decent, gently encouraging.
If score < 40: warmly suggests going anyway — the stillness is worth it.

Tone: calm, unhurried, like a friend who notices beautiful things. No quotes, no hashtags. Just the sentence.`;

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 64,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : 'Tonight is worth stepping outside.';
}

export interface SpotifyTrack {
  id: string;
  name: string;
  energy: number;    // 0–1
  valence: number;   // 0–1
  tempo: number;     // BPM
}

export async function sequencePlaylist(
  tracks: SpotifyTrack[],
  goldenHourDurationMinutes: number
): Promise<string[]> {
  if (tracks.length === 0) return [];

  const trackList = tracks.map((t) => ({
    id: t.id,
    name: t.name,
    energy: t.energy,
    valence: t.valence,
    tempo: t.tempo,
  }));

  const prompt = `Golden hour is ${goldenHourDurationMinutes} minutes. Sequence these tracks to arc from moderate energy at golden hour start down to low-energy calm by full dark. The arc should feel like a natural wind-down, not abrupt. Prefer tracks with decreasing energy and tempo toward the end.

Tracks:
${JSON.stringify(trackList, null, 2)}

Return only a JSON array of track IDs in order. No extra text.`;

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : tracks.map((t) => t.id);
}
