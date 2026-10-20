import { Request, Response, NextFunction } from 'express';
import { createRideSchema } from '../validators/ride.validator.ts';
import { rideService } from '../services/ride.service.ts';

export const rideController = {
  /**
   * POST /api/rides/route
   * Calculate authoritative route preview and fare estimates
   */
  async previewRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pickup, destination, stops } = req.body || {};
      const pickupLat = Number(pickup?.latitude ?? pickup?.lat);
      const pickupLng = Number(pickup?.longitude ?? pickup?.lng);
      const destLat = Number(destination?.latitude ?? destination?.lat);
      const destLng = Number(destination?.longitude ?? destination?.lng);

      if (
        !Number.isFinite(pickupLat) ||
        !Number.isFinite(pickupLng) ||
        !Number.isFinite(destLat) ||
        !Number.isFinite(destLng) ||
        pickupLat < -90 ||
        pickupLat > 90 ||
        destLat < -90 ||
        destLat > 90 ||
        pickupLng < -180 ||
        pickupLng > 180 ||
        destLng < -180 ||
        destLng > 180
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COORDINATES',
            message: 'Valid pickup and destination coordinates are required.',
          },
        });
        return;
      }

      const formattedStops = Array.isArray(stops)
        ? stops.map((s, idx) => ({
            latitude: Number(s.latitude ?? s.lat),
            longitude: Number(s.longitude ?? s.lng),
            stopOrder: Number(s.stopOrder ?? idx + 1),
            address: typeof s.address === 'string' ? s.address : undefined,
          }))
        : [];

      const result = await rideService.previewRoute(
        { latitude: pickupLat, longitude: pickupLng, address: pickup?.address },
        { latitude: destLat, longitude: destLng, address: destination?.address },
        formattedStops
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rides
   * Create a new ride request (Rider only).
   */
  async createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to book a ride.',
          },
        });
        return;
      }

      const parseResult = createRideSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BOOKING_INPUT',
            message: parseResult.error.issues[0]?.message || 'Invalid booking parameters.',
            details: parseResult.error.issues,
          },
        });
        return;
      }

      const newRide = await rideService.createRide(req.user.id, parseResult.data);

      res.status(201).json({
        success: true,
        message: 'Ride requested successfully. Searching for nearby drivers...',
        data: newRide,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rides/:id
   * Get ride by ID. A rider can only access their own ride.
   */
  async getRideById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        });
        return;
      }

      const { id } = req.params;
      const ride = await rideService.getRideById(id);

      if (!ride) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RIDE_NOT_FOUND',
            message: 'Ride record not found.',
          },
        });
        return;
      }

      // Security check: Rider can only access their own ride
      if (ride.rider_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this ride.',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: ride,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rides
   * Get authenticated rider's ride history / current rides.
   */
  async getRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        });
        return;
      }

      const rides = await rideService.getRidesByRiderId(req.user.id);

      res.status(200).json({
        success: true,
        data: rides,
        count: rides.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rides/:id/cancel
   * Cancel an active ride request (Rider or Admin)
   */
  async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body || {};

      const cancelled = await rideService.cancelRide(id, req.user.id, reason);
      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: { code: 'CANCEL_FAILED', message: 'Cannot cancel this ride. It may be already in progress or completed.' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Ride cancelled successfully.',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rides/:id/incentive
   * Urgency booster: offer drivers additional incentive (replacement semantics)
   */
  async updateIncentive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const { id } = req.params;
      const { incentiveAmount, priorityLevel } = req.body || {};

      if (typeof incentiveAmount !== 'number' || incentiveAmount < 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INCENTIVE', message: 'Incentive amount must be a non-negative number.' },
        });
        return;
      }

      const updated = await rideService.updateIncentive(id, req.user.id, incentiveAmount, priorityLevel);
      if (!updated) {
        res.status(400).json({
          success: false,
          error: { code: 'INCENTIVE_FAILED', message: 'Cannot update incentive. Ride not found or already assigned.' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Driver incentive updated to +₹${incentiveAmount}. Drivers notified!`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rides/:id/pay
   * Process payment (Stripe test-mode / Card)
   */
  async processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const { id } = req.params;
      const { paymentMethod = 'card', stripeToken, promoCode } = req.body || {};

      const result = await rideService.processPayment(id, req.user.id, paymentMethod, stripeToken, promoCode);

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully.',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: (error as Error).message },
      });
    }
  },

  /**
   * POST /api/rides/:id/review
   * Submit post-trip 1-5 star review and feedback
   */
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const { id } = req.params;
      const { rating, comment } = req.body || {};

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RATING', message: 'Rating must be an integer between 1 and 5' },
        });
        return;
      }

      const review = await rideService.submitReview(id, req.user.id, Number(rating), comment);

      res.status(200).json({
        success: true,
        message: 'Thank you for your rating and review!',
        data: review,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { code: 'REVIEW_FAILED', message: (error as Error).message },
      });
    }
  },

  /**
   * GET /api/rides/:id/receipt
   * Get official transaction receipt for completed trip
   */
  async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const { id } = req.params;
      const receipt = await rideService.getReceipt(id, req.user.id);

      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: { code: 'RECEIPT_NOT_FOUND', message: (error as Error).message },
      });
    }
  },
};
