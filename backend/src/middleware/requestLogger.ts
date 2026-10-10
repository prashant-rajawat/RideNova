import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log non-health requests or slow requests
    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip: ip || 'unknown',
    });
  });

  next();
}
