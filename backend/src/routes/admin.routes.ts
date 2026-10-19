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
 * GET /api/admin/drivers/:id/profile
 * Get complete driver profile, vehicle, and documents
 */
router.get('/drivers/:id/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const details = await extendedRepository.getDriverDetailsForAdmin(req.params.id);
    if (!details) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver partner not found' } });
      return;
    }
    res.status(200).json({ success: true, data: details });
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
    const { status, rejectionReason } = req.body;
    if (!status || !['pending', 'approved', 'suspended', 'active'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be pending, approved, suspended, or active' },
      });
      return;
    }

    const updated = await extendedRepository.updateDriverStatusByAdmin(id, status, rejectionReason);
    res.status(200).json({ success: true, message: `Driver status changed to '${status}'`, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/rides
 * Monitor all platform rides with diagnostic logging
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
 * GET /api/admin/diagnostics
 * Safe database and system health verification for Admin console
 */
router.get('/diagnostics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { testConnection, isDatabaseConfigured, query } = await import('../db/index.ts');
    const dbTest = await testConnection();
    let ridesCount = 0;
    let driversCount = 0;
    let usersCount = 0;
    let paymentsCount = 0;

    if (isDatabaseConfigured() && dbTest.connected) {
      try {
        const rCount = await query(`SELECT COUNT(*) as count FROM rides`);
        ridesCount = parseInt(rCount.rows[0]?.count || '0', 10);
        const dCount = await query(`SELECT COUNT(*) as count FROM drivers`);
        driversCount = parseInt(dCount.rows[0]?.count || '0', 10);
        const uCount = await query(`SELECT COUNT(*) as count FROM users`);
        usersCount = parseInt(uCount.rows[0]?.count || '0', 10);
        const pCount = await query(`SELECT COUNT(*) as count FROM payments`);
        paymentsCount = parseInt(pCount.rows[0]?.count || '0', 10);
      } catch {
        // ignore count queries if tables not yet populated
      }
    } else {
      const allRides = await rideRepository.getAllRides();
      ridesCount = allRides.length;
    }

    res.status(200).json({
      success: true,
      data: {
        databaseConfigured: isDatabaseConfigured(),
        databaseConnected: dbTest.connected,
        dbMessage: dbTest.message,
        latencyMs: dbTest.latencyMs || 0,
        ridesCount,
        driversCount,
        usersCount,
        paymentsCount,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/rides/:id
 * Retrieve specific ride audit details
 */
router.get('/rides/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ride = await rideRepository.findById(id);
    if (!ride) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
      return;
    }
    res.status(200).json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/rides/:id/assign-driver
 * Admin assigns or reassigns an approved driver to an active/requested ride
 */
router.post('/rides/:id/assign-driver', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    if (!driverId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'driverId is required' } });
      return;
    }
    const updated = await rideRepository.adminAssignDriver(id, driverId);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Driver assigned successfully', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/rides/:id/status
 * Admin status override / cancellation
 */
router.patch('/rides/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Status is required' } });
      return;
    }
    const updated = await rideRepository.adminUpdateRideStatus(id, status, reason);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
      return;
    }
    res.status(200).json({ success: true, message: `Ride status updated to '${status}'`, data: updated });
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

/**
 * GET /api/admin/riders/:id/profile
 * Full customer profile details, emergency contacts, safety preferences & ride history
 */
router.get('/riders/:id/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const details = await extendedRepository.getRiderDetailsForAdmin(id);
    if (!details) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rider not found' } });
      return;
    }
    res.status(200).json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
});

export default router;
