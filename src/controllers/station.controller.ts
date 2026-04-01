import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { StationQuerySchema, NearbyStationsSchema } from '@/schemas/station.schema';
import type { StationLiveData } from '@prisma/client';

function hasLiveData(liveData: StationLiveData | null): boolean {
  if (!liveData) return false;
  return (
    liveData.liftsOpen !== null ||
    liveData.liftsTotal !== null ||
    liveData.pistesOpen !== null ||
    liveData.pistesTotal !== null ||
    liveData.baseSnowDepthCm !== null ||
    liveData.summitSnowDepthCm !== null
  );
}

export const getAllStations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { region, maxPrice, minAltitude, search } = StationQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { temporarilyClosed: false };

    if (region) where.region = region;
    if (maxPrice !== undefined) where.avgAccommodationPrice = { lte: maxPrice };
    if (minAltitude !== undefined) where.altitudeMin = { gte: minAltitude };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { skiArea: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const stations = await prisma.station.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { liveData: true, skiArea: true },
    });

    res.status(200).json(stations.filter((s) => hasLiveData(s.liveData)));
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
    const station = await prisma.station.findFirst({
      where: { id, temporarilyClosed: false },
      include: {
        trips: {
          select: { id: true, name: true, startDate: true, endDate: true, status: true },
        },
        liveData: true,
        skiArea: true,
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

    const stations = await prisma.station.findMany({
      where: { temporarilyClosed: false },
      include: { liveData: true, skiArea: true },
    });

    const nearbyStations = stations
      .map((station) => ({
        ...station,
        distance: Math.round(
          calculateDistance(latitude, longitude, station.latitude, station.longitude),
        ),
      }))
      .filter((station) => station.distance <= maxDistance && hasLiveData(station.liveData))
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
