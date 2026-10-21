export type ParcelStatus = 'requested' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type PaymentMethod = 'online_prepaid' | 'cash_at_pickup';
export type PaymentStatus = 'unpaid' | 'paid' | 'cash_collected' | 'refunded';
export type PackageSize = 'small' | 'medium' | 'large';

export interface Parcel {
  id: string;
  reference_id: string;
  sender_id: string;
  driver_id?: string | null;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  sender_name?: string | null;
  sender_phone?: string | null;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  recipient_name: string;
  recipient_phone: string;
  parcel_category: string;
  package_size: PackageSize;
  weight_kg: number;
  is_fragile: boolean;
  handling_instructions?: string | null;
  sender_description?: string | null;
  photo_urls: string[];
  status: ParcelStatus;
  estimated_fare: number;
  final_fare?: number | null;
  distance_km?: number | null;
  estimated_duration_minutes?: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  pickup_otp?: string | null;
  pickup_otp_verified?: boolean;
  pickup_evidence_url?: string | null;
  delivery_otp?: string | null;
  delivery_otp_verified?: boolean;
  delivery_evidence_url?: string | null;
  cancellation_reason?: string | null;
  requested_at: string;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  driver?: {
    id: string;
    name: string;
    phone?: string | null;
    rating: number;
    total_rides: number;
    vehicle?: any;
  } | null;
}

export interface CreateParcelInput {
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  senderName?: string;
  senderPhone?: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  recipientName: string;
  recipientPhone: string;
  parcelCategory: string;
  packageSize: PackageSize;
  weightKg?: number;
  isFragile?: boolean;
  handlingInstructions?: string;
  senderDescription?: string;
  photoUrls?: string[];
  paymentMethod: PaymentMethod;
}
