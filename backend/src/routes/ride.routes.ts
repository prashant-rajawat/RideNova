import { Router } from 'express';
import { rideController } from '../controllers/ride.controller.ts';
import { driverController } from '../controllers/driver.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';

const router = Router();

// POST /api/rides/route - Authoritative route calculation and fare preview
router.post('/route', rideController.previewRoute);

// POST /api/rides - Create a new ride request (Rider only)
router.post('/', requireAuth, requireRole('rider'), rideController.createRide);

// GET /api/rides - Get authenticated rider's rides
router.get('/', requireAuth, requireRole('rider', 'admin'), rideController.getRides);

// POST /api/rides/:id/accept - Atomically accept ride request (Driver only)
router.post('/:id/accept', requireAuth, requireRole('driver'), driverController.acceptRide);

// GET /api/rides/:id - Get specific ride details (Owner or admin only)
router.get('/:id', requireAuth, requireRole('rider', 'admin'), rideController.getRideById);

// POST /api/rides/:id/cancel - Cancel ride
router.post('/:id/cancel', requireAuth, requireRole('rider', 'driver', 'admin'), rideController.cancelRide);

// POST /api/rides/:id/pay - Process payment (Stripe test-mode / Card)
router.post('/:id/pay', requireAuth, requireRole('rider'), rideController.processPayment);

// POST /api/rides/:id/review - Submit post-ride driver review
router.post('/:id/review', requireAuth, requireRole('rider'), rideController.submitReview);

// GET /api/rides/:id/receipt - Get ride receipt
router.get('/:id/receipt', requireAuth, requireRole('rider', 'admin'), rideController.getReceipt);

export default router;
