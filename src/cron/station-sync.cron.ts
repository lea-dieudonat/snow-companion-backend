import cron, { type ScheduledTask } from 'node-cron';
import { runExclusive } from '@/cron/job-lock';
import { syncStationLiveData } from '@/services/station-sync.service';

export const STATION_SYNC_JOB = 'station-sync';

/** Lance la synchro si aucune autre instance ne la fait déjà (verrou PostgreSQL). */
export async function runStationSync(): Promise<void> {
  const ran = await runExclusive(STATION_SYNC_JOB, syncStationLiveData);
  if (!ran) console.log('[station-sync] Déjà en cours sur une autre instance, ignoré');
}

export function startStationSyncCron(): ScheduledTask {
  // Run at 6am, 12pm and 6pm every day
  const task = cron.schedule('0 6,12,18 * * *', async () => {
    console.log('[station-sync] Running scheduled sync...');
    try {
      await runStationSync();
    } catch (err) {
      console.error('[station-sync] Sync failed:', err);
    }
  });

  console.log('[station-sync] Cron scheduled (6am, 12pm, 6pm)');
  return task;
}
