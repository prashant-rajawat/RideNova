-- Migration: 003_payment_settings.sql
-- Description: Admin payment settings and manual UPI UTR verification support

CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id VARCHAR(255) NOT NULL DEFAULT 'ridenova@okhdfcbank',
  upi_qr_url TEXT DEFAULT '',
  commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value NUMERIC(10, 2) NOT NULL DEFAULT 15.00 CHECK (commission_value >= 0),
  stripe_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  manual_upi_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_settings (id, upi_id, upi_qr_url, commission_type, commission_value, stripe_enabled, manual_upi_enabled)
SELECT gen_random_uuid(), 'ridenova@okhdfcbank', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=ridenova@okhdfcbank&pn=RideNova', 'percentage', 15.00, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_settings);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'succeeded';
