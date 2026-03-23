/**
 * One-time migration script:
 * 1. Renames 4 station IDs to match open-piste slugs (with FK reference updates)
 * 2. Flags 5 stations as openPisteCovered = false (no match in open-piste API)
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/migrate-station-ids.ts
 */

import prisma from '@/config/prisma';
import { Prisma } from '@prisma/client';

const RENAMES: { from: string; to: string }[] = [
  { from: 'les-2-alpes', to: 'deux-alpes' },
  { from: 'val-isere', to: 'val-d-isere' },
  { from: 'alpe-huez', to: 'alpe-d-huez' },
  { from: 'superdevoluy', to: 'super-devoluy' },
];

const UNCOVERED: string[] = [
  'meribel',
  'la-plagne-tarentaise',
  'la-colmiane',
  'greolieres-les-neiges',
  'roubion',
];

async function renameStationId(from: string, to: string): Promise<void> {
  const station = await prisma.station.findUnique({ where: { id: from } });
  if (!station) {
    console.log(`  [skip] ${from} — not found in DB`);
    return;
  }

  const target = await prisma.station.findUnique({ where: { id: to } });
  if (target) {
    console.log(`  [skip] ${from} → ${to} — target ID already exists`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create new station with updated ID
    // JSON nullable fields require Prisma.JsonNull instead of null
    const toJson = (v: Prisma.JsonValue) => (v === null ? Prisma.JsonNull : v);
    await tx.station.create({
      data: {
        ...station,
        id: to,
        slopesDetail: toJson(station.slopesDetail),
        snowPark: toJson(station.snowPark),
        passes: toJson(station.passes),
        access: toJson(station.access),
        season: toJson(station.season),
      },
    });

    // 2. Move live data
    await tx.stationLiveData.updateMany({
      where: { stationId: from },
      data: { stationId: to },
    });

    // 3. Update Trip references
    await tx.trip.updateMany({
      where: { stationId: from },
      data: { stationId: to },
    });

    // 4. Update User.favoriteStations arrays
    const usersWithFav = await tx.user.findMany({
      where: { favoriteStations: { has: from } },
      select: { id: true, favoriteStations: true },
    });
    for (const user of usersWithFav) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          favoriteStations: user.favoriteStations.map((s) => (s === from ? to : s)),
        },
      });
    }

    // 5. Delete old station
    await tx.station.delete({ where: { id: from } });
  });

  console.log(`  [renamed] ${from} → ${to}`);
}

async function main(): Promise<void> {
  console.log('=== Migrate station IDs ===\n');

  console.log('--- Renaming station IDs ---');
  for (const { from, to } of RENAMES) {
    await renameStationId(from, to);
  }

  console.log('\n--- Flagging uncovered stations ---');
  for (const id of UNCOVERED) {
    const result = await prisma.station.updateMany({
      where: { id },
      data: { openPisteCovered: false },
    });
    if (result.count > 0) {
      console.log(`  [flagged] ${id}`);
    } else {
      console.log(`  [skip] ${id} — not found in DB`);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
