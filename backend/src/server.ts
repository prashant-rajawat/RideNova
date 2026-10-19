import { app } from './app.ts';
import { config } from './config/index.ts';
import { logger } from './utils/logger.ts';

const PORT = config.PORT || 3000;

async function bootstrap() {
  try {
    const { isDatabaseConfigured } = await import('./db/index.ts');
    if (isDatabaseConfigured()) {
      const { runMigrations } = await import('./db/migrate.ts');
      const migrationRes = await runMigrations();
      logger.info('Database schema migration check completed', migrationRes);
    }
  } catch (migErr) {
    logger.warn('Non-fatal migration check warning on startup', {
      error: (migErr as Error).message,
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`RideNova Backend Server running on http://0.0.0.0:${PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
    logger.info(`DB Health check: http://localhost:${PORT}/api/health/db`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received. Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap RideNova backend', { error: err.message });
  process.exit(1);
});
