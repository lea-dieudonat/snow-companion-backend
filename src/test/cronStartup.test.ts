import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '@/config/prisma';

vi.mock('@/cron/station-sync.cron', () => ({
  runStationSync: vi.fn().mockResolvedValue(undefined),
  startStationSyncCron: vi.fn(),
}));
vi.mock('@/cron/station-populate.cron', () => ({ startStationPopulateCron: vi.fn() }));

import { syncLiveDataIfStale } from '@/cron';
import { runStationSync } from '@/cron/station-sync.cron';

const STATION_ID = 'val-thorens';

beforeEach(async () => {
  vi.mocked(runStationSync).mockClear();
  await prisma.stationLiveData.deleteMany({ where: { stationId: STATION_ID } });
});

afterEach(async () => {
  await prisma.stationLiveData.deleteMany({ where: { stationId: STATION_ID } });
});

describe('syncLiveDataIfStale', () => {
  it("synchronise quand aucune donnée live n'existe", async () => {
    const synced = await syncLiveDataIfStale();

    expect(synced).toBe(true);
    expect(runStationSync).toHaveBeenCalledTimes(1);
  });

  it('ne synchronise pas quand les données sont récentes', async () => {
    await prisma.stationLiveData.create({ data: { stationId: STATION_ID, liftsOpen: 10 } });

    const synced = await syncLiveDataIfStale();

    expect(synced).toBe(false);
    expect(runStationSync).not.toHaveBeenCalled();
  });

  it('synchronise quand les données sont plus vieilles que le seuil', async () => {
    await prisma.stationLiveData.create({ data: { stationId: STATION_ID, liftsOpen: 10 } });

    // Seuil de -1 ms : toute donnée existante est considérée comme périmée
    const synced = await syncLiveDataIfStale(-1);

    expect(synced).toBe(true);
    expect(runStationSync).toHaveBeenCalledTimes(1);
  });
});
