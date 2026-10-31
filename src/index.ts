import dotenv from 'dotenv';
dotenv.config();

import app from '@/app';
import prisma from '@/config/prisma';
import { env } from '@/config/env';
import { startCrons, syncLiveDataIfStale } from '@/cron';
import { onShutdown } from '@/utils/shutdown';

const stopCrons = env.runCrons ? startCrons() : () => undefined;

const server = app.listen(env.port, () => {
  console.log(`⚡️ Server is running at http://localhost:${env.port}`);

  if (env.runCrons) {
    syncLiveDataIfStale().catch((err) => {
      console.error('[station-sync] Initial sync failed:', err);
    });
  } else {
    console.log('[cron] Désactivés sur ce processus (RUN_CRONS=false) : utiliser le worker');
  }
});

onShutdown(async () => {
  stopCrons();
  // Arrête d'accepter des connexions et attend la fin des requêtes en cours
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
  await prisma.$disconnect();
});
