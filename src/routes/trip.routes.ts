import { Router } from 'express';
import { getAllTrips, createTrip, updateTrip, deleteTrip } from '@/controllers/trip.controller';
import { authenticate } from '@/middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllTrips);
router.post('/', createTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

export default router;
