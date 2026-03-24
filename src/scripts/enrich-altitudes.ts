/**
 * Enriches all stations with altitudeMin from Open-Meteo elevation API.
 * Overwrites any existing value (previous data were approximations).
 *
 * Run with: npm run enrich:altitudes
 */

import { config } from 'dotenv';
config();

import prisma from '@/config/prisma';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/elevation';
const BATCH_SIZE = 100;

async function fetchElevations(
  coords: { latitude: number; longitude: number }[],
): Promise<number[]> {
  const lats = coords.map((c) => c.latitude).join(',');
  const lons = coords.map((c) => c.longitude).join(',');
  const url = `${OPEN_METEO_URL}?latitude=${lats}&longitude=${lons}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { elevation: number[] };
  return data.elevation;
}

async function main(): Promise<void> {
  console.log('=== Enrich station altitudes (Open-Meteo) ===\n');

  const stations = await prisma.station.findMany({
    select: { id: true, name: true, latitude: true, longitude: true },
  });

  console.log(`Found ${stations.length} stations to enrich\n`);

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    console.log(
      `[batch] ${i + 1}–${Math.min(i + BATCH_SIZE, stations.length)} / ${stations.length}`,
    );

    try {
      const elevations = await fetchElevations(batch);

      for (let j = 0; j < batch.length; j++) {
        const station = batch[j]!;
        const altitude = Math.round(elevations[j]!);

        await prisma.station.update({
          where: { id: station.id },
          data: { altitudeMin: altitude },
        });

        console.log(`  ${station.name}: ${altitude} m`);
        updated++;
      }
    } catch (err) {
      console.error(`  error: ${String(err)}`);
      errors += batch.length;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated : ${updated}`);
  console.log(`Errors  : ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
