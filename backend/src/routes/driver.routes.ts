import { Router } from 'express';
import { driverController } from '../controllers/driver.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';

const router = Router();

// Driver role enforced across all driver routes
router.use(requireAuth, requireRole('driver'));

// Profile, KYC & Vehicle
router.get('/me', driverController.getProfile);
router.patch('/profile', driverController.updateProfile);
router.post('/kyc', driverController.updateKyc);
router.get('/vehicle', driverController.getVehicle);
router.post('/vehicle', driverController.updateVehicle);
router.put('/vehicle', driverController.updateVehicle);

// Online / Offline Availability & Location
router.patch('/availability', driverController.setAvailability);
router.patch('/location', driverController.updateLocation);

// Ride Requests
router.get('/requests', driverController.getRequests);
router.post('/rides/:id/accept', driverController.acceptRide);

// Active Ride & Status Updates
router.get('/active-ride', driverController.getActiveRide);
router.patch('/rides/:id/status', driverController.updateRideStatus);
router.post('/rides/:id/verify-otp', driverController.verifyOtp);

// History, Earnings & Payouts
router.get('/history', driverController.getHistory);
router.get('/earnings', driverController.getEarnings);
router.get('/payouts', driverController.getPayouts);
router.post('/payouts', driverController.requestPayout);

export default router;
