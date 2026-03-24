import { config } from 'dotenv';
config();

import { syncStationLiveData } from '@/services/station-sync.service';
import prisma from '@/config/prisma';

async function main(): Promise<void> {
  console.log('=== Sync station live data ===\n');
  await syncStationLiveData();
  console.log('\n=== Done ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
