import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { AuthRequest } from '@/middlewares/auth';
import { CreateTripSchema, UpdateTripSchema } from '@/schemas/trip.schema';

export const getAllTrips = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;

    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        station: {
          select: { id: true, name: true, region: true, altitudeMin: true, altitudeMax: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};

export const createTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const data = CreateTripSchema.parse(req.body);

    // Vérifie que la station existe
    const station = await prisma.station.findUnique({ where: { id: data.stationId } });
    if (!station) {
      throw new AppError(404, 'Station introuvable');
    }

    const trip = await prisma.trip.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        stationId: data.stationId,
        userId,
        notes: data.notes ?? null,
        status: 'planned',
      },
      include: {
        station: {
          select: { id: true, name: true, region: true, altitudeMin: true, altitudeMax: true },
        },
      },
    });

    res.status(201).json({ message: 'Trip créé avec succès ! 🏔️', trip });
  } catch (error) {
    next(error);
  }
};

export const updateTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const id = req.params['id'] as string;
    const data = UpdateTripSchema.parse(req.body);

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError(404, 'Trip introuvable');
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.stationId && { stationId: data.stationId }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        station: {
          select: { id: true, name: true, region: true, altitudeMin: true, altitudeMax: true },
        },
      },
    });

    res.status(200).json({ message: 'Trip mis à jour ! 🏔️', trip });
  } catch (error) {
    next(error);
  }
};

export const deleteTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const id = req.params['id'] as string;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError(404, 'Trip introuvable');
    }

    await prisma.trip.delete({ where: { id } });

    res.status(200).json({ message: 'Trip supprimé ! 🗑️' });
  } catch (error) {
    next(error);
  }
};
