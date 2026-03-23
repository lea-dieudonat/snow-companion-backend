import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

export const getSlopeConditionsTool: AgentTool = {
  definition: {
    name: 'get_slope_conditions',
    description:
      'Récupère les données live des pistes pour une ou plusieurs stations : remontées mécaniques ouvertes, ' +
      'pistes ouvertes, enneigement en bas et en haut, risque d\'avalanche, et horodatage de la dernière mise à jour. ' +
      'Appeler ce tool dès qu\'une station est mentionnée pour donner des informations de conditions actuelles.',
    input_schema: {
      type: 'object',
      properties: {
        station_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste des IDs de stations (1 à 5)',
        },
      },
      required: ['station_ids'],
    },
  },

  execute: async (input) => {
    const stationIds = input['station_ids'] as string[];

    if (!stationIds || stationIds.length === 0) {
      return { error: 'Fournir au moins un station_id.' };
    }

    const ids = stationIds.slice(0, 5);

    const stations = await prisma.station.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        liveData: true,
      },
    });

    return {
      conditions: stations.map((s) => {
        if (!s.liveData) {
          return {
            station_id: s.id,
            station_name: s.name,
            live_data_available: false,
          };
        }

        return {
          station_id: s.id,
          station_name: s.name,
          live_data_available: true,
          lifts_open: s.liveData.liftsOpen,
          lifts_total: s.liveData.liftsTotal,
          pistes_open: s.liveData.pistesOpen,
          pistes_total: s.liveData.pistesTotal,
          base_snow_depth_cm: s.liveData.baseSnowDepthCm,
          summit_snow_depth_cm: s.liveData.summitSnowDepthCm,
          avalanche_risk: s.liveData.avalancheRisk,
          updated_at: s.liveData.updatedAt,
        };
      }),
    };
  },
};
