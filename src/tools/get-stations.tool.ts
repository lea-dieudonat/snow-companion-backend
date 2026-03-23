import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';
import type { Prisma } from '@prisma/client';

export const getStationsTool: AgentTool = {
  definition: {
    name: 'get_stations',
    description:
      'Recherche et filtre les stations de ski françaises dans la base de données. ' +
      "Supporte le filtrage par région, niveau, présence d'un snow park (et son niveau), " +
      'activités disponibles, prix maximum du forfait, et altitude minimale. ' +
      'Utilise ce tool pour trouver des stations correspondant au profil et aux critères du rider.',
    input_schema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description:
            'Région (ex: "Savoie", "Isère", "Haute-Savoie", "Hautes-Alpes", "Pyrénées-Orientales")',
        },
        level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          description: 'Niveau de ski requis',
        },
        has_snow_park: {
          type: 'boolean',
          description: 'Filtrer uniquement les stations avec un snow park',
        },
        snow_park_level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Niveau minimum du snow park',
        },
        has_halfpipe: {
          type: 'boolean',
          description: 'Filtrer les stations avec un halfpipe',
        },
        activity: {
          type: 'string',
          description:
            'Activité hors-ski disponible (ex: "snowshoeing", "ice_skating", "dog_sledding", "paragliding")',
        },
        max_pass_price: {
          type: 'number',
          description: 'Prix maximum du forfait adulte journée en euros',
        },
        min_altitude: {
          type: 'number',
          description: 'Altitude maximale minimale en mètres',
        },
        only_open: {
          type: 'boolean',
          description:
            'Si true, retourne uniquement les stations avec au moins une remontée mécanique ouverte',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut: 10)',
        },
      },
      required: [],
    },
  },

  execute: async (input) => {
    const where: Prisma.StationWhereInput = {};

    if (input['region'])
      where.region = { contains: input['region'] as string, mode: 'insensitive' };
    if (input['level']) where.level = { has: input['level'] as string };
    if (input['activity']) where.activities = { has: input['activity'] as string };
    if (input['max_pass_price']) {
      where.passes = {
        path: ['full_day', 'adult'],
        lte: input['max_pass_price'] as number,
      };
    }
    if (input['min_altitude']) where.altitudeMax = { gte: input['min_altitude'] as number };

    const stations = await prisma.station.findMany({
      where,
      select: {
        id: true,
        name: true,
        region: true,
        altitudeMin: true,
        altitudeMax: true,
        kmSlopes: true,
        level: true,
        snowPark: true,
        activities: true,
        services: true,
        passes: true,
        skiArea: true,
        slopesDetail: true,
        liveData: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter out stations with no live data (mirrors HTTP controller logic)
    let filtered = stations.filter((s) => {
      const ld = s.liveData;
      if (!ld) return false;
      return (
        ld.liftsOpen !== null ||
        ld.liftsTotal !== null ||
        ld.pistesOpen !== null ||
        ld.pistesTotal !== null ||
        ld.baseSnowDepthCm !== null ||
        ld.summitSnowDepthCm !== null
      );
    });

    if (input['has_snow_park']) {
      filtered = filtered.filter((s) => {
        const sp = s.snowPark as { available?: boolean } | null;
        return sp?.available === true;
      });
    }

    if (input['snow_park_level']) {
      const wantedLevel = input['snow_park_level'] as string;
      const levelOrder = ['beginner', 'intermediate', 'advanced'];
      filtered = filtered.filter((s) => {
        const sp = s.snowPark as { available?: boolean; level?: string[] } | null;
        if (!sp?.available || !sp.level) return false;
        return sp.level.some((l) => levelOrder.indexOf(l) >= levelOrder.indexOf(wantedLevel));
      });
    }

    if (input['has_halfpipe']) {
      filtered = filtered.filter((s) => {
        const sp = s.snowPark as { halfpipe?: boolean } | null;
        return sp?.halfpipe === true;
      });
    }

    if (input['only_open']) {
      filtered = filtered.filter((s) => s.liveData && (s.liveData.liftsOpen ?? 0) > 0);
    }

    const limit = Math.min(Number(input['limit'] ?? 10), 20);
    return {
      count: filtered.length,
      stations: filtered.slice(0, limit),
    };
  },
};
