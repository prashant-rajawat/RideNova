-- Migration: 008_ride_otp_and_cancellation.sql
-- Description: Add trip verification OTP fields and cancellation fee support to rides table.

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_rides_expires_at ON rides(expires_at);
