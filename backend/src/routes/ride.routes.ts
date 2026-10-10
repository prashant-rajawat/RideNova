import { Router } from 'express';
import { rideController } from '../controllers/ride.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';

const router = Router();

// POST /api/rides - Create a new ride request (Rider only)
router.post('/', requireAuth, requireRole('rider'), rideController.createRide);

// GET /api/rides - Get authenticated rider's rides
router.get('/', requireAuth, requireRole('rider', 'admin'), rideController.getRides);

// GET /api/rides/:id - Get specific ride details (Owner or admin only)
router.get('/:id', requireAuth, requireRole('rider', 'admin'), rideController.getRideById);

export default router;
