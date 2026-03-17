import { Router } from 'express';
import { chat } from '@/controllers/agent.controller';
import { authenticate } from '@/middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/chat', chat);

export default router;
