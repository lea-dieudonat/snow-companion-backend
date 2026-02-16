import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Lecture du fichier stations.json
  const stationsPath = path.join(__dirname, '../src/data/stations.json');
  const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));

  console.log(`📊 Found ${stationsData.length} stations to seed`);

  // Seed des stations
  for (const station of stationsData) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        region: station.region,
        altitudeMin: station.altitude_min,
        altitudeMax: station.altitude_max,
        latitude: station.latitude,
        longitude: station.longitude,
        numSlopes: station.num_slopes,
        numLifts: station.num_lifts,
        kmSlopes: station.km_slopes,
        slopesDetail: station.slopes_detail,
        snowCannons: station.snow_cannons,
        skiArea: station.ski_area,
        level: station.level,
        passes: station.passes,
        avgAccommodationPrice: station.avg_accommodation_price,
        website: station.website,
        description: station.description,
        access: station.access,
        season: station.season,
        services: station.services,
        activities: station.activities,
      },
      create: {
        id: station.id,
        name: station.name,
        region: station.region,
        altitudeMin: station.altitude_min,
        altitudeMax: station.altitude_max,
        latitude: station.latitude,
        longitude: station.longitude,
        numSlopes: station.num_slopes,
        numLifts: station.num_lifts,
        kmSlopes: station.km_slopes,
        slopesDetail: station.slopes_detail,
        snowCannons: station.snow_cannons,
        skiArea: station.ski_area,
        level: station.level,
        passes: station.passes,
        avgAccommodationPrice: station.avg_accommodation_price,
        website: station.website,
        description: station.description,
        access: station.access,
        season: station.season,
        services: station.services,
        activities: station.activities,
      },
    });
    console.log(`✅ Seeded station: ${station.name}`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });