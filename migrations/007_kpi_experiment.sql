-- migrations/007_kpi_experiment.sql
-- Add false booking labeling and A/B variant to calls.

ALTER TABLE IF EXISTS calls
  ADD COLUMN IF NOT EXISTS is_false_positive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS experiment_variant TEXT;
