import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { StationQuerySchema, NearbyStationsSchema } from '@/schemas/station.schema';

export const getAllStations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { region, maxPrice, minAltitude, level, search } = StationQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {};

    if (region) where.region = region;
    if (maxPrice !== undefined) where.avgAccommodationPrice = { lte: maxPrice };
    if (minAltitude !== undefined) where.altitudeMin = { gte: minAltitude };
    if (level) where.level = { has: level };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { skiArea: { contains: search, mode: 'insensitive' } },
      ];
    }

    const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' } });

    res.status(200).json(stations);
  } catch (error) {
    next(error);
  }
};

export const getStationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        trips: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!station) {
      throw new AppError(404, 'Station not found');
    }

    res.status(200).json(station);
  } catch (error) {
    next(error);
  }
};

export const getNearbyStations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { latitude, longitude, maxDistance } = NearbyStationsSchema.parse(req.query);

    const stations = await prisma.station.findMany();

    const nearbyStations = stations
      .map((station) => ({
        ...station,
        distance: Math.round(
          calculateDistance(latitude, longitude, station.latitude, station.longitude),
        ),
      }))
      .filter((station) => station.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json(nearbyStations);
  } catch (error) {
    next(error);
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
