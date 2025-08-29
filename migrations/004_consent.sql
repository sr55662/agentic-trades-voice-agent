-- migrations/004_consent.sql
-- Purpose: Add explicit consent/TCPA logging and retention fields.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  -- If you have customers(id), uncomment the FK:
  -- customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel TEXT CHECK (channel IN ('voice','sms','email')) NOT NULL,
  consent_type TEXT CHECK (consent_type IN ('recording','marketing','transactional')) NOT NULL,
  proof TEXT,                                  -- e.g., Twilio Call SID, SMS SID, or audio snippet URI
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend calls table with consent flags and retention control
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

-- Optional helper view to audit consent coverage
CREATE OR REPLACE VIEW consent_audit AS
SELECT
  c.id AS call_id,
  c.call_sid,
  c.started_at,
  c.recording_consent,
  c.marketing_consent,
  c.retention_until
FROM calls c;