import dotenv from 'dotenv';
dotenv.config();

import app from '@/app';
import { env } from '@/config/env';
import { startStationSyncCron } from '@/cron/station-sync.cron';
import { syncStationLiveData } from '@/services/station-sync.service';

app.listen(env.port, () => {
  console.log(`⚡️ Server is running at http://localhost:${env.port}`);

  startStationSyncCron();

  syncStationLiveData().catch((err) => {
    console.error('[station-sync] Initial sync failed:', err);
  });
});
