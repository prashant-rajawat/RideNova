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
  scheduledAt?: string;
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

export interface DriverDisplayInfo {
  id: string;
  name: string;
  phone: string | null;
  rating: number;
  total_rides: number;
  profile_image_url?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  vehicle: {
    make: string;
    model: string;
    color: string;
    registration_number: string;
    year: number;
    vehicle_type: VehicleType;
  } | null;
}

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
  driver?: DriverDisplayInfo | null;
  scheduled_at?: string | null;
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

export type KycStatus =
  | 'draft'
  | 'incomplete'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  color: string;
  registration_number: string;
  year: number;
  seating_capacity?: number;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  rc_document_url?: string | null;
  insurance_document_url?: string | null;
  permit_document_url?: string | null;
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
  kycSubmittedAt?: string | null;
  rejectionReason?: string | null;
  vehicle: Vehicle | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverKycPayload {
  // Step 1: Personal
  fullName?: string;
  phone?: string;
  dob?: string;
  address?: string;
  profilePhotoUrl?: string;

  // Step 2: Driving Licence
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiry?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;

  // Step 3: Vehicle
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  registrationNumber?: string;
  vehicleType?: VehicleType;
  seatingCapacity?: number;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  rcDocumentUrl?: string;
  insuranceDocumentUrl?: string;
  permitDocumentUrl?: string;

  // Step 4: Identity and Bank
  idType?: string;
  idNumber?: string;
  idDocumentUrl?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;

  // Step 5: Submit action
  submitForReview?: boolean;
}

export interface DriverPayout {
  id: string;
  driver_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bank_account_masked?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface DriverEarningsSummary {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  completedTrips: number;
  totalGross: number;
  totalCommission: number;
  acceptanceRate: number;
  rating: number;
  ratingCount: number;
  onlineHours: number;
  availableBalance: number;
  pendingSettlement: number;
  paidBalance: number;
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

export interface Payment {
  id: string;
  ride_id: string;
  rider_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  stripe_payment_intent_id?: string | null;
  status: PaymentStatus;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  ride_id: string;
  rider_id: string;
  driver_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_fare: number;
  maximum_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type SupportCategory = 'payment' | 'ride' | 'driver' | 'lost_item' | 'technical' | 'other';
export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: SupportPriority;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface AdminOverviewData {
  totalUsers: number;
  totalRiders: number;
  totalDrivers: number;
  activeDrivers: number;
  totalRides: number;
  completedRides: number;
  activeRides: number;
  totalRevenue: number;
  platformFeeTotal: number;
  openTickets: number;
  recentRides: any[];
}

export interface AdminDriver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  license_number: string;
  status: DriverStatus;
  is_online: boolean;
  rating: number;
  total_rides: number;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  registration_number?: string | null;
  vehicle_type?: VehicleType | null;
  created_at: string;
}

export interface ReceiptData {
  receiptNumber: string;
  rideId: string;
  referenceId: string;
  date: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  stripePaymentIntentId?: string;
  status: string;
  pickup: string;
  destination: string;
  distanceKm?: number;
  durationMinutes?: number;
  rideType?: string;
  fareBreakdown?: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    discount: number;
    total: number;
  };
}


