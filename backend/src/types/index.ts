/**
 * RideNova - Core Domain & System Types
 * Step 1 Foundation
 */

export type UserRole = 'rider' | 'driver' | 'admin';

export interface User {
  id: string;
  clerk_user_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  profile_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverStatus = 'pending' | 'approved' | 'suspended' | 'active';
export type KycStatus =
  | 'draft'
  | 'incomplete'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_id?: string | null;
  status: DriverStatus;
  kyc_status: KycStatus;
  is_online: boolean;
  current_latitude?: number | null;
  current_longitude?: number | null;
  rating: number;
  total_rides: number;
  dob?: string | null;
  address?: string | null;
  license_state?: string | null;
  license_expiry?: string | null;
  license_front_url?: string | null;
  license_back_url?: string | null;
  id_type?: string | null;
  id_number_masked?: string | null;
  id_document_url?: string | null;
  bank_account_name?: string | null;
  bank_account_number_masked?: string | null;
  bank_ifsc?: string | null;
  bank_status?: string | null;
  kyc_submitted_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleType = 'economy' | 'comfort' | 'premium';

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

export interface DriverPayout {
  id: string;
  driver_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bank_account_masked?: string | null;
  reference_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'ride_started'
  | 'ride_completed'
  | 'cancelled';

export type RouteSource = 'google_routes_api' | 'fallback_estimate';

export interface Ride {
  id: string;
  rider_id: string;
  driver_id?: string | null;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  distance_km?: number | null;
  estimated_duration_minutes?: number | null;
  estimated_fare: number;
  final_fare?: number | null;
  ride_type: VehicleType;
  status: RideStatus;
  route_source?: RouteSource | null;
  requested_at: string;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
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

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

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

export interface DriverEarnings {
  id: string;
  driver_id: string;
  ride_id: string;
  gross_amount: number;
  platform_fee: number;
  driver_amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'paid' | 'withheld';
  created_at: string;
}

export interface Review {
  id: string;
  ride_id: string;
  rider_id: string;
  driver_id: string;
  rating: number; // 1 - 5
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
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
}

// API Health Response contracts
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
