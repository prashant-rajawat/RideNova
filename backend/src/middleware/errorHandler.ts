import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';
import { config } from '../config/index.ts';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled Application Error', {
    url: req.originalUrl,
    method: req.method,
    statusCode,
    message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'InternalServerError' : err.name || 'ApplicationError',
    message: statusCode === 500 && config.NODE_ENV === 'production' ? 'An unexpected error occurred.' : message,
    ...(config.NODE_ENV === 'development' && err.details ? { details: err.details } : {}),
  });
}
