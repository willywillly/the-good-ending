'use client';

import { signIn } from 'next-auth/react';

interface Track {
  id: string;
  name: string;
  energy: number;
  valence: number;
  tempo: number;
}

interface SpotifyConnectProps {
  isConnected: boolean;
  tracks?: Track[];
}

export function SpotifyConnect({ isConnected, tracks }: SpotifyConnectProps) {
  if (!isConnected) {
    return (
      <div className="mx-4 rounded-2xl border border-stone-800/60 bg-stone-900/30 px-5 py-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-stone-300 font-medium text-sm">Wind-down playlist</span>
          <p className="text-xs text-stone-500 leading-relaxed">
            Connect Spotify and we&apos;ll build a personalized arc from golden hour to full dark — sequenced to match the light.
          </p>
        </div>
        <button
          onClick={() => signIn('spotify')}
          className="w-full py-2.5 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] text-sm font-medium hover:bg-[#1DB954]/20 transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="mx-4 rounded-2xl border border-stone-800/60 bg-stone-900/30 px-5 py-4">
        <p className="text-xs text-stone-500">Building your playlist…</p>
      </div>
    );
  }

  return (
    <div className="mx-4 rounded-2xl border border-stone-800/60 bg-stone-900/30 px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">Tonight&apos;s Arc</span>
        <span className="text-[10px] text-[#1DB954]/60">Spotify</span>
      </div>
      <div className="flex flex-col gap-2">
        {tracks.map((track, i) => (
          <div key={track.id} className="flex items-center gap-3">
            <span className="text-[10px] text-stone-600 font-mono w-4 shrink-0">{i + 1}</span>
            <span className="text-sm text-stone-300 truncate">{track.name}</span>
            <div className="ml-auto flex gap-1 shrink-0">
              {/* Energy dot */}
              <div
                className="w-1.5 h-1.5 rounded-full bg-orange-500/60"
                style={{ opacity: track.energy }}
                title={`Energy: ${Math.round(track.energy * 100)}%`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
