# Runbook Addendum: SLOs, Alerting, and Retention

## Service Level Objectives (initial)
- **Answer rate**: >= 95% during after-hours window (rolling 7d)
- **p95 call setup latency** (Twilio webhook to agent ready): <= 1.2s
- **p95 booking time** (from intent=book to booking_created): <= 30s
- **False booking rate**: <= 1.0%

## Error Budget Policy
- Period: 30 days
- Budget breach if answer rate < 95% OR false booking rate > 1.5% for 24h
- When breached: freeze releases; focus on mitigations; RCA within 24h

## Alerting (CloudWatch examples)
- Alarm: `BookingFalseRateHigh` if `false_bookings / bookings_created > 0.015` for 10m
- Alarm: `CallSetupLatencyP95High` if `p95(call_setup_latency_ms) > 1200` for 5m
- Alarm: `AnswerRateLow` if `calls_answered / calls_received < 0.95` for 15m

## Data Retention
- `calls.retention_until` must be set on call end:
  - default = `started_at + interval '180 days'`
  - purge job runs nightly and deletes or anonymizes rows passed retention
- `consent_events` retained indefinitely unless customer requests deletion.

## On-call
- Severity levels: SEV1 (customer-impacting outage), SEV2 (degraded KPIs), SEV3 (single-tenant issue)
- Rotation: primary/secondary; page on SEV1-2 via PagerDuty; SEV3 as ticket

## Voice AI Tuning Parameters
- **BARGE_IN_MS**: time (ms) of user speech needed to interrupt TTS; lower = more responsive, too low = false barge-ins.
- **MAX_SILENCE_MS**: maximum silence before timeout; lower reduces dead air cost, higher reduces premature cutoffs.
- Review weekly using `call_handle_time_seconds` histogram and talk-over/error logs.
