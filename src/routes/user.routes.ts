import { Router } from 'express';
import { createUser } from '@/controllers/user.controller';

const router = Router();

router.post('/', createUser);
router.get('/:id/favorites', getFavorites);
router.post('/:id/favorites/:stationId', addFavorite);
router.delete('/:id/favorites/:stationId', removeFavorite);

export default router;