import prisma from '@/config/prisma';

const OPEN_PISTE_STATUS_URL = 'https://open-piste.raed.workers.dev/status';
const DELAY_MS = 100;

interface OpenPisteStatus {
  season_open: string | null;
  season_close: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncSeasonDates(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
}> {
  const stations = await prisma.station.findMany({
    where: { openPisteCovered: true },
    select: { id: true },
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const station of stations) {
    try {
      await sleep(DELAY_MS);

      const response = await fetch(`${OPEN_PISTE_STATUS_URL}/${station.id}`);
      if (!response.ok) {
        console.warn(`[season-sync] ${station.id}: HTTP ${response.status}`);
        skipped++;
        continue;
      }

      const data = (await response.json()) as OpenPisteStatus;

      if (!data.season_open && !data.season_close) {
        skipped++;
        continue;
      }

      await prisma.station.update({
        where: { id: station.id },
        data: {
          season: {
            ...(data.season_open && { start: data.season_open }),
            ...(data.season_close && { end: data.season_close }),
          },
        },
      });

      updated++;
    } catch (err) {
      console.error(`[season-sync] ${station.id}: ${String(err)}`);
      errors++;
    }
  }

  console.log(`[season-sync] Updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
  return { updated, skipped, errors };
}
