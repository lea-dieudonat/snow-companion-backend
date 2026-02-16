import { Router } from 'express';
import { createSession, deleteSession, getAllSessions, updateSession } from '@/controllers/session.controller';

const router = Router();

router.post('/', createSession);
router.get('/', getAllSessions);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;