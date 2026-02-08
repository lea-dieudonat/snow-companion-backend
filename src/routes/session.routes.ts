import { Router } from 'express';
import { createSession, getAllSessions } from '../controllers/session.controller';

const router = Router();

router.post('/', createSession);
router.get('/', getAllSessions);

export default router;