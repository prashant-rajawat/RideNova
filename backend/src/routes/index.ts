import { Router } from 'express';
import healthRoutes from './health.routes.ts';
import authRoutes from './auth.routes.ts';
import rideRoutes from './ride.routes.ts';
import driverRoutes from './driver.routes.ts';

const apiRouter = Router();

// Mount health routes under /api/health
apiRouter.use('/health', healthRoutes);

// Mount auth routes under /api/auth
apiRouter.use('/auth', authRoutes);

// Mount ride routes under /api/rides
apiRouter.use('/rides', rideRoutes);

// Mount driver routes under /api/driver
apiRouter.use('/driver', driverRoutes);

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
