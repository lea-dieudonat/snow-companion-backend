import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

export const getUserSessionsTool: AgentTool = {
  definition: {
    name: 'get_user_sessions',
    description:
      'Récupère l\'historique des sessions ski/snowboard de l\'utilisateur. ' +
      'Retourne les sessions avec station, conditions, tricks réussis, notes et rating. ' +
      'Inclut des statistiques agrégées : stations les plus fréquentées, conditions préférées, ' +
      'progression tricks, rating moyen. Utilise ce tool pour personnaliser les recommandations ' +
      'en te basant sur l\'historique réel du rider ("Tu avais noté 5/5 à Val Thorens...").',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre de sessions à retourner (défaut: 20, max: 50)',
        },
        station_id: {
          type: 'string',
          description: 'Filtrer par station (utilise le nom de la station, pas l\'ID)',
        },
        include_stats: {
          type: 'boolean',
          description: 'Inclure les statistiques agrégées (défaut: true)',
        },
      },
      required: [],
    },
  },

  execute: async (input, userId) => {
    const limit = Math.min(Number(input['limit'] ?? 20), 50);
    const stationFilter = input['station_id'] as string | undefined;
    const includeStats = input['include_stats'] !== false;

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        ...(stationFilter && {
          station: { contains: stationFilter, mode: 'insensitive' },
        }),
      },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        station: true,
        conditions: true,
        tricks: true,
        notes: true,
        rating: true,
        runCount: true,
        maxSpeed: true,
        totalDistance: true,
        verticalDrop: true,
      },
    });

    if (!includeStats) {
      return { sessions, count: sessions.length };
    }

    // Compute stats over all user sessions (not just the paginated slice)
    const allSessions = await prisma.session.findMany({
      where: { userId },
      select: { station: true, conditions: true, tricks: true, rating: true },
    });

    const stationFreq = allSessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.station] = (acc[s.station] ?? 0) + 1;
      return acc;
    }, {});

    const topStations = Object.entries(stationFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const conditionFreq = allSessions.reduce<Record<string, number>>((acc, s) => {
      if (s.conditions) acc[s.conditions] = (acc[s.conditions] ?? 0) + 1;
      return acc;
    }, {});
    const topConditions = Object.entries(conditionFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([condition, count]) => ({ condition, count }));

    const allTricks = allSessions.flatMap((s) => s.tricks);
    const trickFreq = allTricks.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const topTricks = Object.entries(trickFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([trick, count]) => ({ trick, count }));

    const ratings = allSessions.map((s) => s.rating).filter((r): r is number => r !== null);
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

    return {
      sessions,
      count: sessions.length,
      stats: {
        total_sessions: allSessions.length,
        top_stations: topStations,
        top_conditions: topConditions,
        top_tricks: topTricks,
        avg_rating: avgRating,
      },
    };
  },
};
