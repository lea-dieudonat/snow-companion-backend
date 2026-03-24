import { config } from 'dotenv';
config();

import prisma from '@/config/prisma';

const OPEN_PISTE_STATUS_URL = 'https://open-piste.raed.workers.dev/status';

async function main(): Promise<void> {
  console.log('=== Enrich station elevations (open-piste) ===\n');

  const stations = await prisma.station.findMany({
    where: { openPisteCovered: true },
    select: { id: true, name: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const station of stations) {
    await new Promise((r) => setTimeout(r, 120));

    const res = await fetch(`${OPEN_PISTE_STATUS_URL}/${station.id}`);
    if (!res.ok) {
      skipped++;
      continue;
    }

    const data = (await res.json()) as {
      weather?: { base_elevation_m: number | null; summit_elevation_m: number | null };
    };
    let base = data.weather?.base_elevation_m ?? null;
    let summit = data.weather?.summit_elevation_m ?? null;

    if (base === null && summit === null) {
      skipped++;
      continue;
    }

    if (base !== null && summit !== null && base > summit) [base, summit] = [summit, base];

    await prisma.station.update({
      where: { id: station.id },
      data: {
        ...(base !== null && { altitudeMin: base }),
        ...(summit !== null && { altitudeMax: summit }),
      },
    });

    console.log(`  ${station.name}: min=${base ?? '—'} max=${summit ?? '—'}`);
    updated++;
  }

  console.log(`\nUpdated: ${updated}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
