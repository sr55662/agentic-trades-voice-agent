# CHANGELOG — Fixes Bundle (2025-08-29)

## Added
- Consent/TCPA logging (migrations/004_consent.sql)
- Booking holds with TTL (migrations/005_booking_holds.sql)
- OpenTelemetry metrics (src/lib/metrics.ts)
- Cost estimator CLI (scripts/cost_estimator.ts)
- Explicit FSM helper (src/llm/agent_state.ts)
- Autoscaling Terraform (infra/autoscaling.tf)
- KMS/Secrets examples (infra/secrets_kms.tf)
- Runbook SLOs & alerts (docs/Runbook_addendum.md)
- Design addendum (docs/Design_addendum.md)
- AWS deploy guide (README_AWS_DEPLOY.md)
- Dashboard guidance (admin/README_DASHBOARDS.md)
- Patch diffs for voice route and scheduling holds (patches/*.diff)
- Config env additions (patches/config_env_additions.md)

## Security
- Enforce Twilio signature validation (patch provided)
- Encourage KMS encryption & Secrets Manager for sensitive config

## Ops
- Defined initial SLOs, error budget, and CloudWatch alarm suggestions
- Introduced KPI metric names for consistent dashboards

## Cost
- Introduced environment-based model/STT/TTS tiering and estimator CLI