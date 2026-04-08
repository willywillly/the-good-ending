export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  walkMinutes: number;
  elevationProxy: number; // 0–10 score based on name keywords
  vicinity: string;
}

const ELEVATION_KEYWORDS = [
  'hill', 'hilltop', 'overlook', 'ridge', 'cliff', 'bluff', 'peak', 'summit',
  'heights', 'highland', 'knoll', 'crest', 'vista', 'viewpoint', 'point',
  'terrace', 'mount', 'mountain', 'butte', 'tor',
];

function elevationScore(name: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  for (const kw of ELEVATION_KEYWORDS) {
    if (lower.includes(kw)) score += 2;
  }
  return Math.min(10, score);
}

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function walkMinutes(distanceMiles: number): number {
  // Walking speed ~3mph, 1.3x factor for actual walking path vs straight line
  return Math.round((distanceMiles * 1.3) / 3 * 60);
}

interface GooglePlacesResult {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  vicinity: string;
}

interface GooglePlacesResponse {
  results: GooglePlacesResult[];
  status: string;
}

async function fetchPlaces(lat: number, lng: number, type: string, radiusMeters: number): Promise<GooglePlacesResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radiusMeters));
  url.searchParams.set('type', type);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data: GooglePlacesResponse = await res.json();
  return data.results ?? [];
}

export async function getNearbySpots(lat: number, lng: number): Promise<Spot[]> {
  const radiusMeters = 8000; // ~5 miles

  const [parks, natural] = await Promise.all([
    fetchPlaces(lat, lng, 'park', radiusMeters),
    fetchPlaces(lat, lng, 'natural_feature', radiusMeters),
  ]);

  const all = [...parks, ...natural];

  // Deduplicate by place_id
  const seen = new Set<string>();
  const unique = all.filter((p) => {
    if (seen.has(p.place_id)) return false;
    seen.add(p.place_id);
    return true;
  });

  const spots: Spot[] = unique.map((p) => {
    const dist = haversineDistanceMiles(lat, lng, p.geometry.location.lat, p.geometry.location.lng);
    return {
      id: p.place_id,
      name: p.name,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      distanceMiles: Math.round(dist * 10) / 10,
      walkMinutes: walkMinutes(dist),
      elevationProxy: elevationScore(p.name),
      vicinity: p.vicinity,
    };
  });

  // Filter to within 5 miles
  return spots
    .filter((s) => s.distanceMiles <= 5)
    .sort((a, b) => b.elevationProxy - a.elevationProxy || a.distanceMiles - b.distanceMiles)
    .slice(0, 10);
}
