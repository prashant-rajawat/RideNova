-- Migration: 009_scheduled_rides.sql
-- Description: Add scheduled_at column for advance ride reservations.

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rides_scheduled_at ON rides(scheduled_at);
