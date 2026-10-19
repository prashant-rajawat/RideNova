-- Migration: 006_driver_account_settings.sql
-- Add driver settings extensions: upi_id, operating_city, preferences, puc details, and photo url

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS operating_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50) DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_accept_rides BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS working_hours_preference VARCHAR(100) DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS quiet_ride_preference BOOLEAN DEFAULT false;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS puc_expiry VARCHAR(50),
  ADD COLUMN IF NOT EXISTS puc_document_url TEXT;
