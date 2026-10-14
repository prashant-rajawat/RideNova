import { driverRepository, DriverWithVehicle } from '../repositories/driver.repository.ts';
import { rideRepository, RideWithStops } from '../repositories/ride.repository.ts';
import { userRepository } from '../repositories/user.repository.ts';
import { DriverStatus, RideStatus, Vehicle, VehicleType } from '../types/index.ts';
import { VehicleInput } from '../validators/driver.validator.ts';
import { logger } from '../utils/logger.ts';

export interface SanitizedDriverProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  licenseNumber: string;
  status: DriverStatus;
  isOnline: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  rating: number;
  totalRides: number;
  vehicle: Vehicle | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableRideSummary {
  id: string;
  referenceId?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  distanceKm: number | null;
  estimatedDurationMinutes: number | null;
  estimatedFare: number;
  estimatedDriverEarnings: number;
  rideType: VehicleType;
  status: RideStatus;
  requestedAt: string;
  stops: {
    stopOrder: number;
    address: string;
    latitude: number;
    longitude: number;
  }[];
}

export class ConflictError extends Error {
  code = 'CONFLICT';
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const driverService = {
  /**
   * Get complete driver profile and attached vehicle
   */
  async getDriverProfile(userId: string): Promise<SanitizedDriverProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User account not found');
    }

    const driver = await driverRepository.findOrCreate(userId);

    return {
      id: driver.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      licenseNumber: driver.license_number,
      status: driver.status,
      isOnline: driver.is_online,
      currentLatitude: driver.current_latitude ?? null,
      currentLongitude: driver.current_longitude ?? null,
      rating: Number(driver.rating),
      totalRides: driver.total_rides,
      vehicle: driver.vehicle || null,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
    };
  },

  /**
   * Update driver contact details and license number
   */
  async updateDriverProfile(
    userId: string,
    updates: { name?: string; phone?: string; licenseNumber?: string }
  ): Promise<SanitizedDriverProfile> {
    const driver = await driverRepository.findOrCreate(userId);

    if (updates.name !== undefined || updates.phone !== undefined) {
      await userRepository.updateProfile(userId, {
        name: updates.name,
        phone: updates.phone,
      });
    }

    if (updates.licenseNumber) {
      await driverRepository.updateLicense(driver.id, updates.licenseNumber);
    }

    return this.getDriverProfile(userId);
  },

  /**
   * Register or update driver's fleet vehicle
   */
  async updateVehicle(userId: string, input: VehicleInput): Promise<Vehicle> {
    const driver = await driverRepository.findOrCreate(userId);

    const vehicle = await driverRepository.upsertVehicle(driver.id, {
      vehicle_type: input.vehicleType,
      make: input.make,
      model: input.model,
      color: input.color,
      registration_number: input.registrationNumber,
      year: input.year,
    });

    logger.info('Vehicle registered/updated for driver', {
      driverId: driver.id,
      vehicleId: vehicle.id,
      vehicleType: vehicle.vehicle_type,
      registrationNumber: vehicle.registration_number,
    });

    return vehicle;
  },

  /**
   * Toggle driver online/offline status with server-side eligibility enforcement
   */
  async setAvailability(
    userId: string,
    isOnline: boolean,
    latitude?: number,
    longitude?: number
  ): Promise<SanitizedDriverProfile> {
    const driver = await driverRepository.findOrCreate(userId);

    if (isOnline) {
      // 1. Eligibility Check: Driver status
      if (driver.status === 'suspended') {
        throw new ValidationError('Your driver account has been suspended. Please contact support.');
      }

      // 2. Eligibility Check: Vehicle registration
      if (!driver.vehicle) {
        throw new ValidationError('You must register and save a vehicle before going online.');
      }
    }

    await driverRepository.updateAvailability(
      driver.id,
      isOnline,
      latitude ?? null,
      longitude ?? null
    );

    logger.info('Driver availability updated', {
      driverId: driver.id,
      isOnline,
    });

    return this.getDriverProfile(userId);
  },

  /**
   * Update driver live GPS location
   */
  async updateLocation(userId: string, latitude: number, longitude: number) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver) {
      throw new ValidationError('Driver profile not found.');
    }
    const updated = await driverRepository.updateLocation(driver.id, latitude, longitude);
    return updated;
  },

  /**
   * Retrieve available ride requests for an online driver
   */
  async getAvailableRequests(
    userId: string,
    excludeRideIds: string[] = []
  ): Promise<AvailableRideSummary[]> {
    const driver = await driverRepository.findOrCreate(userId);

    if (!driver.is_online) {
      return []; // Offline drivers receive 0 requests
    }

    // Driver must have a registered vehicle
    if (!driver.vehicle) {
      return [];
    }

    const rides = await rideRepository.findAvailableRequests(
      undefined, // Can view all requested categories or match driver vehicle
      excludeRideIds
    );

    return rides.map((r) => {
      // 80% driver payout baseline according to platform rules
      const earnings = Math.round(Number(r.estimated_fare) * 0.8);

      return {
        id: r.id,
        referenceId: r.reference_id,
        pickupAddress: r.pickup_address,
        pickupLatitude: r.pickup_latitude,
        pickupLongitude: r.pickup_longitude,
        destinationAddress: r.destination_address,
        destinationLatitude: r.destination_latitude,
        destinationLongitude: r.destination_longitude,
        distanceKm: r.distance_km ?? null,
        estimatedDurationMinutes: r.estimated_duration_minutes ?? null,
        estimatedFare: Number(r.estimated_fare),
        estimatedDriverEarnings: earnings,
        rideType: r.ride_type,
        status: r.status,
        requestedAt: r.requested_at,
        stops: (r.stops || []).map((s) => ({
          stopOrder: s.stop_order,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      };
    });
  },

  /**
   * Atomically accept a ride request
   */
  async acceptRide(userId: string, rideId: string): Promise<RideWithStops> {
    const driver = await driverRepository.findOrCreate(userId);

    // 1. Verify Driver Eligibility
    if (!driver.is_online) {
      throw new ValidationError('You must be online to accept ride requests.');
    }

    if (driver.status === 'suspended') {
      throw new ValidationError('Suspended drivers cannot accept ride requests.');
    }

    if (!driver.vehicle) {
      throw new ValidationError('You must have an active registered vehicle to accept rides.');
    }

    // 2. Prevent Multiple Concurrent Active Rides
    const activeRide = await rideRepository.findActiveRideForDriver(driver.id);
    if (activeRide) {
      throw new ConflictError('You already have an active ride in progress. Complete or cancel it first.');
    }

    // 3. Atomic Assignment via Database
    const acceptedRide = await rideRepository.acceptRide(rideId, driver.id);

    if (!acceptedRide) {
      const existing = await rideRepository.findById(rideId);
      if (!existing) {
        throw new Error('Ride request not found.');
      }
      if (existing.driver_id !== null || existing.status !== 'requested') {
        throw new ConflictError(
          'This ride request is no longer available. Another driver has already accepted it.'
        );
      }
      throw new ConflictError('Unable to accept ride. Please refresh your requests.');
    }

    logger.info('Ride successfully assigned to driver', {
      rideId,
      driverId: driver.id,
      userId,
    });

    return acceptedRide;
  },

  /**
   * Get driver's current active ride
   */
  async getActiveRide(userId: string): Promise<RideWithStops | null> {
    const driver = await driverRepository.findOrCreate(userId);
    return rideRepository.findActiveRideForDriver(driver.id);
  },

  /**
   * Transition ride status along driver lifecycle
   */
  async updateRideStatus(
    userId: string,
    rideId: string,
    newStatus: RideStatus,
    cancellationReason?: string
  ): Promise<RideWithStops> {
    const driver = await driverRepository.findOrCreate(userId);

    const updated = await rideRepository.updateRideStatus(
      rideId,
      driver.id,
      newStatus,
      cancellationReason
    );

    if (!updated) {
      throw new Error('Ride not found or not assigned to this driver.');
    }

    logger.info('Ride status updated by driver', {
      rideId,
      driverId: driver.id,
      newStatus,
    });

    return updated;
  },

  /**
   * Retrieve driver's ride history
   */
  async getDriverHistory(userId: string): Promise<RideWithStops[]> {
    const driver = await driverRepository.findOrCreate(userId);
    return rideRepository.findByDriverId(driver.id);
  },
};
