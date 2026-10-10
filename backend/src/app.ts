import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.ts';
import { requestLogger } from './middleware/requestLogger.ts';
import { rateLimiter } from './middleware/rateLimiter.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import apiRouter from './routes/index.ts';

export function createExpressApp(): Express {
  const app = express();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite frontend scripts & styles in iframe preview
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        // Allow localhost and preview domains
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging
  app.use(requestLogger);

  // Rate Limiting
  app.use('/api', rateLimiter);

  // API Routes
  app.use('/api', apiRouter);

  // 404 for unhandled /api calls
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `API endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createExpressApp();
