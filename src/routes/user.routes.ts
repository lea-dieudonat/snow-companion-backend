import { Router } from 'express';
import { getFavorites, addFavorite, removeFavorite } from '@/controllers/user.controller';
import { authenticate } from '@/middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/favorites', getFavorites);
router.post('/favorites/:stationId', addFavorite);
router.delete('/favorites/:stationId', removeFavorite);

export default router;
