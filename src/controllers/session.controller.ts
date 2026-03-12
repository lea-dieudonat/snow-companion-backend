import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/prisma';
import { CreateSessionDTO } from '@/types/session.types';
import { AppError } from '@/middlewares/errorHandler';

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date, station, conditions, tricks, notes, photos, rating, userId }: CreateSessionDTO =
      req.body;

    if (!date || !station || !userId) {
      throw new AppError(400, 'Date, station, and userId are required.');
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new AppError(400, 'Rating must be between 1 and 5.');
    }

    const session = await prisma.session.create({
      data: {
        date: new Date(date),
        station,
        conditions: conditions || null,
        tricks: tricks || [],
        notes: notes || null,
        photos: photos || [],
        rating: rating || null,
        userId,
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
    const { id } = req.params;
    const { date, station, conditions, tricks, notes, photos, rating } = req.body;

    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      throw new AppError(400, 'Rating must be between 1 and 5.');
    }

    const session = await prisma.session.update({
      where: { id: id as string },
      data: {
        ...(date && { date: new Date(date) }),
        ...(station && { station }),
        ...(conditions !== undefined && { conditions }),
        ...(tricks !== undefined && { tricks }),
        ...(notes !== undefined && { notes }),
        ...(photos !== undefined && { photos }),
        ...(rating !== undefined && { rating }),
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
    const { id } = req.params;

    await prisma.session.delete({ where: { id: id as string } });

    res.json({ message: 'Session deleted successfully! 🗑️' });
  } catch (error) {
    next(error);
  }
};
