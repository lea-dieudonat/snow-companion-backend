import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

function describeWeatherCode(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 2) return 'Partiellement nuageux';
  if (code === 3) return 'Couvert';
  if (code <= 49) return 'Brouillard';
  if (code <= 55) return 'Bruine';
  if (code <= 65) return 'Pluie';
  if (code <= 75) return 'Neige';
  if (code <= 77) return 'Grains de neige';
  if (code <= 82) return 'Averses';
  if (code <= 86) return 'Averses de neige';
  if (code <= 99) return 'Orage';
  return 'Inconnu';
}

export const getWeatherTool: AgentTool = {
  definition: {
    name: 'get_weather',
    description:
      'Récupère les prévisions météo et enneigement pour une station de ski sur 7 jours. ' +
      'OBLIGATOIRE avant toute recommandation de station, date ou activité. ' +
      'Retourne température, chutes de neige prévues, vent, et un résumé des conditions.',
    input_schema: {
      type: 'object',
      properties: {
        station_id: {
          type: 'string',
          description: 'ID de la station (ex: "val-thorens", "les-2-alpes")',
        },
        days: {
          type: 'number',
          description: 'Nombre de jours de prévision (1-7, défaut: 7)',
        },
      },
      required: ['station_id'],
    },
  },

  execute: async (input) => {
    const stationId = input['station_id'] as string;
    const days = Math.min(Math.max(Number(input['days'] ?? 7), 1), 7);

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, latitude: true, longitude: true, altitudeMax: true },
    });

    if (!station) {
      return { error: `Station "${stationId}" introuvable dans la base de données.` };
    }

    const params = new URLSearchParams({
      latitude: station.latitude.toString(),
      longitude: station.longitude.toString(),
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,weather_code',
      forecast_days: days.toString(),
      timezone: 'Europe/Paris',
      wind_speed_unit: 'kmh',
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

    if (!response.ok) {
      return { error: `Erreur API météo (${response.status}). Réessaie plus tard.` };
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const d = data.daily;

    const forecast = d.time.map((date, i) => ({
      date,
      condition: describeWeatherCode(d.weather_code[i] ?? 0),
      temp_max: d.temperature_2m_max[i] ?? 0,
      temp_min: d.temperature_2m_min[i] ?? 0,
      snowfall_cm: d.snowfall_sum[i] ?? 0,
      precipitation_mm: d.precipitation_sum[i] ?? 0,
      wind_max_kmh: d.wind_speed_10m_max[i] ?? 0,
    }));

    const totalSnow = d.snowfall_sum.reduce((a, b) => a + b, 0);
    const snowDays = d.snowfall_sum.filter((s) => s > 0).length;

    return {
      station: station.name,
      station_id: station.id,
      altitude_max: station.altitudeMax,
      forecast,
      summary: {
        total_snowfall_cm: Math.round(totalSnow * 10) / 10,
        snow_days: snowDays,
        avg_temp_max:
          Math.round((d.temperature_2m_max.reduce((a, b) => a + b, 0) / days) * 10) / 10,
        best_day:
          forecast.length > 0
            ? forecast.reduce((best, day) => (day.snowfall_cm > best.snowfall_cm ? day : best))
            : null,
      },
    };
  },
};
