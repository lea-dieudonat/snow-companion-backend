/**
 * Populates the Station table from open-piste (French resorts) + Overpass (static data).
 * - Inserts new stations with minimum data (name + coordinates required)
 * - Overwrites existing station static fields with Overpass data
 *
 * Run with: npm run populate:stations
 */

import { config } from 'dotenv';
config();

import { populateStations } from '@/services/station-populate.service';
import prisma from '@/config/prisma';

async function main(): Promise<void> {
  console.log('=== Populate stations ===\n');

  const report = await populateStations();

  console.log('\n=== Report ===');
  console.log(`Inserted  : ${report.inserted.length}`);
  if (report.inserted.length > 0) console.log('  ' + report.inserted.join(', '));

  console.log(`Enriched  : ${report.enriched.length}`);
  if (report.enriched.length > 0) console.log('  ' + report.enriched.join(', '));

  console.log(`Skipped   : ${report.skipped.length} (insufficient Overpass data)`);
  if (report.skipped.length > 0) console.log('  ' + report.skipped.join(', '));

  console.log(`Errors    : ${report.errors.length}`);
  if (report.errors.length > 0) {
    for (const e of report.errors) console.log(`  ${e.id}: ${e.error}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
