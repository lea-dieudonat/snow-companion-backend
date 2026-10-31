import dotenv from 'dotenv';
dotenv.config();

import prisma from '@/config/prisma';
import { startCrons, syncLiveDataIfStale } from '@/cron';
import { onShutdown } from '@/utils/shutdown';

// Processus dédié aux tâches planifiées : pas de serveur HTTP, donc on peut
// faire tourner plusieurs instances web sans multiplier les crons.
const stopCrons = startCrons();
console.log('👷 Worker démarré (crons de synchronisation des stations)');

syncLiveDataIfStale().catch((err) => {
  console.error('[station-sync] Initial sync failed:', err);
});

onShutdown(async () => {
  stopCrons();
  await prisma.$disconnect();
});
