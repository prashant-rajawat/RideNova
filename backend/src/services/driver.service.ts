import { driverRepository, DriverWithVehicle } from '../repositories/driver.repository.ts';
import { rideRepository, RideWithStops } from '../repositories/ride.repository.ts';
import { userRepository } from '../repositories/user.repository.ts';
import { DriverStatus, KycStatus, RideStatus, Vehicle, VehicleType, DriverPayout } from '../types/index.ts';
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
  kycStatus: KycStatus;
  isOnline: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  rating: number;
  totalRides: number;
  dob?: string | null;
  address?: string | null;
  licenseState?: string | null;
  licenseExpiry?: string | null;
  licenseFrontUrl?: string | null;
  licenseBackUrl?: string | null;
  idType?: string | null;
  idNumberMasked?: string | null;
  idDocumentUrl?: string | null;
  bankAccountName?: string | null;
  bankAccountNumberMasked?: string | null;
  bankIfsc?: string | null;
  bankStatus?: string | null;
  upiId?: string | null;
  operatingCity?: string | null;
  preferredLanguage?: string | null;
  profilePhotoUrl?: string | null;
  autoAcceptRides?: boolean;
  workingHoursPreference?: string | null;
  quietRidePreference?: boolean;
  kycSubmittedAt?: string | null;
  rejectionReason?: string | null;
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
      kycStatus: driver.kyc_status || (driver.status === 'approved' ? 'approved' : 'draft'),
      isOnline: driver.is_online,
      currentLatitude: driver.current_latitude ?? null,
      currentLongitude: driver.current_longitude ?? null,
      rating: Number(driver.rating),
      totalRides: driver.total_rides,
      dob: driver.dob || null,
      address: driver.address || null,
      licenseState: driver.license_state || null,
      licenseExpiry: driver.license_expiry || null,
      licenseFrontUrl: driver.license_front_url || null,
      licenseBackUrl: driver.license_back_url || null,
      idType: driver.id_type || null,
      idNumberMasked: driver.id_number_masked || null,
      idDocumentUrl: driver.id_document_url || null,
      bankAccountName: driver.bank_account_name || null,
      bankAccountNumberMasked: driver.bank_account_number_masked || null,
      bankIfsc: driver.bank_ifsc || null,
      bankStatus: driver.bank_status || 'unverified',
      upiId: driver.upi_id || null,
      operatingCity: driver.operating_city || null,
      preferredLanguage: driver.preferred_language || 'English',
      profilePhotoUrl: driver.profile_photo_url || null,
      autoAcceptRides: driver.auto_accept_rides ?? false,
      workingHoursPreference: driver.working_hours_preference || 'flexible',
      quietRidePreference: driver.quiet_ride_preference ?? false,
      kycSubmittedAt: driver.kyc_submitted_at || null,
      rejectionReason: driver.rejection_reason || null,
      vehicle: driver.vehicle || null,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
    };
  },

  /**
   * Update driver contact details and profile
   */
  async updateDriverProfile(
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      licenseNumber?: string;
      profilePhotoUrl?: string | null;
      upiId?: string | null;
      operatingCity?: string | null;
      preferredLanguage?: string | null;
      dob?: string | null;
      address?: string | null;
      autoAcceptRides?: boolean;
      workingHoursPreference?: string | null;
      quietRidePreference?: boolean;
    }
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

    await driverRepository.updateExtendedProfile(driver.id, {
      profile_photo_url: updates.profilePhotoUrl,
      upi_id: updates.upiId,
      operating_city: updates.operatingCity,
      preferred_language: updates.preferredLanguage,
      dob: updates.dob,
      address: updates.address,
      auto_accept_rides: updates.autoAcceptRides,
      working_hours_preference: updates.workingHoursPreference,
      quiet_ride_preference: updates.quietRidePreference,
    });

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

      if (driver.status !== 'approved') {
        throw new ValidationError(
          'Your account is pending verification. Online availability will be enabled once your documents are approved by our admin team.'
        );
      }

      // 2. Eligibility Check: Vehicle registration
      if (!driver.vehicle) {
        throw new ValidationError('You must register and save a vehicle before going online.');
      }
    } else {
      // Driver attempting to go offline:
      // Prevent drivers from switching to Offline while they have an accepted or active on-demand trip.
      // Drivers may go Offline when they have only future scheduled rides, provided they remain assigned to those bookings.
      const activeOnDemandRide = await rideRepository.findActiveOnDemandRideForDriver(driver.id);
      if (activeOnDemandRide) {
        throw new ValidationError(
          'Cannot switch to offline while you have an active on-demand trip in progress. Please complete or cancel this trip first.'
        );
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
      // 85% driver payout baseline according to 15% platform commission
      const earnings = Math.round(Number(r.estimated_fare) * 0.85);

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
    const activeRide = await rideRepository.findActiveOnDemandRideForDriver(driver.id);
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

    // Security check: Starting a trip requires mandatory OTP verification via verify-otp endpoint!
    if (newStatus === 'ride_started') {
      const currentRide = await rideRepository.findById(rideId);
      if (!currentRide || !currentRide.otp_verified) {
        throw new ValidationError(
          'Starting a trip requires mandatory passenger OTP verification. Please verify the 4-digit code provided by the passenger via the verify-otp endpoint.'
        );
      }
    }

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
   * Verify trip-start OTP entered by driver
   */
  async verifyTripOtp(userId: string, rideId: string, otp: string) {
    const driver = await driverRepository.findOrCreate(userId);
    return rideRepository.verifyTripOtp(rideId, driver.id, otp);
  },

  /**
   * Multi-Step Driver KYC Update (Personal, License, Vehicle, Bank, Submit)
   */
  async updateDriverKyc(userId: string, input: any): Promise<SanitizedDriverProfile> {
    const driver = await driverRepository.findOrCreate(userId);

    // Update user profile info if provided (name, phone)
    if (input.fullName || input.phone) {
      await userRepository.updateProfile(userId, {
        name: input.fullName,
        phone: input.phone,
      });
    }

    // Upsert vehicle if vehicle info is provided in step 3
    if (input.vehicleMake && input.registrationNumber) {
      await driverRepository.upsertVehicle(driver.id, {
        vehicle_type: input.vehicleType || 'comfort',
        make: input.vehicleMake,
        model: input.vehicleModel || 'Sedan',
        color: input.vehicleColor || 'White',
        registration_number: input.registrationNumber,
        year: input.vehicleYear || new Date().getFullYear(),
      });
    }

    // Mask sensitive bank and ID numbers
    let idNumberMasked = input.idNumber;
    if (idNumberMasked && idNumberMasked.length > 4) {
      idNumberMasked = 'XXXX-XXXX-' + idNumberMasked.slice(-4);
    }
    let bankAccountNumberMasked = input.bankAccountNumber;
    if (bankAccountNumberMasked && bankAccountNumberMasked.length > 4) {
      bankAccountNumberMasked = 'XXXX-XXXX-' + bankAccountNumberMasked.slice(-4);
    }

    const isSubmitting = Boolean(input.submitForReview);
    const isAlreadyApproved = driver.status === 'approved' || driver.kyc_status === 'approved';
    let newKycStatus: KycStatus = driver.kyc_status || 'draft';
    if (isAlreadyApproved) {
      newKycStatus = 'approved';
    } else {
      if (isSubmitting) {
        newKycStatus = 'under_review';
      } else if (input.kycStatus) {
        newKycStatus = input.kycStatus;
      } else if (newKycStatus === 'draft') {
        newKycStatus = 'incomplete';
      }
    }

    await driverRepository.updateKyc(driver.id, {
      dob: input.dob,
      address: input.address,
      licenseNumber: input.licenseNumber || driver.license_number,
      licenseState: input.licenseState,
      licenseExpiry: input.licenseExpiry,
      licenseFrontUrl: input.licenseFrontUrl,
      licenseBackUrl: input.licenseBackUrl,
      idType: input.idType,
      idNumberMasked,
      idDocumentUrl: input.idDocumentUrl,
      bankAccountName: input.bankAccountName,
      bankAccountNumberMasked,
      bankIfsc: input.bankIfsc,
      bankStatus: input.bankAccountNumber ? 'verified' : driver.bank_status || 'unverified',
      kycStatus: newKycStatus,
      kycSubmittedAt: isSubmitting ? new Date().toISOString() : driver.kyc_submitted_at || undefined,
    });

    return this.getDriverProfile(userId);
  },

  /**
   * Retrieve driver's ride history
   */
  async getDriverHistory(userId: string): Promise<RideWithStops[]> {
    const driver = await driverRepository.findOrCreate(userId);
    return rideRepository.findByDriverId(driver.id);
  },

  /**
   * Get comprehensive driver earnings metrics & transaction ledger
   */
  async getDriverEarningsSummary(userId: string) {
    const driver = await driverRepository.findOrCreate(userId);
    const history = await rideRepository.findByDriverId(driver.id);
    const completedRides = history.filter((r) => r.status === 'ride_completed');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalGross = 0;
    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;

    for (const ride of completedRides) {
      const fare = ride.final_fare ? Number(ride.final_fare) : Number(ride.estimated_fare);
      const net = Math.round(fare * 0.85);
      totalGross += fare;
      const rideTime = new Date(ride.completed_at || ride.updated_at || ride.created_at).getTime();

      if (rideTime >= startOfToday) {
        todayEarnings += net;
      }
      if (rideTime >= sevenDaysAgo) {
        weekEarnings += net;
      }
      if (rideTime >= startOfMonth) {
        monthEarnings += net;
      }
    }

    const totalEarnings = Math.round(totalGross * 0.85);
    const totalCommission = totalGross - totalEarnings;

    const payouts = await driverRepository.getPayouts(driver.id);
    const totalPaid = payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const availableBalance = Math.max(0, totalEarnings - totalPaid);
    const pendingSettlement = completedRides.length > 0 ? Math.round(todayEarnings * 0.15) : 0;

    return {
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalEarnings,
      completedTrips: completedRides.length,
      totalGross,
      totalCommission,
      acceptanceRate: 98,
      rating: Number(driver.rating) || 5.0,
      ratingCount: driver.total_rides || completedRides.length,
      onlineHours: driver.is_online ? 4.5 : 0,
      availableBalance,
      pendingSettlement,
      paidBalance: totalPaid,
    };
  },

  /**
   * Get driver payouts
   */
  async getDriverPayouts(userId: string): Promise<DriverPayout[]> {
    const driver = await driverRepository.findOrCreate(userId);
    return driverRepository.getPayouts(driver.id);
  },

  /**
   * Request / Process driver payout
   */
  async requestPayout(userId: string, amount: number): Promise<DriverPayout> {
    const driver = await driverRepository.findOrCreate(userId);
    if (amount <= 0) {
      throw new ValidationError('Payout amount must be greater than zero.');
    }
    if (amount < 200) {
      throw new ValidationError('Minimum payout amount is ₹200.');
    }

    const summary = await this.getDriverEarningsSummary(userId);
    if (amount > summary.availableBalance) {
      throw new ValidationError(`Requested amount exceeds available balance of ₹${summary.availableBalance}.`);
    }

    const bankMasked = driver.bank_account_number_masked || 'XXXX-XXXX-9182';
    const payout = await driverRepository.createPayout(driver.id, amount, bankMasked);
    return payout;
  },

  /**
   * Admin Approval / Rejection of Driver application
   */
  async adminReviewDriver(
    driverId: string,
    action: 'approve' | 'reject' | 'suspend' | 'reinstate',
    reason?: string
  ): Promise<DriverWithVehicle | null> {
    let status: DriverStatus = 'approved';
    let kycStatus: KycStatus = 'approved';

    if (action === 'approve') {
      status = 'approved';
      kycStatus = 'approved';
    } else if (action === 'reject') {
      status = 'pending';
      kycStatus = 'rejected';
    } else if (action === 'suspend') {
      status = 'suspended';
      kycStatus = 'suspended';
    } else if (action === 'reinstate') {
      status = 'approved';
      kycStatus = 'approved';
    }

    return driverRepository.updateApprovalStatus(driverId, status, kycStatus, reason);
  },
};
