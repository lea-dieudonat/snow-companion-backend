import cron from 'node-cron';
import { syncSeasonDates } from '@/services/season-sync.service';

export function startSeasonSyncCron(): void {
  // Run on October 1st at 6am — once a year, before ski season opens
  cron.schedule('0 6 1 10 *', async () => {
    console.log('[season-sync] Running yearly season date sync...');
    try {
      await syncSeasonDates();
    } catch (err) {
      console.error('[season-sync] Sync failed:', err);
    }
  });

  console.log('[season-sync] Cron scheduled (October 1st at 6am)');
}
