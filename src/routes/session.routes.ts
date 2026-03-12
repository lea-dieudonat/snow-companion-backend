import { Router } from 'express';
import {
  createSession,
  deleteSession,
  getAllSessions,
  updateSession,
} from '@/controllers/session.controller';
import { authenticate } from '@/middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createSession);
router.get('/', getAllSessions);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;
