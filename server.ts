import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './backend/src/app.ts';
import { config } from './backend/src/config/index.ts';
import { logger } from './backend/src/utils/logger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = config.PORT || 3000;
  const isProduction = config.NODE_ENV === 'production';

  // Ensure PostgreSQL schema is up-to-date if database is configured
  try {
    const { isDatabaseConfigured } = await import('./backend/src/db/index.ts');
    if (isDatabaseConfigured()) {
      const { runMigrations } = await import('./backend/src/db/migrate.ts');
      const migrationRes = await runMigrations();
      logger.info('Database schema migration check completed', migrationRes);
    }
  } catch (migErr) {
    logger.warn('Non-fatal migration check warning on startup', {
      error: (migErr as Error).message,
    });
  }

  if (!isProduction) {
    // Mount Vite dev server middleware
    logger.info('Initializing Vite dev server middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    logger.info(`Serving production build from: ${distPath}`);
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`RideNova full-stack application running on http://0.0.0.0:${PORT}`);
    logger.info(`Backend API available at: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start RideNova server', { error: err.message, stack: err.stack });
  process.exit(1);
});
