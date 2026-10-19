import { Router } from 'express';
import healthRoutes from './health.routes.ts';
import authRoutes from './auth.routes.ts';
import rideRoutes from './ride.routes.ts';
import driverRoutes from './driver.routes.ts';
import adminRoutes from './admin.routes.ts';
import supportRoutes from './support.routes.ts';
import promoRoutes from './promo.routes.ts';
import notificationRoutes from './notification.routes.ts';
import paymentRoutes from './payment.routes.ts';
import profileRoutes from './profile.routes.ts';

const apiRouter = Router();

// Mount health routes under /api/health
apiRouter.use('/health', healthRoutes);

// Mount auth routes under /api/auth
apiRouter.use('/auth', authRoutes);

// Mount ride routes under /api/rides
apiRouter.use('/rides', rideRoutes);

// Mount driver routes under /api/driver
apiRouter.use('/driver', driverRoutes);

// Mount admin routes under /api/admin
apiRouter.use('/admin', adminRoutes);

// Mount support routes under /api/support
apiRouter.use('/support', supportRoutes);

// Mount promo code routes under /api/promos
apiRouter.use('/promos', promoRoutes);

// Mount notification routes under /api/notifications
apiRouter.use('/notifications', notificationRoutes);

// Mount payment routes under /api/payments
apiRouter.use('/payments', paymentRoutes);

// Mount profile routes under /api/profile
apiRouter.use('/profile', profileRoutes);

// Public config route for client-side public API keys (Google Maps Platform browser key)
apiRouter.get('/config/maps', (_req, res) => {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
    '';
  res.json({
    success: true,
    apiKey,
    configured: Boolean(
      apiKey &&
        apiKey.length > 10 &&
        !apiKey.includes('YOUR_') &&
        !apiKey.includes('MY_')
    ),
  });
});

export default apiRouter;
