'use client';

import { useState, useEffect } from 'react';

interface Props {
  onCoords: (lat: number, lng: number) => void;
}

type Stage = 'idle' | 'requesting' | 'denied';

function SunIllustration({ pulsing }: { pulsing: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Wide ambient glow */}
      <div
        className={`absolute bottom-0 w-72 h-24 rounded-full bg-[#c94a12]/15 blur-3xl transition-opacity duration-1000 ${pulsing ? 'opacity-100' : 'opacity-60'}`}
      />
      {/* Tight core glow */}
      <div
        className={`absolute bottom-3 w-40 h-16 rounded-full bg-orange-500/25 blur-2xl ${pulsing ? 'animate-pulse' : ''}`}
      />

      {/* Rays SVG — slow spin centered on sun core */}
      <svg
        width="200"
        height="130"
        viewBox="0 0 200 130"
        fill="none"
        className="absolute bottom-0 opacity-20 sun-rays"
        aria-hidden
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i * 20 * Math.PI) / 180 - Math.PI / 2;
          const r1 = 58;
          const r2 = 74 + (i % 3 === 0 ? 12 : 4);
          const cx = 100;
          const cy = 116;
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * r1}
              y1={cy + Math.sin(angle) * r1}
              x2={cx + Math.cos(angle) * r2}
              y2={cy + Math.sin(angle) * r2}
              stroke="#c94a12"
              strokeWidth={i % 3 === 0 ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Half-sun clipped at the horizon */}
      <div className="relative overflow-hidden" style={{ width: 112, height: 56 }}>
        <div
          className="absolute inset-x-0 bottom-0 rounded-full"
          style={{
            width: 112,
            height: 112,
            background: 'radial-gradient(circle at 50% 60%, #fcd34d 0%, #f97316 45%, #c94a12 100%)',
            boxShadow: '0 0 80px 30px rgba(201,74,18,0.45)',
          }}
        />
      </div>

      {/* Horizon line */}
      <div className="w-64 h-px bg-gradient-to-r from-transparent via-[#c94a12]/50 to-transparent mt-0" />

      {/* Ground fade */}
      <div className="w-full h-4 bg-gradient-to-b from-[#c94a12]/8 to-transparent" />
    </div>
  );
}

export function LocationPermission({ onCoords }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [cityQuery, setCityQuery] = useState('');
  const [geocodeError, setGeocodeError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the fade-in feels intentional, not instant
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function requestLocation() {
    setStage('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => onCoords(pos.coords.latitude, pos.coords.longitude),
      () => setStage('denied'),
      { timeout: 10000 }
    );
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery.trim())}&count=1&language=en&format=json`
      );
      const data = await res.json();
      const result = data.results?.[0];
      if (!result) {
        setGeocodeError("Couldn't find that place. Try a nearby city.");
        return;
      }
      onCoords(result.latitude, result.longitude);
    } catch {
      setGeocodeError('Something went wrong. Try again.');
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#1a0a00] flex flex-col items-center justify-center px-8 max-w-md mx-auto"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <div className="mb-14">
        <SunIllustration pulsing={stage === 'requesting'} />
      </div>

      {stage !== 'denied' ? (
        <div className="flex flex-col items-center w-full">
          <p className="text-stone-600 text-[10px] tracking-[0.3em] uppercase mb-4">Golden</p>
          <h1 className="text-[#f5e6d3] text-[1.75rem] font-light tracking-tight text-center leading-snug mb-3">
            where will you watch<br />tonight's sunset?
          </h1>
          <p className="text-stone-500 text-sm text-center leading-relaxed mb-12 max-w-[230px]">
            so we can find tonight's best spots for you
          </p>
          <button
            onClick={requestLocation}
            disabled={stage === 'requesting'}
            className="w-full max-w-[260px] py-4 rounded-2xl bg-[#c94a12] text-[#f5e6d3] text-sm font-medium tracking-wide transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
          >
            {stage === 'requesting' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5e6d3] animate-pulse" />
                finding you…
              </span>
            ) : (
              'use my location'
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          <h1 className="text-[#f5e6d3] text-xl font-light tracking-tight text-center mb-2">
            enter your city
          </h1>
          <p className="text-stone-500 text-xs text-center leading-relaxed mb-8 max-w-[240px]">
            location access was denied — that's okay.
            type a city and we'll find the sunset for you.
          </p>
          <form onSubmit={handleManualSubmit} className="w-full max-w-[280px] flex flex-col gap-3">
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="San Francisco, CA"
              autoFocus
              className="w-full py-3.5 px-4 rounded-xl bg-stone-900 border border-stone-800 text-[#f5e6d3] text-sm placeholder:text-stone-600 focus:outline-none focus:border-[#c94a12]/60 transition-colors"
            />
            {geocodeError && (
              <p className="text-xs text-orange-400/80 px-1">{geocodeError}</p>
            )}
            <button
              type="submit"
              disabled={geocoding || !cityQuery.trim()}
              className="w-full py-4 rounded-2xl bg-[#c94a12] text-[#f5e6d3] text-sm font-medium tracking-wide transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            >
              {geocoding ? 'looking…' : 'find my sunset'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
