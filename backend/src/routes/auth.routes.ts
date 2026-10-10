import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { requireRole } from '../middleware/role.middleware.ts';

const router = Router();

// Current authenticated application user
router.get('/me', requireAuth, authController.getMe);

// Current user's application role only
router.get('/role', requireAuth, authController.getRole);

// Safe profile updates (name, phone)
router.patch('/profile', requireAuth, authController.updateProfile);

// Controlled backend promotion endpoint for development / testing
router.post('/dev-promote', requireAuth, authController.devPromote);

// Role-protected test routes for automated verification
router.get('/rider-test', requireAuth, requireRole('rider', 'driver', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to Rider route.',
    userRole: req.user?.role,
  });
});

router.get('/driver-test', requireAuth, requireRole('driver', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to Driver-only route.',
    userRole: req.user?.role,
  });
});

router.get('/admin-test', requireAuth, requireRole('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to Admin-only route.',
    userRole: req.user?.role,
  });
});

export default router;
