import prisma from '@/config/prisma';
import { fetchStationFromOverpass } from './overpass.service';
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

// Throttle Overpass requests to avoid rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // 2. Get existing station IDs
  const existing = await prisma.station.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((s) => s.id));

  const toInsert = frResorts.filter((r) => !existingIds.has(r.slug));
  const toEnrich = frResorts.filter((r) => existingIds.has(r.slug));

  console.log(
    `[populate] ${frResorts.length} French resorts — ${toInsert.length} new, ${toEnrich.length} to enrich`,
  );

  // 3. Enrich existing stations with Overpass data
  for (const resort of toEnrich) {
    try {
      await sleep(500);
      const overpass = await fetchStationFromOverpass(resort.name);
      if (!overpass) {
        report.skipped.push(resort.slug);
        continue;
      }

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
      report.enriched.push(resort.slug);
    } catch (err) {
      report.errors.push({ id: resort.slug, error: String(err) });
    }
  }

  // 4. Insert new stations
  for (const resort of toInsert) {
    try {
      await sleep(500);
      const overpass = await fetchStationFromOverpass(resort.name);

      if (!overpass) {
        report.skipped.push(resort.slug);
        continue;
      }

      await prisma.station.create({
        data: {
          id: resort.slug,
          name: overpass.name,
          region: overpass.region ?? resort.region,
          latitude: overpass.latitude,
          longitude: overpass.longitude,
          altitudeMin: overpass.altitudeMin,
          altitudeMax: overpass.altitudeMax,
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
      report.inserted.push(resort.slug);
    } catch (err) {
      report.errors.push({ id: resort.slug, error: String(err) });
    }
  }

  return report;
}
