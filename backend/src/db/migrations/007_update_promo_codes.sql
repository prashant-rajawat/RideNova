-- Migration: 007_update_promo_codes.sql
-- Description: Add start_date, expiry_date, is_active to promo_codes table.

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
