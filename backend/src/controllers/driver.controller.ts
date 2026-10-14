import { Request, Response, NextFunction } from 'express';
import {
  driverService,
  ConflictError,
  ValidationError,
} from '../services/driver.service.ts';
import {
  updateDriverProfileSchema,
  vehicleSchema,
  toggleAvailabilitySchema,
  updateRideStatusSchema,
  updateDriverLocationSchema,
} from '../validators/driver.validator.ts';

export const driverController = {
  /**
   * GET /api/driver/me
   * Return the authenticated driver's profile and vehicle
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const profile = await driverService.getDriverProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/driver/profile
   * Update driver profile details (name, phone, license)
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const parsed = updateDriverProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parsed.error.issues[0]?.message || 'Invalid profile data',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const updated = await driverService.updateDriverProfile(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: 'Driver profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/driver/vehicle
   * Get driver's current vehicle details
   */
  async getVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const profile = await driverService.getDriverProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile.vehicle,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST/PUT /api/driver/vehicle
   * Upsert driver's vehicle registration
   */
  async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const parsed = vehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VEHICLE_DATA',
            message: parsed.error.issues[0]?.message || 'Invalid vehicle information',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const vehicle = await driverService.updateVehicle(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: 'Vehicle information saved successfully',
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/driver/availability
   * Toggle driver online/offline status
   */
  async setAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const parsed = toggleAvailabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parsed.error.issues[0]?.message || 'Invalid availability parameters',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const updated = await driverService.setAvailability(
        req.user.id,
        parsed.data.isOnline,
        parsed.data.latitude,
        parsed.data.longitude
      );

      res.status(200).json({
        success: true,
        message: updated.isOnline
          ? 'You are now online and ready to receive ride requests.'
          : 'You are now offline.',
        data: {
          isOnline: updated.isOnline,
          status: updated.status,
          currentLatitude: updated.currentLatitude,
          currentLongitude: updated.currentLongitude,
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  },

  /**
   * PATCH /api/driver/location
   * Update driver live GPS location coordinates
   */
  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const parsed = updateDriverLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: parsed.error.issues[0]?.message || 'Invalid location coordinates',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const updated = await driverService.updateLocation(
        req.user.id,
        parsed.data.latitude,
        parsed.data.longitude
      );

      res.status(200).json({
        success: true,
        message: 'Driver location updated successfully.',
        data: {
          currentLatitude: updated?.current_latitude,
          currentLongitude: updated?.current_longitude,
          updatedAt: updated?.updated_at,
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  },

  /**
   * GET /api/driver/requests
   * View incoming available ride requests
   */
  async getRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const excludeIds = typeof req.query.exclude === 'string' ? req.query.exclude.split(',') : [];
      const requests = await driverService.getAvailableRequests(req.user.id, excludeIds);

      res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rides/:id/accept or POST /api/driver/rides/:id/accept
   * Secure atomic ride acceptance
   */
  async acceptRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Ride ID is required' },
        });
        return;
      }

      const acceptedRide = await driverService.acceptRide(req.user.id, id);

      res.status(200).json({
        success: true,
        message: 'Ride accepted successfully! Proceed to pickup location.',
        data: acceptedRide,
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      if ((error as Error).message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: (error as Error).message,
          },
        });
        return;
      }
      next(error);
    }
  },

  /**
   * GET /api/driver/active-ride
   * Get currently active ride for driver
   */
  async getActiveRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const activeRide = await driverService.getActiveRide(req.user.id);
      res.status(200).json({
        success: true,
        data: activeRide,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/driver/rides/:id/status
   * Advance ride lifecycle status
   */
  async updateRideStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { id } = req.params;
      const parsed = updateRideStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: parsed.error.issues[0]?.message || 'Invalid status transition',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const updated = await driverService.updateRideStatus(
        req.user.id,
        id,
        parsed.data.status,
        parsed.data.cancellationReason
      );

      res.status(200).json({
        success: true,
        message: `Ride status updated to '${parsed.data.status}'`,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: (error as Error).message || 'Failed to update ride status',
        },
      });
    }
  },

  /**
   * GET /api/driver/history
   * Retrieve driver's past rides
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const history = await driverService.getDriverHistory(req.user.id);
      res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      next(error);
    }
  },
};
