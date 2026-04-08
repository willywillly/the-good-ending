import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTopTracks } from '@/lib/spotify';
import { sequencePlaylist } from '@/lib/claude';
import { getSolarData } from '@/lib/solar';
import {
  applyRateLimit,
  checkCORS,
  rateLimiters,
  validateCoords,
} from '@/lib/security';

export async function GET(req: NextRequest) {
  const corsError = checkCORS(req);
  if (corsError) return corsError;

  const rateLimitError = await applyRateLimit(rateLimiters.playlist, req);
  if (rateLimitError) return rateLimitError;

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  let lat: number | null = null;
  let lng: number | null = null;
  if (latStr && lngStr) {
    lat = parseFloat(latStr);
    lng = parseFloat(lngStr);
    const coordError = validateCoords(lat, lng);
    if (coordError) return NextResponse.json({ error: coordError }, { status: 400 });
  }

  const [tracks, solar] = await Promise.all([
    getTopTracks(session.accessToken as string),
    lat !== null && lng !== null ? getSolarData(lat, lng) : Promise.resolve(null),
  ]);

  const windowMinutes = solar?.windowMinutes ?? 24;
  const sequenced = await sequencePlaylist(tracks, windowMinutes);

  // Map IDs back to full track objects
  const trackMap = new Map(tracks.map((t) => [t.id, t]));
  const orderedTracks = sequenced
    .map((id) => trackMap.get(id))
    .filter(Boolean);

  return NextResponse.json({ tracks: orderedTracks });
}
