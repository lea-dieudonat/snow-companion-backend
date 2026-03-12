import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { AuthRequest } from '@/middlewares/auth';

export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteStations: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const stations = await prisma.station.findMany({
      where: { id: { in: user.favoriteStations } },
      orderBy: { name: 'asc' },
    });

    res.status(200).json(stations);
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const stationId = req.params['stationId'] as string;

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      throw new AppError(404, 'Station not found');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { favoriteStations: { push: stationId } },
      select: { favoriteStations: true },
    });

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const stationId = req.params['stationId'] as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        favoriteStations: { set: user.favoriteStations.filter((sid) => sid !== stationId) },
      },
      select: { favoriteStations: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
