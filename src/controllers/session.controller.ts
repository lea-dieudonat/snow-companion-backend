import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { CreateSessionSchema, UpdateSessionSchema } from '@/schemas/session.schema';

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = CreateSessionSchema.parse(req.body);

    const session = await prisma.session.create({
      data: {
        date: new Date(data.date),
        station: data.station,
        conditions: data.conditions ?? null,
        tricks: data.tricks ?? [],
        notes: data.notes ?? null,
        photos: data.photos ?? [],
        rating: data.rating ?? null,
        userId: data.userId,
      },
    });

    res.status(201).json({ message: 'Session created successfully. 🏂', session });
  } catch (error) {
    next(error);
  }
};

export const getAllSessions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
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
    const id = req.params['id'] as string;
    const data = UpdateSessionSchema.parse(req.body);

    const session = await prisma.session.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.station && { station: data.station }),
        ...(data.conditions !== undefined && { conditions: data.conditions }),
        ...(data.tricks !== undefined && { tricks: data.tricks }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.photos !== undefined && { photos: data.photos }),
        ...(data.rating !== undefined && { rating: data.rating }),
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
    const id = req.params['id'] as string;

    await prisma.session.delete({ where: { id } });

    res.json({ message: 'Session deleted successfully! 🗑️' });
  } catch (error) {
    next(error);
  }
};
