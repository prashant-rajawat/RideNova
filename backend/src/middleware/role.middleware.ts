import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.ts';

/**
 * Reusable Role-Based Access Control Middleware
 * Inspects req.user (loaded from the database via requireAuth).
 * Rejects unauthorized users with HTTP 403 FORBIDDEN.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If not authenticated first
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role verification.',
        },
      });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        },
      });
      return;
    }

    next();
  };
}
