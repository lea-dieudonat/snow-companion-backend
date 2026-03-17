import prisma from '@/config/prisma';
import type { AgentTool } from '@/types/agent.types';

interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    snowfall_sum: number[];
  };
}

async function fetchCurrentWeather(
  lat: number,
  lon: number,
): Promise<{ temperature: number; wind_kmh: number; snowfall_24h: number } | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,wind_speed_10m,weather_code',
      daily: 'snowfall_sum',
      forecast_days: '1',
      timezone: 'Europe/Paris',
      wind_speed_unit: 'kmh',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoCurrentResponse;
    return {
      temperature: data.current.temperature_2m,
      wind_kmh: data.current.wind_speed_10m,
      snowfall_24h: data.daily.snowfall_sum[0] ?? 0,
    };
  } catch {
    return null;
  }
}

export const getUserFavoritesTool: AgentTool = {
  definition: {
    name: 'get_user_favorites',
    description:
      'Récupère les stations favorites de l\'utilisateur avec leurs données complètes. ' +
      'Peut enrichir chaque station avec la météo actuelle en temps réel (température, vent, neige des dernières 24h). ' +
      'Utilise ce tool pour les alertes enneigement et les recommandations sur les favoris.',
    input_schema: {
      type: 'object',
      properties: {
        with_weather: {
          type: 'boolean',
          description: 'Enrichir chaque station avec la météo actuelle (défaut: false)',
        },
      },
      required: [],
    },
  },

  execute: async (input, userId) => {
    const withWeather = Boolean(input['with_weather']);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { favoriteStations: true },
    });

    if (user.favoriteStations.length === 0) {
      return { favorites: [], count: 0, message: 'Aucune station favorite enregistrée.' };
    }

    const stations = await prisma.station.findMany({
      where: { id: { in: user.favoriteStations } },
      select: {
        id: true,
        name: true,
        region: true,
        altitudeMin: true,
        altitudeMax: true,
        kmSlopes: true,
        level: true,
        snowPark: true,
        latitude: true,
        longitude: true,
        passes: true,
        activities: true,
        services: true,
      },
    });

    if (!withWeather) {
      return { favorites: stations, count: stations.length };
    }

    // Fetch weather for all favorites in parallel
    const favoritesWithWeather = await Promise.all(
      stations.map(async (station) => {
        const weather = await fetchCurrentWeather(station.latitude, station.longitude);
        return { ...station, weather };
      }),
    );

    return { favorites: favoritesWithWeather, count: favoritesWithWeather.length };
  },
};
