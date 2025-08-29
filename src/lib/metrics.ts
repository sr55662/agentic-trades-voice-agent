/**
 * src/lib/metrics.ts
 * Minimal OpenTelemetry-style metrics for KPIs.
 * Exposes counters/histograms and a generic trackMetric() shim.
 * 
 * NOTE: Install deps (dev/prod as you wish):
 *   npm i @opentelemetry/api @opentelemetry/sdk-metrics
 * Wire an exporter in src/index.ts or a separate bootstrap if desired.
 */

import { metrics as otMetrics } from '@opentelemetry/api';

const meter = otMetrics.getMeter('agentic-trades');

export const mCallsReceived   = meter.createCounter('calls_received',   { description: 'Inbound calls observed' });
export const mCallsAnswered   = meter.createCounter('calls_answered',   { description: 'Calls answered by agent' });
export const mBookingsCreated = meter.createCounter('bookings_created', { description: 'Successful bookings created' });
export const mFalseBookings   = meter.createCounter('false_bookings',   { description: 'Bookings later flagged false' });

export const hHandleTimeSec   = meter.createHistogram('call_handle_time_seconds', {
  description: 'Duration from answer to end in seconds'
});

/**
 * Generic tracker for ad-hoc metrics while migrating legacy trackMetric() calls.
 */
export function trackMetric(
  name: string,
  labels: Record<string, string | number | boolean> = {},
  value = 1
) {
  switch (name) {
    case 'calls_received':   mCallsReceived.add(value, labels); break;
    case 'calls_answered':   mCallsAnswered.add(value, labels); break;
    case 'bookings_created': mBookingsCreated.add(value, labels); break;
    case 'false_bookings':   mFalseBookings.add(value, labels); break;
    case 'call_handle_time_seconds': hHandleTimeSec.record(value, labels); break;
    default:
      // Fallback: treat as a custom counter
      meter.createCounter(name).add(value, labels);
  }
}