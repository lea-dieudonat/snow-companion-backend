import prisma from '@/config/prisma';
import { startStationPopulateCron } from '@/cron/station-populate.cron';
import { runStationSync, startStationSyncCron } from '@/cron/station-sync.cron';

const STALE_AFTER_MS = 12 * 60 * 60_000;

/** Démarre tous les crons et retourne une fonction qui les arrête. */
export function startCrons(): () => void {
  const tasks = [startStationSyncCron(), startStationPopulateCron()];
  return () => tasks.forEach((task) => task.stop());
}

/**
 * Au démarrage, ne synchronise que si les données live sont absentes ou périmées.
 * Évite de rappeler l'API open-piste pour 32 stations à chaque redéploiement.
 */
export async function syncLiveDataIfStale(maxAgeMs: number = STALE_AFTER_MS): Promise<boolean> {
  const latest = await prisma.stationLiveData.aggregate({ _max: { updatedAt: true } });
  const lastSync = latest._max.updatedAt;
  if (lastSync && Date.now() - lastSync.getTime() < maxAgeMs) return false;

  await runStationSync();
  return true;
}
