-- migrations/005_booking_holds.sql
-- Purpose: Prevent double bookings with a server-side hold table + TTL.

CREATE TABLE IF NOT EXISTS booking_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL,            -- e.g., technician id, truck id, or generic slot key
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end   TIMESTAMPTZ NOT NULL,
  customer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,      -- set to now() + interval '5 minutes' by app
  UNIQUE (resource_id, slot_start, slot_end) DEFERRABLE INITIALLY IMMEDIATE
);

-- Index to quickly purge expired holds
CREATE INDEX IF NOT EXISTS booking_holds_expires_at_idx ON booking_holds (expires_at);