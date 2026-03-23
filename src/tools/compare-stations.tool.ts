import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

interface SnowPark {
  available?: boolean;
  halfpipe?: boolean;
  rails?: boolean;
  kickers?: boolean;
  level?: string[];
}

interface Passes {
  full_day?: { adult?: number };
}

interface LiveData {
  liftsOpen: number | null;
  liftsTotal: number | null;
  pistesOpen: number | null;
  pistesTotal: number | null;
  baseSnowDepthCm: number | null;
  summitSnowDepthCm: number | null;
  avalancheRisk: number | null;
  updatedAt: Date;
}

interface ScoredStation {
  id: string;
  name: string;
  region: string;
  altitudeMax: number | null;
  kmSlopes: number | null;
  level: string[];
  snowPark: SnowPark | null;
  passes: Passes;
  liveData: LiveData | null;
  score: number;
  score_details: Record<string, number>;
  reasons: string[];
}

function scoreStation(
  station: {
    id: string;
    name: string;
    region: string;
    altitudeMax: number | null;
    altitudeMin: number | null;
    kmSlopes: number | null;
    level: string[];
    snowPark: unknown;
    passes: unknown;
    slopesDetail: unknown;
    activities: string[];
    liveData: LiveData | null;
  },
  profile: {
    rideStyles?: string[];
    freestyleLevel?: string | null;
    snowPreference?: string | null;
    offPiste?: boolean | null;
    level?: string | null;
    withChildren?: boolean | null;
    budgetRange?: string | null;
  } | null,
): ScoredStation {
  const sp = station.snowPark as SnowPark | null;
  const passes = station.passes as Passes;
  const levelOrder = ['beginner', 'intermediate', 'advanced'];
  const scoreDetails: Record<string, number> = {};
  const reasons: string[] = [];
  let total = 0;

  // Altitude score (higher = better for snow quality)
  if (station.altitudeMax !== null) {
    const altScore = Math.min(station.altitudeMax / 3600, 1) * 20;
    scoreDetails['altitude'] = Math.round(altScore);
    total += altScore;
    if (station.altitudeMax >= 2500) reasons.push(`Altitude élevée (${station.altitudeMax}m)`);
  }

  // Domain size
  if (station.kmSlopes !== null) {
    const sizeScore = Math.min(station.kmSlopes / 600, 1) * 15;
    scoreDetails['domain_size'] = Math.round(sizeScore);
    total += sizeScore;
  }

  if (!profile) {
    const ld = station.liveData;
    if (ld) {
      if (ld.liftsOpen !== null && ld.liftsTotal && ld.liftsTotal > 0) {
        const liftsScore = (ld.liftsOpen / ld.liftsTotal) * 15;
        scoreDetails['lifts_open'] = Math.round(liftsScore);
        total += liftsScore;
        reasons.push(`${ld.liftsOpen}/${ld.liftsTotal} remontées ouvertes`);
      }
      if (ld.summitSnowDepthCm !== null) {
        const snowScore = Math.min(ld.summitSnowDepthCm / 100, 1) * 10;
        scoreDetails['snow_depth'] = Math.round(snowScore);
        total += snowScore;
        if (ld.summitSnowDepthCm >= 50)
          reasons.push(`Enneigement sommet : ${ld.summitSnowDepthCm}cm`);
      }
    } else {
      scoreDetails['lifts_open'] = 0;
      scoreDetails['snow_depth'] = 0;
      reasons.push('Données live non disponibles');
    }
    return {
      ...station,
      snowPark: sp,
      passes,
      liveData: ld ?? null,
      score: Math.round(Math.max(total, 0)),
      score_details: scoreDetails,
      reasons,
    };
  }

  // Snow park match for freestyle riders
  const isFreestyle = profile.rideStyles?.includes('freestyle');
  if (isFreestyle) {
    if (sp?.available) {
      let parkScore = 25;
      if (profile.freestyleLevel && sp.level) {
        const userLevelIdx = levelOrder.indexOf(
          profile.freestyleLevel === 'beginner_park'
            ? 'beginner'
            : profile.freestyleLevel === 'competitor'
              ? 'advanced'
              : 'intermediate',
        );
        const stationMaxLevel = Math.max(...sp.level.map((l) => levelOrder.indexOf(l)));
        if (stationMaxLevel >= userLevelIdx) parkScore = 30;
        else parkScore = 10;
      }
      if (sp.halfpipe) {
        parkScore += 5;
        reasons.push('Halfpipe disponible');
      }
      scoreDetails['snow_park'] = parkScore;
      total += parkScore;
      reasons.push(`Snow park ${sp.level?.join('/')} — correspond à ton niveau`);
    } else {
      scoreDetails['snow_park'] = 0;
      reasons.push('Pas de snow park');
    }
  }

  // Freeride/offpiste match
  const isFreeride = profile.rideStyles?.includes('freeride') || profile.offPiste;
  if (isFreeride) {
    const slopesDetail = station.slopesDetail as { black?: number; red?: number } | null;
    const blackPct = slopesDetail
      ? (slopesDetail.black ?? 0) /
        Math.max((slopesDetail.black ?? 0) + (slopesDetail.red ?? 0) + 10, 1)
      : 0;
    const freerideScore = blackPct * 20;
    scoreDetails['freeride'] = Math.round(freerideScore);
    total += freerideScore;
    if (blackPct > 0.2) reasons.push('Bon terrain off-piste et pistes noires');
  }

  // Children-friendly services
  if (profile.withChildren) {
    const hasChildcare =
      station.activities.includes('child_care') || station.activities.includes('childcare');
    const childScore = hasChildcare ? 10 : 0;
    scoreDetails['family'] = childScore;
    total += childScore;
    if (hasChildcare) reasons.push('Garderie enfants disponible');
  }

  // Budget match
  const passPrice = passes.full_day?.adult;
  if (profile.budgetRange && passPrice !== undefined) {
    const budgetScores: Record<string, [number, number]> = {
      budget: [0, 35],
      mid: [30, 55],
      premium: [50, 999],
    };
    const [min, max] = budgetScores[profile.budgetRange] ?? [0, 999];
    const inBudget = passPrice >= min && passPrice <= max;
    const budgetScore = inBudget ? 10 : -5;
    scoreDetails['budget'] = budgetScore;
    total += budgetScore;
    if (inBudget) reasons.push(`Forfait ${passPrice}€ — dans ton budget`);
  }

  // Live conditions scoring
  const ld = station.liveData;
  if (ld) {
    if (ld.liftsOpen !== null && ld.liftsTotal && ld.liftsTotal > 0) {
      const liftsScore = (ld.liftsOpen / ld.liftsTotal) * 15;
      scoreDetails['lifts_open'] = Math.round(liftsScore);
      total += liftsScore;
      reasons.push(`${ld.liftsOpen}/${ld.liftsTotal} remontées ouvertes`);
    }
    if (ld.summitSnowDepthCm !== null) {
      const snowScore = Math.min(ld.summitSnowDepthCm / 100, 1) * 10;
      scoreDetails['snow_depth'] = Math.round(snowScore);
      total += snowScore;
      if (ld.summitSnowDepthCm >= 50)
        reasons.push(`Enneigement sommet : ${ld.summitSnowDepthCm}cm`);
    }
  } else {
    scoreDetails['lifts_open'] = 0;
    scoreDetails['snow_depth'] = 0;
    reasons.push('Données live non disponibles');
  }

  return {
    id: station.id,
    name: station.name,
    region: station.region,
    altitudeMax: station.altitudeMax,
    kmSlopes: station.kmSlopes,
    level: station.level,
    snowPark: sp,
    passes,
    liveData: ld ?? null,
    score: Math.round(Math.max(total, 0)),
    score_details: scoreDetails,
    reasons,
  };
}

export const compareStationsTool: AgentTool = {
  definition: {
    name: 'compare_stations',
    description:
      "Compare plusieurs stations et les classe selon le profil rider de l'utilisateur. " +
      'Score pondéré selon : snow park (freestyle), terrain off-piste (freeride), altitude, ' +
      'taille du domaine, budget, et services famille. ' +
      'Retourne un classement avec scores et raisons détaillées. ' +
      "Utilise ce tool quand l'utilisateur hésite entre plusieurs stations.",
    input_schema: {
      type: 'object',
      properties: {
        station_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste des IDs de stations à comparer (2-5 stations)',
        },
      },
      required: ['station_ids'],
    },
  },

  execute: async (input, userId) => {
    const stationIds = input['station_ids'] as string[];

    if (!stationIds || stationIds.length < 2) {
      return { error: 'Fournir au moins 2 stations à comparer.' };
    }

    const [stations, profile] = await Promise.all([
      prisma.station.findMany({
        where: { id: { in: stationIds } },
        select: {
          id: true,
          name: true,
          region: true,
          altitudeMin: true,
          altitudeMax: true,
          kmSlopes: true,
          level: true,
          snowPark: true,
          passes: true,
          slopesDetail: true,
          activities: true,
          services: true,
          liveData: true,
        },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    const scored = stations.map((s) => scoreStation(s, profile)).sort((a, b) => b.score - a.score);

    return {
      ranked: scored,
      profile_used: profile
        ? {
            rideStyles: profile.rideStyles,
            freestyleLevel: profile.freestyleLevel,
            offPiste: profile.offPiste,
            budgetRange: profile.budgetRange,
          }
        : null,
      note: !profile
        ? 'Profil rider non renseigné — scoring basé uniquement sur les caractéristiques des stations.'
        : undefined,
    };
  },
};
