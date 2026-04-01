import { Prisma } from '@prisma/client';

import prisma from '@/config/prisma';

const OPEN_PISTE_BASE = 'https://open-piste.raed.workers.dev';
const THROTTLE_MS = 200;

interface OpenPisteWeather {
  green_open: number | null;
  green_total: number | null;
  blue_open: number | null;
  blue_total: number | null;
  red_open: number | null;
  red_total: number | null;
  black_open: number | null;
  black_total: number | null;
  pistes_open: number | null;
  pistes_total: number | null;
  lifts_open: number | null;
  lifts_total: number | null;
  base_snow_depth_cm: number | null;
  summit_snow_depth_cm: number | null;
  avalanche_risk: number | null;
  updated_at: string | null;
}

interface OpenPisteResortDetail {
  slug: string;
  season_open: string | null;
  season_close: string | null;
  weather: OpenPisteWeather;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchResort(slug: string): Promise<OpenPisteResortDetail | null> {
  const response = await fetch(`${OPEN_PISTE_BASE}/resorts/${slug}`);
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<OpenPisteResortDetail>;
}

export async function syncStationLiveData(): Promise<void> {
  const stations = await prisma.station.findMany({
    where: { openPisteCovered: true },
    select: { id: true },
  });

  let updated = 0;
  let notFound = 0;

  for (const station of stations) {
    const resort = await fetchResort(station.id);

    if (resort) {
      const w = resort.weather;

      const slopesDetail: Prisma.InputJsonValue | typeof Prisma.DbNull =
        w.green_total || w.blue_total || w.red_total || w.black_total
          ? {
              green: w.green_total,
              blue: w.blue_total,
              red: w.red_total,
              black: w.black_total,
            }
          : Prisma.DbNull;

      const slopesOpen: Prisma.InputJsonValue | typeof Prisma.DbNull =
        w.green_open !== null ||
        w.blue_open !== null ||
        w.red_open !== null ||
        w.black_open !== null
          ? {
              green: w.green_open,
              blue: w.blue_open,
              red: w.red_open,
              black: w.black_open,
            }
          : Prisma.DbNull;

      await prisma.stationLiveData.upsert({
        where: { stationId: station.id },
        create: {
          stationId: station.id,
          liftsOpen: w.lifts_open,
          liftsTotal: w.lifts_total,
          pistesOpen: w.pistes_open,
          pistesTotal: w.pistes_total,
          baseSnowDepthCm: w.base_snow_depth_cm,
          summitSnowDepthCm: w.summit_snow_depth_cm,
          avalancheRisk: w.avalanche_risk,
          slopesDetail,
          slopesOpen,
        },
        update: {
          liftsOpen: w.lifts_open,
          liftsTotal: w.lifts_total,
          pistesOpen: w.pistes_open,
          pistesTotal: w.pistes_total,
          baseSnowDepthCm: w.base_snow_depth_cm,
          summitSnowDepthCm: w.summit_snow_depth_cm,
          avalancheRisk: w.avalanche_risk,
          slopesDetail,
          slopesOpen,
        },
      });

      if (resort.season_open || resort.season_close) {
        await prisma.station.update({
          where: { id: station.id },
          data: {
            season: {
              start: resort.season_open,
              end: resort.season_close,
            },
          },
        });
      }

      updated++;
    } else {
      notFound++;
    }

    await sleep(THROTTLE_MS);
  }

  console.log(`[station-sync] Updated: ${updated}, not found in API: ${notFound}`);
}
