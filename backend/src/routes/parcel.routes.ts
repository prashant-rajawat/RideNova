import { Router } from 'express';
import { parcelController } from '../controllers/parcel.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';

const router = Router();

// Customer / General Auth routes
router.post('/', requireAuth, parcelController.createParcel);
router.get('/', requireAuth, parcelController.getSenderParcels);
router.get('/:id', requireAuth, parcelController.getParcelById);
router.post('/:id/cancel', requireAuth, parcelController.cancelParcel);

// Driver routes
router.get('/driver/requests', requireAuth, requireRole('driver'), parcelController.getAvailableRequests);
router.post('/driver/:id/accept', requireAuth, requireRole('driver'), parcelController.acceptParcel);
router.get('/driver/active', requireAuth, requireRole('driver'), parcelController.getActiveParcel);
router.post('/driver/:id/verify-pickup', requireAuth, requireRole('driver'), parcelController.verifyPickupOtp);
router.patch('/driver/:id/status', requireAuth, requireRole('driver'), parcelController.updateStatus);
router.post('/driver/:id/verify-delivery', requireAuth, requireRole('driver'), parcelController.verifyDeliveryOtp);

// Admin routes
router.get('/admin/all', requireAuth, requireRole('admin'), parcelController.getAdminParcels);

export default router;
