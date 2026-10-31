import { Router } from 'express';
import { register, login, me } from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth';
import { createRateLimiter } from '@/middlewares/rateLimit';
import { env } from '@/config/env';

const router = Router();

const authRateLimit = createRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax,
  message: 'Trop de tentatives. Réessaie plus tard.',
});

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', authenticate, me);

export default router;
