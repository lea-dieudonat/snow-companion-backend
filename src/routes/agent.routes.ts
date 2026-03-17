import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chat } from '@/controllers/agent.controller';
import { authenticate } from '@/middlewares/auth';
import { env } from '@/config/env';

const router = Router();

const agentRateLimit = rateLimit({
  windowMs: env.agentRateLimitWindowMs,
  max: env.agentRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes. Réessaie dans une minute.' },
});

router.use(authenticate);

router.post('/chat', agentRateLimit, chat);

export default router;
