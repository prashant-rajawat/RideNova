import { parcelRepository } from '../repositories/parcel.repository.ts';
import { driverRepository } from '../repositories/driver.repository.ts';
import { CreateParcelInput, ParcelStatus } from '../types/parcel.ts';
import { logger } from '../utils/logger.ts';
import { isWithinServiceArea } from '../utils/serviceArea.ts';

export class ValidationError extends Error {
  public code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  public code = 'CONFLICT_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export const parcelService = {
  async createParcel(senderId: string, input: CreateParcelInput) {
    if (!input.pickupAddress || !input.deliveryAddress || !input.recipientName || !input.recipientPhone) {
      throw new ValidationError('Pickup address, delivery address, recipient name, and recipient phone are required.');
    }

    if (!isWithinServiceArea(input.pickupLatitude, input.pickupLongitude)) {
      throw new ValidationError('The pickup location is outside our service area.');
    }
    if (!isWithinServiceArea(input.deliveryLatitude, input.deliveryLongitude)) {
      throw new ValidationError('The delivery destination is outside our service area.');
    }

    const latDiff = Math.abs(input.pickupLatitude - input.deliveryLatitude);
    const lngDiff = Math.abs(input.pickupLongitude - input.deliveryLongitude);
    const distanceKm = Number(Math.max(2.5, Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(2));
    const durationMinutes = Math.round(distanceKm * 3.5 + 5);

    let baseFare = 60;
    if (input.packageSize === 'medium') baseFare = 110;
    if (input.packageSize === 'large') baseFare = 190;
    const distanceRate = distanceKm * 15;
    const fragileFee = input.isFragile ? 30 : 0;
    const estimatedFare = Math.round(baseFare + distanceRate + fragileFee);

    const parcel = await parcelRepository.create(senderId, input, estimatedFare, distanceKm, durationMinutes);
    logger.info('Parcel delivery created', { parcelId: parcel.id, referenceId: parcel.reference_id, senderId });
    return parcel;
  },

  async getParcelById(parcelId: string, userId: string, userRole: string) {
    const parcel = await parcelRepository.findById(parcelId);
    if (!parcel) {
      throw new ValidationError('Parcel delivery not found.');
    }
    if (userRole === 'rider' && parcel.sender_id !== userId) {
      throw new ValidationError('You can only view your own parcel deliveries.');
    }
    if (userRole === 'driver') {
      const driver = await driverRepository.findByUserId(userId);
      if (!driver || parcel.driver_id !== driver.id) {
        throw new ValidationError('You are not assigned to this parcel delivery.');
      }
      return {
        ...parcel,
        delivery_otp: undefined,
      };
    }
    return parcel;
  },

  async getSenderParcels(senderId: string) {
    return parcelRepository.findBySenderId(senderId);
  },

  async getAvailableRequests(userId: string) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver || !driver.is_online || driver.status !== 'approved' || !driver.vehicle) {
      return [];
    }
    return parcelRepository.findAvailableRequests();
  },

  async acceptParcel(userId: string, parcelId: string) {
    const driver = await driverRepository.findOrCreate(userId);
    if (!driver.is_online) {
      throw new ValidationError('You must be online to accept parcel deliveries.');
    }
    if (driver.status !== 'approved' || !driver.vehicle) {
      throw new ValidationError('Driver account must be approved with a registered vehicle.');
    }

    const activeParcel = await parcelRepository.findActiveForDriver(driver.id);
    if (activeParcel) {
      throw new ConflictError('You already have an active parcel delivery in progress.');
    }

    const accepted = await parcelRepository.acceptParcel(parcelId, driver.id);
    if (!accepted) {
      throw new ConflictError('Parcel delivery is no longer available or has already been accepted.');
    }

    logger.info('Parcel accepted by driver', { parcelId, driverId: driver.id });
    return accepted;
  },

  async getActiveParcelForDriver(userId: string) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver) return null;
    return parcelRepository.findActiveForDriver(driver.id);
  },

  async verifyPickupOtp(userId: string, parcelId: string, otp: string, evidenceUrl?: string) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver) throw new ValidationError('Driver not found.');

    const parcel = await parcelRepository.findById(parcelId);
    if (!parcel || parcel.driver_id !== driver.id) {
      throw new ValidationError('Parcel not found or not assigned to you.');
    }

    if (parcel.pickup_otp !== otp?.trim()) {
      throw new ValidationError('Invalid pickup OTP provided by sender.');
    }

    const updated = await parcelRepository.updateStatus(parcelId, 'picked_up', {
      pickupOtpVerified: true,
      pickupEvidenceUrl: evidenceUrl || 'https://i.ibb.co/3yBbRHHw/evidence.png',
      paymentStatus: parcel.payment_method === 'cash_at_pickup' ? 'cash_collected' : parcel.payment_status,
    });

    logger.info('Parcel pickup verified and collected', { parcelId, driverId: driver.id });
    return updated;
  },

  async updateParcelStatus(userId: string, parcelId: string, newStatus: ParcelStatus, cancellationReason?: string) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver) throw new ValidationError('Driver not found.');

    const parcel = await parcelRepository.findById(parcelId);
    if (!parcel || parcel.driver_id !== driver.id) {
      throw new ValidationError('Parcel not found or not assigned to you.');
    }

    if (newStatus === 'picked_up' && !parcel.pickup_otp_verified) {
      throw new ValidationError('Pickup requires OTP verification before marking picked up.');
    }

    const updated = await parcelRepository.updateStatus(parcelId, newStatus, {
      cancellationReason,
    });
    return updated;
  },

  async verifyDeliveryOtp(userId: string, parcelId: string, otp: string, evidenceUrl?: string) {
    const driver = await driverRepository.findByUserId(userId);
    if (!driver) throw new ValidationError('Driver not found.');

    const parcel = await parcelRepository.findById(parcelId);
    if (!parcel || parcel.driver_id !== driver.id) {
      throw new ValidationError('Parcel not found or not assigned to you.');
    }

    if (parcel.delivery_otp !== otp?.trim()) {
      throw new ValidationError('Invalid delivery OTP provided by recipient.');
    }

    const updated = await parcelRepository.updateStatus(parcelId, 'delivered', {
      deliveryOtpVerified: true,
      deliveryEvidenceUrl: evidenceUrl || 'https://i.ibb.co/3yBbRHHw/delivered.png',
      paymentStatus: 'paid',
    });

    logger.info('Parcel delivery completed successfully', { parcelId, driverId: driver.id });
    return updated;
  },

  async cancelParcel(parcelId: string, userId: string, reason?: string) {
    const parcel = await parcelRepository.findById(parcelId);
    if (!parcel) throw new ValidationError('Parcel not found.');
    if (parcel.sender_id !== userId) {
      throw new ValidationError('You can only cancel your own parcel deliveries.');
    }
    if (!['requested', 'accepted'].includes(parcel.status)) {
      throw new ValidationError('Parcel cannot be cancelled after pickup in progress.');
    }
    const cancelled = await parcelRepository.updateStatus(parcelId, 'cancelled', {
      cancellationReason: reason || 'Cancelled by sender',
    });
    return cancelled;
  },

  async getAdminParcels() {
    return parcelRepository.findAllAdmin();
  }
};
