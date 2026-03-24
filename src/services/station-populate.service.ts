import prisma from '@/config/prisma';
import { fetchAllFrenchStationsFromOverpass, type OverpassStationData } from './overpass.service';
import { geocodeStation } from './nominatim.service';
import { Prisma } from '@prisma/client';

const OPEN_PISTE_URL = 'https://open-piste.raed.workers.dev/resorts';

interface OpenPisteResort {
  slug: string;
  name: string;
  region: string;
  country: string;
}

export interface PopulateReport {
  inserted: string[];
  enriched: string[];
  skipped: string[];
  errors: { id: string; error: string }[];
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

function findBestMatch(
  slug: string,
  openPisteName: string,
  overpassStations: OverpassStationData[],
): OverpassStationData | null {
  const slugWords = slug.replace(/-/g, ' ');
  const normalizedSlug = normalize(slugWords);
  const normalizedName = normalize(openPisteName);

  // Exact match on normalized name
  let match = overpassStations.find((s) => normalize(s.name) === normalizedName);
  if (match) return match;

  // Exact match on normalized slug
  match = overpassStations.find((s) => normalize(s.name) === normalizedSlug);
  if (match) return match;

  // Partial: overpass name contains slug words
  match = overpassStations.find((s) => {
    const n = normalize(s.name);
    return normalizedSlug.split(' ').every((word) => word.length > 2 && n.includes(word));
  });

  return match ?? null;
}

export async function populateStations(): Promise<PopulateReport> {
  const report: PopulateReport = { inserted: [], enriched: [], skipped: [], errors: [] };

  // 1. Fetch French resorts from open-piste
  const response = await fetch(OPEN_PISTE_URL);
  if (!response.ok) {
    throw new Error(`open-piste API error: ${response.status} ${response.statusText}`);
  }
  const { resorts } = (await response.json()) as { resorts: OpenPisteResort[] };
  const frResorts = resorts.filter((r) => r.country === 'fr');

  // 2. Single bulk Overpass query for all French ski resorts
  console.log('[populate] Fetching all French ski resorts from Overpass (single query)...');
  const overpassStations = await fetchAllFrenchStationsFromOverpass();
  console.log(`[populate] Overpass returned ${overpassStations.length} stations`);

  // 3. Get existing station IDs
  const existing = await prisma.station.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((s) => s.id));

  const toInsert = frResorts.filter((r) => !existingIds.has(r.slug));
  const toEnrich = frResorts.filter((r) => existingIds.has(r.slug));

  console.log(
    `[populate] ${frResorts.length} French resorts — ${toInsert.length} new, ${toEnrich.length} to enrich`,
  );

  // 4. Enrich existing stations
  for (const [i, resort] of toEnrich.entries()) {
    console.log(`[enrich] (${i + 1}/${toEnrich.length}) ${resort.slug}`);
    try {
      const overpass = findBestMatch(resort.slug, resort.name, overpassStations);

      if (overpass) {
        await prisma.station.update({
          where: { id: resort.slug },
          data: {
            name: overpass.name,
            latitude: overpass.latitude,
            longitude: overpass.longitude,
            ...(overpass.altitudeMin !== null && { altitudeMin: overpass.altitudeMin }),
            ...(overpass.altitudeMax !== null && { altitudeMax: overpass.altitudeMax }),
            ...(overpass.region !== null && { region: overpass.region }),
          },
        });
        console.log(`  → enriched (${overpass.name})`);
        report.enriched.push(resort.slug);
      } else {
        console.log(`  → no Overpass match, trying Nominatim...`);
        const nominatim = await geocodeStation(resort.name);
        if (!nominatim) {
          console.log(`  → skipped (no match found)`);
          report.skipped.push(resort.slug);
          continue;
        }
        await prisma.station.update({
          where: { id: resort.slug },
          data: { latitude: nominatim.latitude, longitude: nominatim.longitude },
        });
        console.log(`  → enriched via Nominatim (${nominatim.displayName.slice(0, 60)})`);
        report.enriched.push(resort.slug);
      }
    } catch (err) {
      console.log(`  → error: ${String(err)}`);
      report.errors.push({ id: resort.slug, error: String(err) });
    }
  }

  // 5. Insert new stations
  for (const [i, resort] of toInsert.entries()) {
    console.log(`[insert] (${i + 1}/${toInsert.length}) ${resort.slug}`);
    try {
      const overpass = findBestMatch(resort.slug, resort.name, overpassStations);

      let latitude: number;
      let longitude: number;
      let name: string;
      let region: string | null;
      let altitudeMin: number | null = null;
      let altitudeMax: number | null = null;

      if (overpass) {
        ({ latitude, longitude, altitudeMin, altitudeMax, region } = overpass);
        name = overpass.name;
      } else {
        console.log(`  → no Overpass match, trying Nominatim...`);
        const nominatim = await geocodeStation(resort.name);
        if (!nominatim) {
          console.log(`  → skipped (no match found)`);
          report.skipped.push(resort.slug);
          continue;
        }
        ({ latitude, longitude } = nominatim);
        name = resort.name;
        region = null;
        console.log(`  → geocoded via Nominatim (${nominatim.displayName.slice(0, 60)})`);
      }

      await prisma.station.create({
        data: {
          id: resort.slug,
          name,
          region: region ?? resort.region,
          latitude,
          longitude,
          altitudeMin,
          altitudeMax,
          level: [],
          services: [],
          activities: [],
          slopesDetail: Prisma.JsonNull,
          snowPark: Prisma.JsonNull,
          passes: Prisma.JsonNull,
          access: Prisma.JsonNull,
          season: Prisma.JsonNull,
          openPisteCovered: true,
        },
      });
      console.log(`  → inserted (${name})`);
      report.inserted.push(resort.slug);
    } catch (err) {
      console.log(`  → error: ${String(err)}`);
      report.errors.push({ id: resort.slug, error: String(err) });
    }
  }

  return report;
}
