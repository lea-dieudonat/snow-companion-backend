import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

  // ── Demo account ──────────────────────────────────────────────────────────
  const DEMO_EMAIL = 'demo@snowcompanion.app';
  const DEMO_PASSWORD = 'demo1234';

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: 'Alex Demo',
      favoriteStations: ['val-thorens', 'chamonix', 'tignes', 'alpe-huez'],
    },
    create: {
      email: DEMO_EMAIL,
      password: hashedPassword,
      name: 'Alex Demo',
      locationCity: 'Grenoble',
      locationLatitude: 45.1885,
      locationLongitude: 5.7245,
      favoriteStations: ['val-thorens', 'chamonix', 'tignes', 'alpe-huez'],
    },
  });

  console.log(`👤 Upserted demo user: ${demoUser.email}`);

  // Delete existing sessions for idempotency
  await prisma.session.deleteMany({ where: { userId: demoUser.id } });

  const sessions = [
    {
      date: new Date('2026-01-10T09:00:00Z'),
      station: 'val-thorens',
      conditions: 'Neige fraîche, visibilité excellente',
      tricks: ['carving long radius', 'switch riding'],
      notes: 'Super journée, powder sur les pistes rouges du haut.',
      rating: 5,
      photos: [],
    },
    {
      date: new Date('2026-01-18T08:30:00Z'),
      station: 'chamonix',
      conditions: "Neige dure le matin, ramollie l'après-midi",
      tricks: ['stemm christie', 'christiania'],
      notes: 'Première fois sur la Vallée Blanche, inoubliable.',
      rating: 5,
      photos: [],
    },
    {
      date: new Date('2026-01-25T10:00:00Z'),
      station: 'les-2-alpes',
      conditions: 'Brouillard en altitude, bonne neige basse station',
      tricks: [],
      notes: "Journée mitigée à cause du brouillard, on s'est concentrés sur les bleues.",
      rating: 3,
      photos: [],
    },
    {
      date: new Date('2026-02-07T09:00:00Z'),
      station: 'tignes',
      conditions: 'Poudreuse hors-piste après la chute de neige',
      tricks: ['jump small kicker', 'butter nose'],
      notes: 'Session freeride avec les copains. Snowpark débutant aussi testé.',
      rating: 4,
      photos: [],
    },
    {
      date: new Date('2026-02-14T08:00:00Z'),
      station: 'alpe-huez',
      conditions: 'Grand soleil, neige travaillée mais correcte',
      tricks: ['carving short radius', 'pivot 180'],
      notes: "Ski de printemps avant l'heure, super ambiance sur le domaine.",
      rating: 4,
      photos: [],
    },
    {
      date: new Date('2026-02-22T09:30:00Z'),
      station: 'meribel',
      conditions: 'Enneigement moyen, pistes bien damées',
      tricks: ['stemm christie'],
      notes: 'Découverte des 3 Vallées côté Méribel. Beaucoup de monde.',
      rating: 3,
      photos: [],
    },
    {
      date: new Date('2026-03-08T08:00:00Z'),
      station: 'val-isere',
      conditions: 'Excellent enneigement, ciel bleu',
      tricks: ['carving long radius', 'switch riding', 'jump medium kicker'],
      notes: 'Meilleure session de la saison. Pistes de compétition au top.',
      rating: 5,
      photos: [],
    },
  ];

  for (const session of sessions) {
    await prisma.session.create({
      data: { ...session, userId: demoUser.id },
    });
  }

  console.log(`🎿 Created ${sessions.length} sessions for demo user`);
  console.log('🎉 Seed completed successfully!');
  console.log(`\n  Demo account → email: ${DEMO_EMAIL}  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
