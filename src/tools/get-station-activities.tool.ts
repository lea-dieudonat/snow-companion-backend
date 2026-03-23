import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

const ACTIVITY_LABELS: Record<string, string> = {
  snowshoeing: 'Raquettes',
  ice_skating: 'Patinoire',
  dog_sledding: 'Chiens de traîneau',
  snow_scooter: 'Scooter des neiges',
  paragliding: 'Parapente',
  snow_cart: 'Luge',
  sledding: 'Luge',
  ski_touring: 'Ski de randonnée',
  cross_country_skiing: 'Ski de fond',
  swimming: 'Piscine',
  spa: 'Spa',
  climbing: 'Escalade',
  via_ferrata: 'Via ferrata',
};

const SERVICE_LABELS: Record<string, string> = {
  ski_school: 'École de ski',
  equipment_rental: 'Location de matériel',
  child_care: 'Garderie enfants',
  medical_center: 'Centre médical',
  spa: 'Spa',
  nursery: 'Crèche',
  storage: 'Consigne',
  restaurant: "Restaurant d'altitude",
  wifi: 'WiFi',
};

// Weather-based filtering rules applied to activity recommendations
function applyWeatherContext(
  activities: string[],
  weather: {
    temperature?: number | undefined;
    wind_kmh?: number | undefined;
    snowfall_cm?: number | undefined;
  },
): { activity: string; label: string; recommended: boolean; note?: string }[] {
  return activities.map((a) => {
    let recommended = true;
    let note: string | undefined;

    if (a === 'paragliding') {
      if ((weather.wind_kmh ?? 0) > 60) {
        recommended = false;
        note = "Vent trop fort pour voler aujourd'hui";
      }
    }

    if (a === 'ice_skating') {
      if ((weather.temperature ?? -5) > -2) {
        recommended = true;
        note = 'Vérifier que la patinoire est ouverte (températures douces)';
      }
    }

    if (a === 'snowshoeing') {
      if ((weather.snowfall_cm ?? 0) > 20) {
        note = 'Conditions idéales — chute de neige fraîche';
      }
    }

    return {
      activity: a,
      label: ACTIVITY_LABELS[a] ?? a,
      recommended,
      ...(note && { note }),
    };
  });
}

export const getStationActivitiesTool: AgentTool = {
  definition: {
    name: 'get_station_activities',
    description:
      'Retourne les activités hors-ski et services disponibles dans une station. ' +
      'Utilise UNIQUEMENT les données de la base — ne jamais inventer restaurants, bars ou hébergements. ' +
      'Accepte optionnellement des données météo (température, vent, neige) pour contextualiser ' +
      'les recommandations : ex. déconseille le parapente si vent > 60 km/h, ' +
      'signale si la patinoire peut être fermée en cas de températures douces. ' +
      'Appeler get_weather en parallèle pour enrichir les recommandations.',
    input_schema: {
      type: 'object',
      properties: {
        station_id: {
          type: 'string',
          description: 'ID de la station',
        },
        temperature: {
          type: 'number',
          description: 'Température actuelle en °C (depuis get_weather)',
        },
        wind_kmh: {
          type: 'number',
          description: 'Vitesse du vent en km/h (depuis get_weather)',
        },
        snowfall_cm: {
          type: 'number',
          description: 'Chutes de neige prévues en cm (depuis get_weather)',
        },
      },
      required: ['station_id'],
    },
  },

  execute: async (input) => {
    const stationId = input['station_id'] as string;

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, activities: true, services: true },
    });

    if (!station) {
      return { error: `Station "${stationId}" introuvable.` };
    }

    const weather = {
      temperature: input['temperature'] as number | undefined,
      wind_kmh: input['wind_kmh'] as number | undefined,
      snowfall_cm: input['snowfall_cm'] as number | undefined,
    };

    const hasWeather = Object.values(weather).some((v) => v !== undefined);

    const activitiesWithContext = hasWeather
      ? applyWeatherContext(station.activities, weather)
      : station.activities.map((a) => ({
          activity: a,
          label: ACTIVITY_LABELS[a] ?? a,
          recommended: true,
        }));

    const services = station.services.map((s) => ({
      service: s,
      label: SERVICE_LABELS[s] ?? s,
    }));

    return {
      station: station.name,
      station_id: station.id,
      activities: activitiesWithContext,
      services,
      weather_context: hasWeather,
    };
  },
};
