import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';
import { rideRepository } from '../repositories/ride.repository.ts';

const router = Router();

// Enforce admin authentication
router.use(requireAuth, requireRole('admin'));

/**
 * GET /api/admin/overview
 * Aggregate operational metrics
 */
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await extendedRepository.getAdminOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/drivers
 * Retrieve full driver fleet with vehicle & status
 */
router.get('/drivers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const drivers = await extendedRepository.getAllDriversForAdmin();
    res.status(200).json({ success: true, data: drivers, count: drivers.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/drivers/:id/status
 * Approve, suspend or activate driver
 */
router.patch('/drivers/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['pending', 'approved', 'suspended', 'active'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be pending, approved, suspended, or active' },
      });
      return;
    }

    const updated = await extendedRepository.updateDriverStatusByAdmin(id, status);
    res.status(200).json({ success: true, message: `Driver status changed to '${status}'`, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/rides
 * Monitor all platform rides
 */
router.get('/rides', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rides = await rideRepository.getAllRides(status);
    res.status(200).json({ success: true, data: rides, count: rides.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/payments
 * Complete transaction ledger
 */
router.get('/payments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await extendedRepository.getAllPayments();
    res.status(200).json({ success: true, data: payments, count: payments.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/riders
 * User registry
 */
router.get('/riders', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const riders = await extendedRepository.getAllRidersForAdmin();
    res.status(200).json({ success: true, data: riders, count: riders.length });
  } catch (err) {
    next(err);
  }
});

export default router;
