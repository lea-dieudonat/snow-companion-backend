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
  bounds?: { minlat: number; maxlat: number; minlon: number; maxlon: number };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export async function fetchStationFromOverpass(
  name: string,
): Promise<OverpassStationData | null> {
  // Search for ski resort by name in France
  const query = `
    [out:json][timeout:25];
    (
      node["leisure"="ski_resort"]["name"~"${escapeName(name)}",i]["addr:country"!="CH"]["addr:country"!="IT"];
      way["leisure"="ski_resort"]["name"~"${escapeName(name)}",i]["addr:country"!="CH"]["addr:country"!="IT"];
      relation["leisure"="ski_resort"]["name"~"${escapeName(name)}",i]["addr:country"!="CH"]["addr:country"!="IT"];
      node["landuse"="winter_sports"]["name"~"${escapeName(name)}",i];
      way["landuse"="winter_sports"]["name"~"${escapeName(name)}",i];
      relation["landuse"="winter_sports"]["name"~"${escapeName(name)}",i];
    );
    out center tags;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OverpassResponse;

  if (!data.elements || data.elements.length === 0) {
    return null;
  }

  // Pick best match: prefer elements with altitude tags
  const best = data.elements.find((e) => e.tags?.['ele'] || e.tags?.['ele:min'] || e.tags?.['ele:max'])
    ?? data.elements[0];

  if (!best) return null;

  const lat = best.lat ?? best.center?.lat;
  const lon = best.lon ?? best.center?.lon;

  if (!lat || !lon) return null;

  const tags = best.tags ?? {};

  const altitudeMin = parseAltitude(tags['ele:min'] ?? tags['ele:base'] ?? null);
  const altitudeMax = parseAltitude(tags['ele:max'] ?? tags['ele'] ?? null);
  const region = tags['addr:state'] ?? tags['addr:county'] ?? tags['is_in:département'] ?? null;

  return {
    name: tags['name'] ?? name,
    latitude: lat,
    longitude: lon,
    altitudeMin,
    altitudeMax,
    region,
  };
}

function parseAltitude(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function escapeName(name: string): string {
  // Escape special regex characters and normalize for Overpass fuzzy search
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-]/g, '.?');
}
