const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export interface OverpassStationData {
  name: string;
  latitude: number;
  longitude: number;
  altitudeMin: number | null;
  altitudeMax: number | null;
  region: string | null;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
  remark?: string;
}

const BULK_QUERY = `
  [out:json][timeout:120];
  area["ISO3166-1"="FR"]["admin_level"="2"]->.france;
  (
    way["leisure"="ski_resort"](area.france);
    relation["leisure"="ski_resort"](area.france);
    way["landuse"="winter_sports"](area.france);
    relation["landuse"="winter_sports"](area.france);
  );
  out center tags;
`;

export async function fetchAllFrenchStationsFromOverpass(): Promise<OverpassStationData[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 130_000);

  let response: Response;
  try {
    response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(BULK_QUERY)}`,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError')
      throw new Error('Overpass bulk query timed out', { cause: err });
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OverpassResponse;

  if (data.remark?.includes('timed out')) {
    throw new Error(`Overpass query timed out: ${data.remark}`);
  }

  return data.elements
    .map((e) => {
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      if (!lat || !lon) return null;

      const tags = e.tags ?? {};
      return {
        name: tags['name'] ?? '',
        latitude: lat,
        longitude: lon,
        altitudeMin: parseAltitude(tags['ele:min'] ?? tags['ele:base'] ?? null),
        altitudeMax: parseAltitude(tags['ele:max'] ?? tags['ele'] ?? null),
        region: tags['addr:state'] ?? tags['addr:county'] ?? tags['is_in:département'] ?? null,
      };
    })
    .filter((e): e is OverpassStationData => e !== null && e.name !== '');
}

function parseAltitude(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}
