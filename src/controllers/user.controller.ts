import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { AuthRequest } from '@/middlewares/auth';
import { UpsertProfileSchema } from '@/schemas/user.schema';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

export const upsertProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const data = UpsertProfileSchema.parse(req.body);

    const prismaData = {
      ...data,
      primaryDiscipline: data.primaryDiscipline ?? null,
      freestyleLevel: data.freestyleLevel ?? null,
      snowPreference: data.snowPreference ?? null,
      offPiste: data.offPiste ?? null,
      level: data.level ?? null,
      withChildren: data.withChildren ?? null,
      budgetRange: data.budgetRange ?? null,
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: prismaData,
      create: { userId, ...prismaData },
    });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteStations: true },
    });

    if (currentUser?.favoriteStations.includes(stationId)) {
      res.status(200).json({ favoriteStations: currentUser.favoriteStations });
      return;
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
