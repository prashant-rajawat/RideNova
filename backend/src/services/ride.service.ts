import { rideRepository, RideWithStops } from '../repositories/ride.repository.ts';
import { CreateRideInput } from '../validators/ride.validator.ts';
import { calculateFare } from './fare.service.ts';
import { routeService, RouteCalculationResult } from './route.service.ts';
import { logger } from '../utils/logger.ts';
import { extendedRepository } from '../repositories/extended.repository.ts';
import { ValidationError } from './driver.service.ts';

export const rideService = {
  /**
   * Preview route metrics and fare calculations before booking.
   * Validates coordinates and retrieves authoritative route information.
   */
  async previewRoute(
    origin: { latitude: number; longitude: number; address?: string },
    destination: { latitude: number; longitude: number; address?: string },
    stops: Array<{ latitude: number; longitude: number; stopOrder: number; address?: string }> = []
  ): Promise<RouteCalculationResult & { fares: Record<string, ReturnType<typeof calculateFare>> }> {
    const route = await routeService.calculateRoute(origin, destination, stops);
    const fares = {
      economy: calculateFare('economy', route.distanceKm, route.durationMinutes),
      comfort: calculateFare('comfort', route.distanceKm, route.durationMinutes),
      premium: calculateFare('premium', route.distanceKm, route.durationMinutes),
    };
    return {
      ...route,
      fares,
    };
  },

  /**
   * Create a new ride request with server-authoritative route distance, duration, and fare.
   * Prioritizes real Google Routes API when available; otherwise uses honest fallback estimation.
   * Enforces status = 'requested', driver_id = null.
   */
  async createRide(riderId: string, input: CreateRideInput): Promise<RideWithStops> {
    // 1. Authoritative server-side route calculation
    // Preserves strict sequential waypoint ordering: Pickup -> Stop 1 -> Stop 2 -> Destination
    const routeResult = await routeService.calculateRoute(
      {
        latitude: input.pickupLatitude,
        longitude: input.pickupLongitude,
        address: input.pickupAddress,
      },
      {
        latitude: input.destinationLatitude,
        longitude: input.destinationLongitude,
        address: input.destinationAddress,
      },
      (input.stops || []).map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
        stopOrder: s.stopOrder,
        address: s.address,
      }))
    );

    const totalDistanceKm = routeResult.distanceKm;
    const estimatedDuration = routeResult.durationMinutes;

    // 2. Authoritative server fare calculation + priority incentive
    const baseFareResult = calculateFare(input.rideType, totalDistanceKm, estimatedDuration);
    const matchingSettings = await extendedRepository.getMatchingSettings().catch(() => ({ request_timeout_minutes: 5 }));
    const timeoutMins = matchingSettings?.request_timeout_minutes || 5;
    const expiresAt = new Date(Date.now() + timeoutMins * 60000).toISOString();
    const incentive = input.incentiveAmount || 0;
    const totalEstimatedFare = baseFareResult.estimatedFare + incentive;

    logger.info('Calculated backend ride metrics', {
      riderId,
      rideType: input.rideType,
      totalDistanceKm,
      estimatedDuration,
      estimatedFare: totalEstimatedFare,
      priorityLevel: input.priorityLevel || 'normal',
      incentive,
      routeSource: routeResult.routeSource,
      isGoogleRoute: routeResult.isGoogleRoute,
      stopsCount: input.stops?.length || 0,
    });

    // 3. Persist to database with safe status 'requested' and driver_id null
    const newRide = await rideRepository.create(
      {
        rider_id: riderId,
        pickup_address: input.pickupAddress.trim(),
        pickup_latitude: input.pickupLatitude,
        pickup_longitude: input.pickupLongitude,
        destination_address: input.destinationAddress.trim(),
        destination_latitude: input.destinationLatitude,
        destination_longitude: input.destinationLongitude,
        distance_km: totalDistanceKm,
        estimated_duration_minutes: estimatedDuration,
        estimated_fare: totalEstimatedFare,
        ride_type: input.rideType,
        status: 'requested',
        route_source: routeResult.routeSource,
        priority_level: input.priorityLevel || 'normal',
        incentive_amount: incentive,
        expires_at: expiresAt,
      },
      (input.stops || []).map((s) => ({
        stop_order: s.stopOrder,
        address: s.address.trim(),
        latitude: s.latitude,
        longitude: s.longitude,
      }))
    );

    return newRide;
  },

  /**
   * Get ride by ID
   */
  async getRideById(rideId: string): Promise<RideWithStops | null> {
    return rideRepository.findById(rideId);
  },

  /**
   * Get ride history for an authenticated rider
   */
  async getRidesByRiderId(riderId: string): Promise<RideWithStops[]> {
    return rideRepository.findByRiderId(riderId);
  },

  /**
   * Cancel ride
   */
  async cancelRide(rideId: string, userId: string, reason?: string): Promise<RideWithStops | null> {
    const cancelled = await rideRepository.cancelRide(rideId, userId, reason);
    if (cancelled) {
      await extendedRepository.createNotification(
        cancelled.rider_id,
        'RIDE_CANCELLED',
        'Ride Cancelled',
        `Your ride (${cancelled.reference_id || cancelled.id.slice(0, 8)}) was cancelled.`
      );
    }
    return cancelled;
  },

  /**
   * Update urgency driver incentive for requested ride (replacement semantics)
   */
  async updateIncentive(
    rideId: string,
    userId: string,
    incentiveAmount: number,
    priorityLevel?: string
  ): Promise<RideWithStops | null> {
    const ride = await rideRepository.findById(rideId);
    if (!ride) return null;
    if (ride.rider_id !== userId && userId !== 'admin') {
      throw new ValidationError('You can only update incentive for your own ride.');
    }
    if (ride.status !== 'requested') {
      throw new ValidationError('Driver incentive can only be updated while searching for a driver.');
    }
    const updated = await rideRepository.updateIncentive(rideId, incentiveAmount, priorityLevel);
    return updated;
  },

  /**
   * Process payment for completed ride
   */
  async processPayment(
    rideId: string,
    riderId: string,
    paymentMethod: string,
    stripeToken?: string,
    promoCode?: string
  ): Promise<{ payment: any; earnings?: any; receipt: any }> {
    const ride = await rideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    if (ride.rider_id !== riderId) {
      throw new Error('Unauthorized to pay for this ride');
    }

    let finalAmount = Number(ride.estimated_fare);

    if (promoCode) {
      const promoResult = await extendedRepository.validatePromoCode(promoCode, finalAmount);
      if (promoResult.valid) {
        finalAmount = promoResult.finalFare;
      }
    }

    const stripePaymentIntentId = stripeToken?.startsWith('pi_')
      ? stripeToken
      : `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const payment = await extendedRepository.recordPayment({
      ride_id: rideId,
      rider_id: riderId,
      amount: finalAmount,
      currency: 'INR',
      payment_method: paymentMethod,
      stripe_payment_intent_id: stripePaymentIntentId,
      status: 'succeeded',
    });

    let earnings = null;
    if (ride.driver_id) {
      earnings = await extendedRepository.recordDriverEarnings({
        driver_id: ride.driver_id,
        ride_id: rideId,
        gross_amount: finalAmount,
      });
    }

    await extendedRepository.createNotification(
      riderId,
      'PAYMENT_SUCCESS',
      'Payment Received',
      `Payment of ₹${finalAmount.toFixed(2)} for ride ${ride.reference_id || ride.id.slice(0, 8)} was successful.`
    );

    const receipt = {
      receiptNumber: `RN-REC-${Date.now().toString().slice(-8)}`,
      rideId: ride.id,
      referenceId: ride.reference_id || ride.id.slice(0, 8),
      date: new Date().toISOString(),
      amount: finalAmount,
      currency: 'INR',
      paymentMethod,
      stripePaymentIntentId,
      status: 'PAID',
      pickup: ride.pickup_address,
      destination: ride.destination_address,
      distanceKm: ride.distance_km,
      durationMinutes: ride.estimated_duration_minutes,
      fareBreakdown: {
        baseFare: Math.max(30, Number((finalAmount * 0.4).toFixed(2))),
        distanceFare: Number((finalAmount * 0.45).toFixed(2)),
        timeFare: Number((finalAmount * 0.15).toFixed(2)),
        discount: Number(ride.estimated_fare) - finalAmount,
        total: finalAmount,
      },
    };

    return { payment, earnings, receipt };
  },

  /**
   * Submit post-ride driver review
   */
  async submitReview(rideId: string, riderId: string, rating: number, comment?: string) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride record not found');
    }
    if (ride.rider_id !== riderId) {
      throw new Error('You can only review rides that you booked');
    }
    if (!ride.driver_id) {
      throw new Error('Cannot review a ride that did not have an assigned driver');
    }

    const review = await extendedRepository.createReview({
      ride_id: rideId,
      rider_id: riderId,
      driver_id: ride.driver_id,
      rating,
      comment,
    });

    return review;
  },

  /**
   * Get receipt for ride
   */
  async getReceipt(rideId: string, riderId: string) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    const amount = ride.final_fare ? Number(ride.final_fare) : Number(ride.estimated_fare);

    return {
      receiptNumber: `RN-REC-${ride.id.slice(0, 8).toUpperCase()}`,
      rideId: ride.id,
      referenceId: ride.reference_id || ride.id.slice(0, 8),
      date: ride.completed_at || ride.updated_at || new Date().toISOString(),
      amount,
      currency: 'INR',
      status: ride.status === 'ride_completed' ? 'PAID' : 'PENDING',
      pickup: ride.pickup_address,
      destination: ride.destination_address,
      distanceKm: ride.distance_km,
      durationMinutes: ride.estimated_duration_minutes,
      rideType: ride.ride_type,
    };
  },
};
