import { z } from 'zod';

export const stopSchema = z.object({
  address: z.string().min(2, 'Stop address must be at least 2 characters'),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  stopOrder: z.number().int().min(1).max(3),
});

export const createRideSchema = z.object({
  pickupAddress: z.string().min(2, 'Pickup address is required'),
  pickupLatitude: z
    .number()
    .min(-90, 'Pickup latitude must be between -90 and 90')
    .max(90, 'Pickup latitude must be between -90 and 90'),
  pickupLongitude: z
    .number()
    .min(-180, 'Pickup longitude must be between -180 and 180')
    .max(180, 'Pickup longitude must be between -180 and 180'),
  destinationAddress: z.string().min(2, 'Destination address is required'),
  destinationLatitude: z
    .number()
    .min(-90, 'Destination latitude must be between -90 and 90')
    .max(90, 'Destination latitude must be between -90 and 90'),
  destinationLongitude: z
    .number()
    .min(-180, 'Destination longitude must be between -180 and 180')
    .max(180, 'Destination longitude must be between -180 and 180'),
  rideType: z.enum(['economy', 'comfort', 'premium'] as const),
  stops: z.array(stopSchema).max(3, 'A maximum of 3 intermediate stops are allowed').optional().default([]),
});

export type CreateRideInput = z.infer<typeof createRideSchema>;
