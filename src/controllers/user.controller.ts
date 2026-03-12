import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { CreateUserSchema } from '@/schemas/user.schema';

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = CreateUserSchema.parse(req.body);

    const user = await prisma.user.create({
      data: { email: data.email, name: data.name ?? null },
    });

    res.status(201).json({ message: 'User created successfully!', user });
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
    const user = await prisma.user.findUnique({
      where: { id: req.params['id'] as string },
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
    const { id, stationId } = req.params as { id: string; stationId: string };

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      throw new AppError(404, 'Station not found');
    }

    const user = await prisma.user.update({
      where: { id },
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
    const { id, stationId } = req.params as { id: string; stationId: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
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
