# Dashboards & KPIs

## Core Metrics (map to OpenTelemetry names)
- calls_received
- calls_answered
- bookings_created
- false_bookings
- call_handle_time_seconds (histogram)

## Suggested Visuals
- Answer rate = calls_answered / calls_received (daily)
- Booking conversion = bookings_created / calls_answered
- False booking rate = false_bookings / bookings_created
- p95 handle time (seconds)

## Embedding
The admin `reports` page can embed Grafana panels via iframes or fetch metrics from /api/analytics.