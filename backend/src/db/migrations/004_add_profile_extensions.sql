-- Migration: 004_add_profile_extensions.sql
-- Description: Adds extended customer profile fields, emergency contacts, and safety preferences.

-- 1. Extended User Profile Information
CREATE TABLE IF NOT EXISTS user_profile_extensions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  alternate_phone VARCHAR(50),
  preferred_language VARCHAR(50) DEFAULT 'English',
  city VARCHAR(255),
  profile_completion_percentage INTEGER DEFAULT 0 CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- 3. Safety and Health Preferences
CREATE TABLE IF NOT EXISTS safety_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  accessibility_notes TEXT,
  emergency_notes TEXT,
  consent_given BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add update triggers for auto-updating updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profile_extensions_updated_at ON user_profile_extensions;
CREATE TRIGGER trigger_user_profile_extensions_updated_at
  BEFORE UPDATE ON user_profile_extensions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_emergency_contacts_updated_at ON emergency_contacts;
CREATE TRIGGER trigger_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_safety_preferences_updated_at ON safety_preferences;
CREATE TRIGGER trigger_safety_preferences_updated_at
  BEFORE UPDATE ON safety_preferences
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();
