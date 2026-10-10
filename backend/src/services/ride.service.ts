import { rideRepository, RideWithStops } from '../repositories/ride.repository.ts';
import { CreateRideInput } from '../validators/ride.validator.ts';
import { calculateDistanceKm, estimateDurationMinutes, calculateFare } from './fare.service.ts';
import { logger } from '../utils/logger.ts';

export const rideService = {
  /**
   * Create a new ride request with server-recalculated distance, duration, and fare.
   * Enforces status = 'requested', driver_id = null.
   */
  async createRide(riderId: string, input: CreateRideInput): Promise<RideWithStops> {
    // 1. Calculate multi-segment distance
    // Waypoints order: Pickup -> Stop 1 -> Stop 2 -> Stop 3 -> Destination
    const waypoints = [
      { lat: input.pickupLatitude, lng: input.pickupLongitude },
      ...(input.stops || [])
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => ({ lat: s.latitude, lng: s.longitude })),
      { lat: input.destinationLatitude, lng: input.destinationLongitude },
    ];

    let totalDistanceKm = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const legDist = calculateDistanceKm(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
      totalDistanceKm += legDist;
    }

    // Minimum distance baseline (at least 0.5 km)
    totalDistanceKm = Math.max(0.5, Number(totalDistanceKm.toFixed(2)));

    // 2. Calculate duration
    const estimatedDuration = estimateDurationMinutes(totalDistanceKm);

    // 3. Centralized server-calculated fare
    const fareResult = calculateFare(input.rideType, totalDistanceKm, estimatedDuration);

    logger.info('Calculated backend ride metrics', {
      riderId,
      rideType: input.rideType,
      totalDistanceKm,
      estimatedDuration,
      estimatedFare: fareResult.estimatedFare,
      stopsCount: input.stops?.length || 0,
    });

    // 4. Persist to database with safe status 'requested'
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
