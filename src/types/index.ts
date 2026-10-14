/**
 * RideNova - Shared Frontend Types
 */

export type UserRole = 'rider' | 'driver' | 'admin';
export type DriverStatus = 'pending' | 'approved' | 'suspended' | 'active';
export type VehicleType = 'economy' | 'comfort' | 'premium';
export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'ride_started'
  | 'ride_completed'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface ApiHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
}

export interface DbHealthResponse {
  success: boolean;
  message: string;
  connected: boolean;
  databaseConfigured: boolean;
  timestamp: string;
  details?: {
    latencyMs?: number;
    tableCount?: number;
    verifiedTables?: string[];
  };
}

export interface TableSchemaInfo {
  name: string;
  description: string;
  roleInApp: string;
  primaryKey: string;
  keyFields: string[];
  indexes: string[];
  statusInStep1: 'Defined & Migrated' | 'Ready';
}

export interface AuthUser {
  id: string;
  clerkUserId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  success: boolean;
  data: AuthUser;
}

export interface AuthRoleResponse {
  success: boolean;
  data: {
    role: UserRole;
  };
}

export interface RideStopInput {
  address: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

export interface CreateRidePayload {
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  rideType: VehicleType;
  stops?: RideStopInput[];
}

export interface RideStop {
  id: string;
  ride_id: string;
  stop_order: number;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export type RouteSource = 'google_routes_api' | 'fallback_estimate';

export interface RideWithStops {
  id: string;
  rider_id: string;
  driver_id: string | null;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  distance_km: number;
  estimated_duration_minutes: number;
  estimated_fare: number;
  final_fare: number | null;
  ride_type: VehicleType;
  status: RideStatus;
  route_source?: RouteSource | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
  stops: RideStop[];
  reference_id?: string;
}

export interface RideApiResponse {
  success: boolean;
  message?: string;
  data: RideWithStops;
}

export interface RidesListApiResponse {
  success: boolean;
  data: RideWithStops[];
  count: number;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  color: string;
  registration_number: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
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


