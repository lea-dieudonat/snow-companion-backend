import cron, { type ScheduledTask } from 'node-cron';
import { runExclusive } from '@/cron/job-lock';
import { populateStations } from '@/services/station-populate.service';

export const STATION_POPULATE_JOB = 'station-populate';

async function discoverStations(): Promise<void> {
  const report = await populateStations();
  console.log(
    `[station-populate] Done — inserted: ${report.inserted.length}, enriched: ${report.enriched.length}, skipped: ${report.skipped.length}, errors: ${report.errors.length}`,
  );
  for (const e of report.errors) {
    console.error(`[station-populate] Error for ${e.id}: ${e.error}`);
  }
}

export function startStationPopulateCron(): ScheduledTask {
  // Run every Monday at 3am to discover and insert new French stations
  const task = cron.schedule('0 3 * * 1', async () => {
    console.log('[station-populate] Running weekly station discovery...');
    try {
      const ran = await runExclusive(STATION_POPULATE_JOB, discoverStations);
      if (!ran) console.log('[station-populate] Déjà en cours sur une autre instance, ignoré');
    } catch (err) {
      console.error('[station-populate] Failed:', err);
    }
  });

  console.log('[station-populate] Cron scheduled (every Monday at 3am)');
  return task;
}
