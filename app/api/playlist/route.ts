import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTopTracks } from '@/lib/spotify';
import { sequencePlaylist } from '@/lib/claude';
import { getSolarData } from '@/lib/solar';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');

  const [tracks, solar] = await Promise.all([
    getTopTracks(session.accessToken as string),
    lat && lng ? getSolarData(lat, lng) : Promise.resolve(null),
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
