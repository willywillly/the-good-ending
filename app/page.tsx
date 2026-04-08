'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SunsetHero } from '@/components/SunsetHero';
import { GoldenHourBar } from '@/components/GoldenHourBar';
import { SkyStats } from '@/components/SkyStats';
import { LocationList } from '@/components/LocationList';
import { SpotifyConnect } from '@/components/SpotifyConnect';
import { LeaveByBar } from '@/components/LeaveByBar';
import { PushPrompt } from '@/components/PushPrompt';
import { LocationPermission } from '@/components/LocationPermission';
import type { RankedSpot, SpotifyTrack } from '@/lib/claude';

interface SunsetData {
  sunsetTimeFormatted: string;
  goldenHourStartFormatted: string;
  goldenHourEndFormatted: string;
  windowMinutes: number;
  score: number;
  weather: {
    cloudCoverPercent: number;
    aqi: string;
    visibilityMiles: number;
    humidityPercent: number;
  };
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#1a0a00]">
      <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 to-orange-600 animate-pulse shadow-[0_0_40px_10px_rgba(201,74,18,0.3)]" />
      <p className="text-xs text-stone-500 animate-pulse">Reading the sky…</p>
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sunsetData, setSunsetData] = useState<SunsetData | null>(null);
  const [locations, setLocations] = useState<RankedSpot[]>([]);
  const [playlist, setPlaylist] = useState<SpotifyTrack[]>([]);
  const [message, setMessage] = useState('Step outside. The sky is doing something tonight.');
  const [loading, setLoading] = useState(false);
  const [isTomorrow, setIsTomorrow] = useState(false);

  function handleCoords(lat: number, lng: number) {
    setCoords({ lat, lng });
    setLoading(true);
  }

  useEffect(() => {
    if (!coords) return;
    const { lat, lng } = coords;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fetchSunset = (dateStr?: string) => {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), tz });
      if (dateStr) params.set('date', dateStr);
      return fetch(`/api/sunset?${params}`).then((r) => r.json() as Promise<SunsetData>);
    };

    Promise.all([
      fetchSunset(),
      fetch(`/api/locations?lat=${lat}&lng=${lng}`).then((r) => r.json() as Promise<{ locations: RankedSpot[] }>),
    ])
      .then(async ([sunset, locationData]) => {
        let finalSunset = sunset;

        // If today's sunset has already passed, show tomorrow's instead
        if (Date.now() > new Date(sunset.sunsetTime).getTime()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split('T')[0];
          finalSunset = await fetchSunset(dateStr);
          setIsTomorrow(true);
        } else {
          setIsTomorrow(false);
        }

        setSunsetData(finalSunset);
        setLocations(locationData.locations ?? []);

        const top = locationData.locations?.[0];
        if (top) {
          import('@/lib/claude').then(({ writeNightlyMessage }) => {
            writeNightlyMessage(finalSunset.score, new Date(), top)
              .then((msg) => setMessage(msg))
              .catch(() => {});
          });
        }
      })
      .finally(() => setLoading(false));
  }, [coords]);

  useEffect(() => {
    if (!session?.accessToken || !coords) return;
    fetch(`/api/playlist?lat=${coords.lat}&lng=${coords.lng}`)
      .then((r) => r.json() as Promise<{ tracks: SpotifyTrack[] }>)
      .then((d) => setPlaylist(d.tracks ?? []));
  }, [session, coords]);

  if (!coords) return <LocationPermission onCoords={handleCoords} />;
  if (loading) return <LoadingScreen />;

  const topSpot = locations[0];

  return (
    <main className="min-h-screen bg-[#1a0a00] max-w-md mx-auto pb-36">
      {sunsetData && (
        <SunsetHero
          beThereBy={sunsetData.goldenHourStartFormatted}
          sunsetTime={sunsetData.sunsetTimeFormatted}
          score={sunsetData.score}
          message={message}
          isTomorrow={isTomorrow}
        />
      )}

      <div className="flex flex-col gap-5">
        {sunsetData && (
          <GoldenHourBar
            start={sunsetData.goldenHourStartFormatted}
            end={sunsetData.goldenHourEndFormatted}
            windowMinutes={sunsetData.windowMinutes}
          />
        )}

        {sunsetData?.weather && (
          <SkyStats
            cloudCoverPercent={sunsetData.weather.cloudCoverPercent}
            aqi={sunsetData.weather.aqi}
            visibilityMiles={sunsetData.weather.visibilityMiles}
            humidityPercent={sunsetData.weather.humidityPercent}
          />
        )}

        <LocationList spots={locations} />

        <SpotifyConnect
          isConnected={!!session?.accessToken}
          tracks={playlist.length > 0 ? playlist : undefined}
        />

        <PushPrompt />
      </div>

      <LeaveByBar
        leaveByTime={sunsetData?.goldenHourStartFormatted ?? '--:--'}
        topSpotLat={topSpot?.lat}
        topSpotLng={topSpot?.lng}
        topSpotName={topSpot?.name}
      />
    </main>
  );
}
