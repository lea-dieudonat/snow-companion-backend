import cron from 'node-cron';
import { populateStations } from '@/services/station-populate.service';

export function startStationPopulateCron(): void {
  // Run every Monday at 3am to discover and insert new French stations
  cron.schedule('0 3 * * 1', async () => {
    console.log('[station-populate] Running weekly station discovery...');
    try {
      const report = await populateStations();
      console.log(
        `[station-populate] Done — inserted: ${report.inserted.length}, enriched: ${report.enriched.length}, skipped: ${report.skipped.length}, errors: ${report.errors.length}`,
      );
      if (report.errors.length > 0) {
        for (const e of report.errors) {
          console.error(`[station-populate] Error for ${e.id}: ${e.error}`);
        }
      }
    } catch (err) {
      console.error('[station-populate] Failed:', err);
    }
  });

  console.log('[station-populate] Cron scheduled (every Monday at 3am)');
}
