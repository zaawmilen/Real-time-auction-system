import { Router } from 'express';
import {
  getVehicles, getVehicle, getVehicleByVin,
  createVehicle, createVehicleValidation,
  updateVehicle, deleteVehicle, getVehicleStats
} from './vehicles.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// GET /api/vehicles/stats
router.get('/stats', getVehicleStats);

// GET /api/vehicles
router.get('/', getVehicles);

// GET /api/vehicles/:id
router.get('/:id', getVehicle);

// GET /api/vehicles/vin/:vin
router.get('/vin/:vin', getVehicleByVin);

// POST /api/vehicles — admin/auctioneer only
router.post('/', authenticate, requireRole('admin', 'auctioneer'), createVehicleValidation, createVehicle);

// PUT /api/vehicles/:id
router.put('/:id', authenticate, requireRole('admin', 'auctioneer'), updateVehicle);

// DELETE /api/vehicles/:id
router.delete('/:id', authenticate, requireRole('admin'), deleteVehicle);

export default router;
