import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { CreateSessionSchema, UpdateSessionSchema } from '@/schemas/session.schema';
import { AuthRequest } from '@/middlewares/auth';
import { AppError } from '@/middlewares/errorHandler';

/** Retourne la fiche station ou lève un 404 : évite une erreur de clé étrangère (500). */
const findStationOrFail = async (stationId: string): Promise<{ id: string; name: string }> => {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true },
  });
  if (!station) throw new AppError(404, 'Station not found');
  return station;
};

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const data = CreateSessionSchema.parse(req.body);
    const linked = data.stationId ? await findStationOrFail(data.stationId) : null;

    const session = await prisma.session.create({
      data: {
        date: new Date(data.date),
        station: data.station ?? linked?.name ?? '',
        stationId: linked?.id ?? null,
        conditions: data.conditions ?? null,
        tricks: data.tricks ?? [],
        notes: data.notes ?? null,
        photos: data.photos ?? [],
        rating: data.rating ?? null,
        runCount: data.runCount ?? null,
        maxSpeed: data.maxSpeed ?? null,
        totalDistance: data.totalDistance ?? null,
        verticalDrop: data.verticalDrop ?? null,
        userId,
      },
    });

    res.status(201).json({ message: 'Session created successfully. 🏂', session });
  } catch (error) {
    next(error);
  }
};

export const getAllSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const id = req.params['id'] as string;
    const data = UpdateSessionSchema.parse(req.body);

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError(404, 'Session not found');
    }

    // stationId : null détache la session, une valeur la relie (et met le nom à jour si absent)
    const linked = data.stationId ? await findStationOrFail(data.stationId) : null;

    const session = await prisma.session.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.station ? { station: data.station } : linked && { station: linked.name }),
        ...(data.stationId !== undefined && { stationId: linked?.id ?? null }),
        ...(data.conditions !== undefined && { conditions: data.conditions }),
        ...(data.tricks !== undefined && { tricks: data.tricks }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.photos !== undefined && { photos: data.photos }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.runCount !== undefined && { runCount: data.runCount }),
        ...(data.maxSpeed !== undefined && { maxSpeed: data.maxSpeed }),
        ...(data.totalDistance !== undefined && { totalDistance: data.totalDistance }),
        ...(data.verticalDrop !== undefined && { verticalDrop: data.verticalDrop }),
      },
    });

    res.json({ message: 'Session updated successfully! 🏂', session });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const id = req.params['id'] as string;

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError(404, 'Session not found');
    }

    await prisma.session.delete({ where: { id } });

    res.json({ message: 'Session deleted successfully! 🗑️' });
  } catch (error) {
    next(error);
  }
};
