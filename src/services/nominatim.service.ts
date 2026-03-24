const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Nominatim usage policy: max 1 request/second
const NOMINATIM_DELAY_MS = 1100;

export interface NominatimResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeStation(name: string): Promise<NominatimResult | null> {
  await sleep(NOMINATIM_DELAY_MS);

  const params = new URLSearchParams({
    q: `${name} France`,
    format: 'json',
    limit: '1',
    countrycodes: 'fr',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'snow-companion-app/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
  }

  const results = (await response.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];

  if (!results.length) return null;

  const first = results[0]!;
  return {
    latitude: parseFloat(first.lat),
    longitude: parseFloat(first.lon),
    displayName: first.display_name,
  };
}
