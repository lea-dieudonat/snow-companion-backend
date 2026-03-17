import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@/middlewares/errorHandler';
import { env } from '@/config/env';

export interface AuthRequest extends Request {
  userId: string;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
};
