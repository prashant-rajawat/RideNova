-- Migration: 007_ride_expiry_and_priority.sql
-- Description: Add ride expiration timestamps, priority incentive levels, and admin matching settings.

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS incentive_amount NUMERIC(10, 2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS matching_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_timeout_minutes INTEGER NOT NULL DEFAULT 5,
  min_timeout_minutes INTEGER NOT NULL DEFAULT 1,
  max_timeout_minutes INTEGER NOT NULL DEFAULT 10,
  priority_tier_1_amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  priority_tier_2_amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  priority_tier_3_amount NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
  priority_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO matching_settings (id, request_timeout_minutes, priority_tier_1_amount, priority_tier_2_amount, priority_tier_3_amount, priority_enabled)
SELECT gen_random_uuid(), 5, 100.00, 500.00, 1000.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM matching_settings);
