-- Migration: 002_driver_kyc_and_payouts.sql
-- Add KYC, verification, document metadata, and payout tracking

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS dob VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS license_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS license_expiry VARCHAR(50),
  ADD COLUMN IF NOT EXISTS license_front_url TEXT,
  ADD COLUMN IF NOT EXISTS license_back_url TEXT,
  ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS id_number_masked VARCHAR(50),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_account_number_masked VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_status VARCHAR(50) DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS seating_capacity INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_expiry VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rc_document_url TEXT,
  ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
  ADD COLUMN IF NOT EXISTS permit_document_url TEXT;

CREATE TABLE IF NOT EXISTS driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  bank_account_masked VARCHAR(50),
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON driver_payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON driver_payouts(status);
