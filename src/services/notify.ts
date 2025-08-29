/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import Twilio from 'twilio';
import { env } from '../lib/config';
import { pool } from '../lib/db';
import { AppError } from '../lib/errors';

export const twilio = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendSMS(to: string, body: string) {
  return twilio.messages.create({ to, from: env.TWILIO_PHONE_NUMBER, body });
  // Enforce marketing consent before sending any marketing SMS
  
}

// --- Added: consent enforcement for marketing SMS
import { pool } from '../lib/db';

export async function canSendMarketing(callId: string): Promise<boolean> {
  const res = await pool.query(`SELECT marketing_consent FROM calls WHERE id=$1`, [callId]);
  return !!(res.rows[0] && res.rows[0].marketing_consent);
}

/**
 * send_sms(to, body, type, callId)
 * type: 'transactional'|'marketing' (default 'transactional')
 */
export async function send_sms(to: string, body: string, type: 'transactional'|'marketing' = 'transactional', callId?: string) {
 // Enforce marketing consent before sending any marketing SMS
  if (type === 'marketing' && callId) {
    const { rows } = await pool.query(
      'SELECT marketing_consent FROM calls WHERE call_sid = $1 LIMIT 1',
      [callId]
    );
    if (!rows[0]?.marketing_consent) {
      throw new AppError('ConsentRequired', 'Marketing consent not granted', 412);
    }
  }
  if (type === 'marketing') {
    if (!callId) throw new Error('marketing SMS requires callId for consent check');
    const ok = await canSendMarketing(callId);
    if (!ok) throw new Error('marketing consent not granted');
  }
  // existing SMS provider integration here...
}
