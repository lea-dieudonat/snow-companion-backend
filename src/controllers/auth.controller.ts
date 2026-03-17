import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { RegisterSchema, LoginSchema } from '@/schemas/auth.schema';
import { AuthRequest } from '@/middlewares/auth';
import { env } from '@/config/env';

const signToken = (userId: string): string => {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'Email already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: { email: data.email, password: hashedPassword, name: data.name ?? null },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = signToken(user.id);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, favoriteStations: true, createdAt: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    });
  } catch (error) {
    next(error);
  }
};
