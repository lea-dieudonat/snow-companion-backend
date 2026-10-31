import { Router } from 'express';
import { chat } from '@/controllers/agent.controller';
import { authenticate } from '@/middlewares/auth';
import { createRateLimiter } from '@/middlewares/rateLimit';
import { env } from '@/config/env';

const router = Router();

const agentRateLimit = createRateLimiter({
  windowMs: env.agentRateLimitWindowMs,
  limit: env.agentRateLimitMax,
  message: 'Trop de requêtes. Réessaie dans une minute.',
});

router.use(authenticate);

router.post('/chat', agentRateLimit, chat);

export default router;
