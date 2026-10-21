-- Migration: 011_scheduled_booking_extensions.sql
-- Description: Add booking_mode, payment_status, admin_review_status, and reviewed_at columns to rides table.

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'on-demand',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
