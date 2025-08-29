-- migrations/006_pii_encryption.sql
-- Add encrypted columns for PII (non-breaking). Store ciphertext as TEXT (base64).

ALTER TABLE IF EXISTS customers
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_encrypted TEXT;

-- Optional: keep plaintext for now; plan a backfill + removal later.
-- Add masking-friendly computed columns if using Postgres 12+ (via views).
