import { config } from 'dotenv';
config();

import { syncSeasonDates } from '@/services/season-sync.service';
import prisma from '@/config/prisma';

async function main(): Promise<void> {
  console.log('=== Sync station season dates ===\n');
  const result = await syncSeasonDates();
  console.log(
    `\n=== Done — updated: ${result.updated}, skipped: ${result.skipped}, errors: ${result.errors} ===`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
