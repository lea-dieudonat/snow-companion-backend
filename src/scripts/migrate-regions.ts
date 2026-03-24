import { config } from 'dotenv';
config();

import prisma from '@/config/prisma';

// Maps department names currently stored in `region` → correct slug
const DEPT_TO_SLUG: Record<string, string> = {
  'Alpes-Maritimes': 'alpes',
  'Alpes-de-Haute-Provence': 'alpes',
  'Haute-Savoie': 'alpes',
  'Hautes-Alpes': 'alpes',
  Isère: 'alpes',
  Savoie: 'alpes',
};

async function main(): Promise<void> {
  console.log('=== Migrate station regions ===\n');

  const stations = await prisma.station.findMany({
    select: { id: true, name: true, region: true },
  });

  let updated = 0;

  for (const station of stations) {
    const slug = DEPT_TO_SLUG[station.region];
    if (!slug) continue;

    await prisma.station.update({
      where: { id: station.id },
      data: { region: slug, department: station.region },
    });
    console.log(
      `  ${station.name}: "${station.region}" → region="${slug}", department="${station.region}"`,
    );
    updated++;
  }

  console.log(`\n=== Done — ${updated} stations updated ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
