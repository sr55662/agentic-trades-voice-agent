CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number TEXT NOT NULL,
  to_number   TEXT NOT NULL,
  body        TEXT NOT NULL,
  direction   TEXT CHECK (direction IN ('inbound','outbound')) DEFAULT 'inbound',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
