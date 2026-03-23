import cron from 'node-cron';
import { syncStationLiveData } from '@/services/station-sync.service';

export function startStationSyncCron(): void {
  // Run at 6am, 12pm and 6pm every day
  cron.schedule('0 6,12,18 * * *', async () => {
    console.log('[station-sync] Running scheduled sync...');
    try {
      await syncStationLiveData();
    } catch (err) {
      console.error('[station-sync] Sync failed:', err);
    }
  });

  console.log('[station-sync] Cron scheduled (6am, 12pm, 6pm)');
}
