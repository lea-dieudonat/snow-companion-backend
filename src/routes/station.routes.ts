import { Router } from 'express';
import { getAllStations, getStationById, getNearbyStations } from '@/controllers/station.controller';

const router = Router();

// GET /api/stations - Récupérer toutes les stations (avec filtres optionnels)
router.get('/', getAllStations);

// GET /api/stations/nearby - Récupérer les stations proches d'une localisation
router.get('/nearby', getNearbyStations);

// GET /api/stations/:id - Récupérer une station par ID
router.get('/:id', getStationById);

export default router;