import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
}

/** Fabrique un limiteur de débit ; les refus répondent 429 `{ error }`. */
export const createRateLimiter = ({
  windowMs,
  limit,
  message,
}: RateLimiterOptions): RateLimitRequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
