import { VehicleType } from '../types/index.ts';

export interface PricingTier {
  name: string;
  description: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
}

/**
 * Centralized Demo/Implementation Pricing Structure (INR ₹)
 */
export const FARE_CONFIG: Record<VehicleType, PricingTier> = {
  economy: {
    name: 'Economy',
    description: 'Affordable everyday ride',
    baseFare: 40,
    perKmRate: 12,
    perMinuteRate: 2,
  },
  comfort: {
    name: 'Comfort',
    description: 'Extra comfort & newer sedans',
    baseFare: 60,
    perKmRate: 18,
    perMinuteRate: 3,
  },
  premium: {
    name: 'Premium',
    description: 'Premium luxury experience',
    baseFare: 100,
    perKmRate: 25,
    perMinuteRate: 4,
  },
};

export interface FareCalculationResult {
  rideType: VehicleType;
  baseFare: number;
  distanceKm: number;
  distanceCharge: number;
  durationMinutes: number;
  timeCharge: number;
  estimatedFare: number;
  currency: string;
}

/**
 * Centralized Fare Calculation Formula:
 * fare = base_fare + (distance_km * per_km_rate) + (duration_minutes * per_minute_rate)
 */
export function calculateFare(
  rideType: VehicleType,
  distanceKm: number,
  durationMinutes: number
): FareCalculationResult {
  const config = FARE_CONFIG[rideType] || FARE_CONFIG.economy;

  const validDistance = Math.max(0, Number(distanceKm) || 0);
  const validDuration = Math.max(0, Math.round(Number(durationMinutes) || 0));

  const distanceCharge = Math.round(validDistance * config.perKmRate);
  const timeCharge = Math.round(validDuration * config.perMinuteRate);
  const estimatedFare = config.baseFare + distanceCharge + timeCharge;

  return {
    rideType,
    baseFare: config.baseFare,
    distanceKm: Number(validDistance.toFixed(2)),
    distanceCharge,
    durationMinutes: validDuration,
    timeCharge,
    estimatedFare,
    currency: 'INR',
  };
}

/**
 * Haversine formula to compute great-circle distance between two coordinates in kilometers.
 * Applies a 1.25x road winding factor for accurate street estimation.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;

  // Road factor for urban/suburban routing
  const roadFactor = 1.25;
  return Number((straightLineKm * roadFactor).toFixed(2));
}

/**
 * Estimates duration in minutes from distance assuming average urban speed of 25 km/h.
 */
export function estimateDurationMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  const averageSpeedKmH = 25;
  const hours = distanceKm / averageSpeedKmH;
  const minutes = Math.round(hours * 60) + 3; // +3 minutes base traffic buffer
  return Math.max(2, minutes);
}
