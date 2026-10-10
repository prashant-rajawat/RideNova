import { Request, Response, NextFunction } from 'express';
import { sanitizeUser, userService } from '../services/user.service.ts';
import { UserRole } from '../types/index.ts';
import { config } from '../config/index.ts';

export const authController = {
  /**
   * GET /api/auth/me
   * Return the current authenticated application user.
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // Re-fetch latest from database
      const latestUser = await userService.getUserById(req.user.id);
      const userToSanitize = latestUser || req.user;

      res.status(200).json({
        success: true,
        data: sanitizeUser(userToSanitize),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/role
   * Return only the authenticated user's application role.
   */
  async getRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          role: req.user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/auth/profile
   * Safe profile update (name, phone). Ignores any attempted role/id manipulation.
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const { name, phone } = req.body || {};

      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Name cannot be empty.',
          },
        });
        return;
      }

      const updated = await userService.updateProfile(req.user.id, {
        name: typeof name === 'string' ? name.trim() : undefined,
        phone: typeof phone === 'string' ? phone.trim() : undefined,
      });

      res.status(200).json({
        success: true,
        data: sanitizeUser(updated),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/dev-promote
   * Controlled backend promotion mechanism for testing and development.
   * Only permitted in development/test environment.
   */
  async devPromote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      if (config.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Development promotion endpoint is disabled in production.',
          },
        });
        return;
      }

      const { targetRole } = req.body || {};

      if (!['rider', 'driver', 'admin'].includes(targetRole)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: "Target role must be 'rider', 'driver', or 'admin'.",
          },
        });
        return;
      }

      const updated = await userService.promoteUserRole(req.user.id, targetRole as UserRole);

      res.status(200).json({
        success: true,
        message: `User role successfully updated to ${targetRole}.`,
        data: sanitizeUser(updated),
      });
    } catch (error) {
      next(error);
    }
  },
};
