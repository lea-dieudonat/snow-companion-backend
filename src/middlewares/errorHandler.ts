import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Erreur portant un statut HTTP 4xx (http-errors, body-parser). */
const getClientErrorStatus = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const code = typeof status === 'number' ? status : statusCode;
  return typeof code === 'number' && code >= 400 && code < 500 ? code : undefined;
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Route introuvable' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors });
    return;
  }

  const type = (err as { type?: unknown }).type;
  if (err instanceof SyntaxError && type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corps de requête JSON invalide' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'Corps de requête trop volumineux' });
    return;
  }

  const clientStatus = getClientErrorStatus(err);
  if (clientStatus !== undefined) {
    res.status(clientStatus).json({ error: 'Requête invalide' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
