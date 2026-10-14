import { rideRepository, RideWithStops } from '../repositories/ride.repository.ts';
import { CreateRideInput } from '../validators/ride.validator.ts';
import { calculateFare } from './fare.service.ts';
import { routeService, RouteCalculationResult } from './route.service.ts';
import { logger } from '../utils/logger.ts';

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

    // 2. Authoritative server fare calculation
    const fareResult = calculateFare(input.rideType, totalDistanceKm, estimatedDuration);

    logger.info('Calculated backend ride metrics', {
      riderId,
      rideType: input.rideType,
      totalDistanceKm,
      estimatedDuration,
      estimatedFare: fareResult.estimatedFare,
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
        estimated_fare: fareResult.estimatedFare,
        ride_type: input.rideType,
        status: 'requested',
        route_source: routeResult.routeSource,
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
};
