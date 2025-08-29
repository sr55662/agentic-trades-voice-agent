/**
 * src/lib/twilio.ts
 * Enforce Twilio webhook signature validation.
 * Uses the official Twilio helper to validate requests.
 */
import type { FastifyRequest } from 'fastify';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import crypto from 'crypto';

function getRawBody(req: any): string {
  // Fastify may store raw body if configured; otherwise reconstruct best-effort.
  // For robust validation, ensure rawBody is available (fastify-raw-body).
  // Fallback to JSON stringify for known parsed bodies.
  // @ts-ignore
  if (req.rawBody) return req.rawBody.toString('utf8');
  try { return typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}); } catch { return ''; }
}

export function isValidTwilioSignature(req: FastifyRequest, fullUrl: string, authToken?: string): boolean {
  const token = authToken || process.env.TWILIO_AUTH_TOKEN || '';
  const sig = (req.headers['x-twilio-signature'] || req.headers['X-Twilio-Signature']) as string | undefined;
  if (!token || !sig) return false;
  const body = getRawBody(req);
  try {
    return validateRequest(token, sig, fullUrl, body);
  } catch {
    return false;
  }
}
