import { z } from 'zod';

export const updateDriverProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255).optional(),
  phone: z.string().max(50).optional(),
  licenseNumber: z.string().min(3, 'License number must be at least 3 characters').max(100).optional(),
  profilePhotoUrl: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  operatingCity: z.string().optional().nullable(),
  preferredLanguage: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  autoAcceptRides: z.boolean().optional(),
  workingHoursPreference: z.string().optional().nullable(),
  quietRidePreference: z.boolean().optional(),
});

export const vehicleSchema = z.object({
  vehicleType: z.enum(['economy', 'comfort', 'premium'] as const),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  color: z.string().min(1, 'Color is required').max(50),
  registrationNumber: z.string().min(3, 'Registration number must be at least 3 characters').max(100),
  year: z.number().int().min(1990, 'Year must be at least 1990').max(2050, 'Year cannot exceed 2050'),
});

export const toggleAvailabilitySchema = z.object({
  isOnline: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateRideStatusSchema = z.object({
  status: z.enum([
    'accepted',
    'driver_arriving',
    'driver_arrived',
    'ride_started',
    'ride_completed',
    'cancelled',
  ] as const),
  cancellationReason: z.string().max(500).optional(),
});

export const updateDriverLocationSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
});

export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type UpdateRideStatusInput = z.infer<typeof updateRideStatusSchema>;
export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;
