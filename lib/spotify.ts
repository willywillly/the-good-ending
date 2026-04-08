import { SpotifyTrack } from './claude';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTopTracks(accessToken: string, limit = 30): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=medium_term`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Spotify top tracks error: ${res.status}`);

  const data = await res.json();
  const trackIds: string[] = data.items.map((t: { id: string }) => t.id);

  if (trackIds.length === 0) return [];

  // Fetch audio features for all tracks
  const featRes = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!featRes.ok) throw new Error(`Spotify audio features error: ${featRes.status}`);

  const featData = await featRes.json();

  return data.items.map((track: { id: string; name: string }, i: number) => {
    const feat = featData.audio_features?.[i];
    return {
      id: track.id,
      name: track.name,
      energy: feat?.energy ?? 0.5,
      valence: feat?.valence ?? 0.5,
      tempo: feat?.tempo ?? 120,
    };
  });
}

export function buildSpotifyPlaylistUrl(trackIds: string[]): string {
  return `https://open.spotify.com/search/${encodeURIComponent(trackIds.slice(0, 5).join(' '))}`;
}
