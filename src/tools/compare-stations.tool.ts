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

interface ScoredStation {
  id: string;
  name: string;
  region: string;
  altitudeMax: number;
  kmSlopes: number;
  level: string[];
  snowPark: SnowPark | null;
  passes: Passes;
  score: number;
  score_details: Record<string, number>;
  reasons: string[];
}

function scoreStation(
  station: {
    id: string;
    name: string;
    region: string;
    altitudeMax: number;
    altitudeMin: number;
    kmSlopes: number;
    level: string[];
    snowPark: unknown;
    passes: unknown;
    slopesDetail: unknown;
    activities: string[];
  },
  profile: {
    rideStyles?: string[];
    freestyleLevel?: string | null;
    snowPreference?: string | null;
    offPiste?: boolean;
    level?: string | null;
    withChildren?: boolean;
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
  const altScore = Math.min(station.altitudeMax / 3600, 1) * 20;
  scoreDetails['altitude'] = Math.round(altScore);
  total += altScore;
  if (station.altitudeMax >= 2500) reasons.push(`Altitude élevée (${station.altitudeMax}m)`);

  // Domain size
  const sizeScore = Math.min(station.kmSlopes / 600, 1) * 15;
  scoreDetails['domain_size'] = Math.round(sizeScore);
  total += sizeScore;

  if (!profile) {
    return { ...station, snowPark: sp, passes, score: Math.round(total), score_details: scoreDetails, reasons };
  }

  // Snow park match for freestyle riders
  const isFreestyle = profile.rideStyles?.includes('freestyle');
  if (isFreestyle) {
    if (sp?.available) {
      let parkScore = 25;
      if (profile.freestyleLevel && sp.level) {
        const userLevelIdx = levelOrder.indexOf(profile.freestyleLevel === 'beginner_park' ? 'beginner' : profile.freestyleLevel === 'competitor' ? 'advanced' : 'intermediate');
        const stationMaxLevel = Math.max(...sp.level.map((l) => levelOrder.indexOf(l)));
        if (stationMaxLevel >= userLevelIdx) parkScore = 30;
        else parkScore = 10;
      }
      if (sp.halfpipe) { parkScore += 5; reasons.push('Halfpipe disponible'); }
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
    const blackPct = slopesDetail ? ((slopesDetail.black ?? 0) / Math.max((slopesDetail.black ?? 0) + (slopesDetail.red ?? 0) + 10, 1)) : 0;
    const freerideScore = blackPct * 20;
    scoreDetails['freeride'] = Math.round(freerideScore);
    total += freerideScore;
    if (blackPct > 0.2) reasons.push('Bon terrain off-piste et pistes noires');
  }

  // Children-friendly services
  if (profile.withChildren) {
    const hasChildcare = station.activities.includes('child_care') || station.activities.includes('childcare');
    const childScore = hasChildcare ? 10 : 0;
    scoreDetails['family'] = childScore;
    total += childScore;
    if (hasChildcare) reasons.push('Garderie enfants disponible');
  }

  // Budget match
  const passPrice = passes.full_day?.adult;
  if (profile.budgetRange && passPrice !== undefined) {
    const budgetScores: Record<string, [number, number]> = {
      low: [0, 35],
      medium: [30, 55],
      high: [50, 999],
    };
    const [min, max] = budgetScores[profile.budgetRange] ?? [0, 999];
    const inBudget = passPrice >= min && passPrice <= max;
    const budgetScore = inBudget ? 10 : -5;
    scoreDetails['budget'] = budgetScore;
    total += budgetScore;
    if (inBudget) reasons.push(`Forfait ${passPrice}€ — dans ton budget`);
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
    score: Math.round(Math.max(total, 0)),
    score_details: scoreDetails,
    reasons,
  };
}

export const compareStationsTool: AgentTool = {
  definition: {
    name: 'compare_stations',
    description:
      'Compare plusieurs stations et les classe selon le profil rider de l\'utilisateur. ' +
      'Score pondéré selon : snow park (freestyle), terrain off-piste (freeride), altitude, ' +
      'taille du domaine, budget, et services famille. ' +
      'Retourne un classement avec scores et raisons détaillées. ' +
      'Utilise ce tool quand l\'utilisateur hésite entre plusieurs stations.',
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
        },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    const scored = stations
      .map((s) => scoreStation(s, profile))
      .sort((a, b) => b.score - a.score);

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
      note: !profile ? 'Profil rider non renseigné — scoring basé uniquement sur les caractéristiques des stations.' : undefined,
    };
  },
};
