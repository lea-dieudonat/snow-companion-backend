import { Request, Response } from 'express';
import prisma from '@/config/prisma';

// GET /api/stations - Récupérer toutes les stations (avec filtres optionnels)
export const getAllStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      region, 
      maxPrice, 
      minAltitude, 
      level,
      search 
    } = req.query;

    // Construction des filtres dynamiques
    const where: any = {};

    if (region) {
      where.region = region as string;
    }

    if (maxPrice) {
      where.avgAccommodationPrice = {
        lte: parseFloat(maxPrice as string),
      };
    }

    if (minAltitude) {
      where.altitudeMin = {
        gte: parseInt(minAltitude as string, 10),
      };
    }

    if (level) {
      where.level = {
        has: level as string,
      };
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { region: { contains: searchTerm, mode: 'insensitive' } },
        { skiArea: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const stations = await prisma.station.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/stations/:id - Récupérer une station par ID
export const getStationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        trips: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    res.status(200).json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/stations/nearby - Récupérer les stations proches d'une localisation
export const getNearbyStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, maxDistance = 300 } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const maxDist = parseFloat(maxDistance as string);

    // Récupérer toutes les stations
    const stations = await prisma.station.findMany();

    // Calculer la distance pour chaque station
    const stationsWithDistance = stations.map((station) => {
      const distance = calculateDistance(lat, lng, station.latitude, station.longitude);
      return {
        ...station,
        distance: Math.round(distance),
      };
    });

    // Filtrer par distance max et trier
    const nearbyStations = stationsWithDistance
      .filter((station) => station.distance <= maxDist)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json(nearbyStations);
  } catch (error) {
    console.error('Error fetching nearby stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fonction utilitaire : calcul de distance Haversine
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}