-- Migration: 010_parcel_delivery.sql
-- Description: Door-to-Door Parcel Delivery tables, OTPs, evidence, and payment tracking.

CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id VARCHAR(50) UNIQUE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  
  -- Pickup & Destination
  pickup_address TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  sender_name VARCHAR(100),
  sender_phone VARCHAR(20),
  
  delivery_address TEXT NOT NULL,
  delivery_latitude DOUBLE PRECISION NOT NULL,
  delivery_longitude DOUBLE PRECISION NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  
  -- Parcel Attributes
  parcel_category VARCHAR(50) NOT NULL DEFAULT 'document',
  package_size VARCHAR(20) NOT NULL DEFAULT 'small', -- small, medium, large
  weight_kg NUMERIC(6, 2) DEFAULT 1.00,
  is_fragile BOOLEAN DEFAULT FALSE,
  handling_instructions TEXT,
  sender_description TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Lifecycle & Status
  status VARCHAR(50) NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')
  ),
  
  -- Financials
  estimated_fare NUMERIC(10, 2) NOT NULL CHECK (estimated_fare >= 0),
  final_fare NUMERIC(10, 2) CHECK (final_fare IS NULL OR final_fare >= 0),
  distance_km NUMERIC(8, 2),
  estimated_duration_minutes INTEGER,
  
  -- Payment
  payment_method VARCHAR(30) NOT NULL DEFAULT 'online_prepaid' CHECK (
    payment_method IN ('online_prepaid', 'cash_at_pickup')
  ),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'paid', 'cash_collected', 'refunded')
  ),
  
  -- Verification OTPs & Evidence
  pickup_otp VARCHAR(10),
  pickup_otp_verified BOOLEAN DEFAULT FALSE,
  pickup_evidence_url TEXT,
  
  delivery_otp VARCHAR(10),
  delivery_otp_verified BOOLEAN DEFAULT FALSE,
  delivery_evidence_url TEXT,
  
  cancellation_reason TEXT,
  
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON parcels(sender_id);
CREATE INDEX IF NOT EXISTS idx_parcels_driver_id ON parcels(driver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);

CREATE TABLE IF NOT EXISTS parcel_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN ('pickup', 'delivery')),
  photo_url TEXT NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcel_evidence_parcel_id ON parcel_evidence(parcel_id);
