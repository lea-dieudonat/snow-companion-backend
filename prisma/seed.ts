/// <reference types="node" />
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

// "Espace Killy (Tignes-Val d'Isère)" -> "espace-killy-tignes-val-d-isere"
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🌱 Starting seed...');

  // Lecture du fichier stations.json
  const stationsPath = path.join(__dirname, '../src/data/stations.json');
  const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));

  console.log(`📊 Found ${stationsData.length} stations to seed`);

  // Domaines skiables (relation SkiArea) : un par valeur distincte de ski_area
  const skiAreaIds = new Map<string, string>();
  for (const station of stationsData) {
    if (station.ski_area) skiAreaIds.set(station.ski_area, slugify(station.ski_area));
  }
  for (const [name, id] of skiAreaIds) {
    await prisma.skiArea.upsert({
      where: { id },
      update: { name },
      create: { id, name },
    });
  }
  console.log(`🏔️  Seeded ${skiAreaIds.size} ski areas`);

  // Seed des stations
  for (const station of stationsData) {
    const stationData = {
      name: station.name,
      region: station.region,
      altitudeMin: station.altitude_min,
      altitudeMax: station.altitude_max,
      latitude: station.latitude,
      longitude: station.longitude,
      snowCannons: station.snow_cannons,
      snowPark: station.snow_park ?? undefined,
      skiAreaId: station.ski_area ? slugify(station.ski_area) : null,
      passes: station.passes,
      avgAccommodationPrice: station.avg_accommodation_price,
      website: station.website,
      description: station.description,
      access: station.access,
      season: station.season,
      services: station.services,
      activities: station.activities,
    };

    await prisma.station.upsert({
      where: { id: station.id },
      update: stationData,
      create: { id: station.id, ...stationData },
    });
    console.log(`✅ Seeded station: ${station.name}`);
  }

  // ── Demo account ──────────────────────────────────────────────────────────
  // Jamais en production sauf SEED_DEMO=true ; mot de passe lu dans l'environnement.
  const seedDemoFlag = process.env['SEED_DEMO'];
  const demoEnabled =
    seedDemoFlag === 'true' || (seedDemoFlag !== 'false' && process.env['NODE_ENV'] !== 'production');
  const DEMO_PASSWORD = process.env['SEED_DEMO_PASSWORD'];

  if (!demoEnabled) {
    console.log('⏭️  Demo account skipped (production without SEED_DEMO=true, or SEED_DEMO=false)');
  } else if (!DEMO_PASSWORD) {
    console.log('⏭️  Demo account skipped (SEED_DEMO_PASSWORD is not set)');
  } else {
    await seedDemoAccount(DEMO_PASSWORD);
  }

  console.log('🎉 Seed completed successfully!');
}

async function seedDemoAccount(demoPassword: string) {
  const DEMO_EMAIL = 'demo@snowcompanion.app';

  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      password: hashedPassword,
      name: 'Léa Demo',
      favoriteStations: ['isola-2000', 'valberg', 'les-orres', 'auron'],
      level: ['intermediate', 'advanced'],
    },
    create: {
      email: DEMO_EMAIL,
      password: hashedPassword,
      name: 'Léa Demo',
      locationCity: 'Antibes',
      locationLatitude: 43.5804,
      locationLongitude: 7.1256,
      favoriteStations: ['isola-2000', 'valberg', 'les-orres', 'auron'],
      level: ['intermediate', 'advanced'],
    },
  });

  console.log(`👤 Upserted demo user: ${demoUser.email}`);

  // Delete existing sessions for idempotency
  await prisma.session.deleteMany({ where: { userId: demoUser.id } });

  const sessions = [
    {
      date: new Date('2026-01-10T09:00:00Z'),
      station: 'isola-2000',
      conditions: 'Neige fraîche, visibilité excellente',
      tricks: ['carving long radius', 'switch riding'],
      notes: 'Super journée, powder sur les pistes rouges du haut.',
      rating: 5,
      runCount: 17,
      maxSpeed: 74.6,
      totalDistance: 41.2,
      verticalDrop: 6850,
      photos: [],
    },
    {
      date: new Date('2026-01-18T08:30:00Z'),
      station: 'valberg',
      conditions: "Neige dure le matin, ramollie l'après-midi",
      tricks: ['stemm christie', 'christiania'],
      notes: 'Première fois sur la Vallée Blanche, inoubliable.',
      rating: 5,
      runCount: 14,
      maxSpeed: 68.1,
      totalDistance: 36.5,
      verticalDrop: 5920,
      photos: [],
    },
    {
      date: new Date('2026-01-25T10:00:00Z'),
      station: 'les-orres',
      conditions: 'Brouillard en altitude, bonne neige basse station',
      tricks: [],
      notes: "Journée mitigée à cause du brouillard, on s'est concentrés sur les bleues.",
      rating: 3,
      runCount: 9,
      maxSpeed: 52.4,
      totalDistance: 22.8,
      verticalDrop: 3580,
      photos: [],
    },
    {
      date: new Date('2026-02-07T09:00:00Z'),
      station: 'tignes',
      conditions: 'Poudreuse hors-piste après la chute de neige',
      tricks: ['jump small kicker', 'butter nose'],
      notes: 'Session freeride avec les copains. Snowpark débutant aussi testé.',
      rating: 4,
      runCount: 13,
      maxSpeed: 63.9,
      totalDistance: 31.4,
      verticalDrop: 5170,
      photos: [],
    },
    {
      date: new Date('2026-02-14T08:00:00Z'),
      station: 'auron',
      conditions: 'Grand soleil, neige travaillée mais correcte',
      tricks: ['carving short radius', 'pivot 180'],
      notes: "Ski de printemps avant l'heure, super ambiance sur le domaine.",
      rating: 4,
      runCount: 12,
      maxSpeed: 61.3,
      totalDistance: 28.9,
      verticalDrop: 4720,
      photos: [],
    },
    {
      date: new Date('2026-02-22T09:30:00Z'),
      station: 'meribel',
      conditions: 'Enneigement moyen, pistes bien damées',
      tricks: ['stemm christie'],
      notes: 'Découverte des 3 Vallées côté Méribel. Beaucoup de monde.',
      rating: 3,
      runCount: 10,
      maxSpeed: 55.7,
      totalDistance: 25.1,
      verticalDrop: 4010,
      photos: [],
    },
    {
      date: new Date('2026-03-08T08:00:00Z'),
      station: 'val-isere',
      conditions: 'Excellent enneigement, ciel bleu',
      tricks: ['carving long radius', 'switch riding', 'jump medium kicker'],
      notes: 'Meilleure session de la saison. Pistes de compétition au top.',
      rating: 5,
      runCount: 18,
      maxSpeed: 78.2,
      totalDistance: 44.7,
      verticalDrop: 7240,
      photos: [],
    },
  ];

  for (const { station: stationId, ...session } of sessions) {
    // Le texte affiché est le nom de la station ; stationId la relie à sa fiche
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { name: true },
    });
    await prisma.session.create({
      data: {
        ...session,
        station: station?.name ?? stationId,
        stationId: station ? stationId : null,
        userId: demoUser.id,
      },
    });
  }

  console.log(`🎿 Created ${sessions.length} sessions for demo user`);
  console.log(`  Demo account → email: ${DEMO_EMAIL}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
