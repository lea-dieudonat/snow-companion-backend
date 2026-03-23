import prisma from '@/config/prisma';

const OPEN_PISTE_URL = 'https://open-piste.raed.workers.dev/resorts';

interface OpenPisteResort {
  slug: string;
  lifts_open: number | null;
  lifts_total: number | null;
  pistes_open: number | null;
  pistes_total: number | null;
  base_snow_depth_cm: number | null;
  summit_snow_depth_cm: number | null;
  avalanche_risk: number | null;
  updated_at: string | null;
}

export async function syncStationLiveData(): Promise<void> {
  const response = await fetch(OPEN_PISTE_URL);
  if (!response.ok) {
    throw new Error(`open-piste API error: ${response.status} ${response.statusText}`);
  }

  const resorts = (await response.json()) as OpenPisteResort[];
  const resortMap = new Map(resorts.map((r) => [r.slug, r]));

  const stations = await prisma.station.findMany({ select: { id: true } });

  let updated = 0;
  let notFound = 0;

  for (const station of stations) {
    const resort = resortMap.get(station.id);

    await prisma.stationLiveData.upsert({
      where: { stationId: station.id },
      create: {
        stationId: station.id,
        liftsOpen: resort?.lifts_open ?? null,
        liftsTotal: resort?.lifts_total ?? null,
        pistesOpen: resort?.pistes_open ?? null,
        pistesTotal: resort?.pistes_total ?? null,
        baseSnowDepthCm: resort?.base_snow_depth_cm ?? null,
        summitSnowDepthCm: resort?.summit_snow_depth_cm ?? null,
        avalancheRisk: resort?.avalanche_risk ?? null,
      },
      update: {
        liftsOpen: resort?.lifts_open ?? null,
        liftsTotal: resort?.lifts_total ?? null,
        pistesOpen: resort?.pistes_open ?? null,
        pistesTotal: resort?.pistes_total ?? null,
        baseSnowDepthCm: resort?.base_snow_depth_cm ?? null,
        summitSnowDepthCm: resort?.summit_snow_depth_cm ?? null,
        avalancheRisk: resort?.avalanche_risk ?? null,
      },
    });

    if (resort) {
      updated++;
    } else {
      notFound++;
    }
  }

  console.log(`[station-sync] Updated: ${updated}, not found in API: ${notFound}`);
}
