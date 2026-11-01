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

// Overpass est partagé et souvent saturé : ces statuts se règlent en réessayant plus tard
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

async function requestBulkQuery(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 130_000);

  try {
    return await fetch(OVERPASS_URL, {
      method: 'POST',
      // Overpass refuse (406) les requêtes sans User-Agent identifiable
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'snow-companion-app/1.0',
      },
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
}

/**
 * Requête unique sur toute la France. Réessaie avec un délai croissant
 * (retryDelayMs, puis x2, x4) quand Overpass est saturé.
 */
export async function fetchAllFrenchStationsFromOverpass(
  retryDelayMs = 15_000,
): Promise<OverpassStationData[]> {
  let response = await requestBulkQuery();

  for (let attempt = 1; !response.ok && attempt < MAX_ATTEMPTS; attempt++) {
    if (!RETRYABLE_STATUSES.has(response.status)) break;
    const delay = retryDelayMs * 2 ** (attempt - 1);
    console.warn(
      `[overpass] ${response.status}, nouvelle tentative ${attempt}/${MAX_ATTEMPTS - 1} dans ${delay / 1000}s`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await requestBulkQuery();
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
