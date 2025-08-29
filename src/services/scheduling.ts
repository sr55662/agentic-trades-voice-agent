/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import { pool } from '../lib/db';

export class SchedulingEngine {
  static async getAvailableSlots(serviceType: string, isEmergency: boolean, preferredDate?: string) {
    const query = `
      WITH series AS (
        SELECT generate_series(
          CASE WHEN $2 THEN now() + interval '2 hours'
               ELSE COALESCE($3::date, current_date + interval '1 day')
          END,
          COALESCE($3::date, current_date + interval '7 days'),
          interval '2 hours'
        ) as slot
      )
      SELECT s.slot
      FROM series s
      WHERE NOT EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.status IN ('scheduled','in_progress','confirmed')
          AND j.window_start = s.slot
      )
      ORDER BY s.slot
      LIMIT 12
    `;
    const { rows } = await pool.query(query, [serviceType, isEmergency, preferredDate]);
    return rows.map(r => r.slot as Date);
  }
}

// --- Added: transactionally safe hold mechanism to avoid double-booking
import { pool } from '../lib/db';
export async function holdSlot(resourceId: string, start: Date, end: Date, customerPhone: string, ttlMinutes = 5) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO booking_holds (resource_id, slot_start, slot_end, customer_phone, expires_at)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)
       ON CONFLICT (resource_id, slot_start, slot_end) DO NOTHING
       RETURNING id`,
      [resourceId, start, end, customerPhone, ttlMinutes]
    );
    await client.query('COMMIT');
    return res.rowCount === 1;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


// --- Added: hold lifecycle helpers
export async function releaseHold(resourceId: string, start: Date, end: Date) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM booking_holds WHERE resource_id=$1 AND slot_start=$2 AND slot_end=$3`,
      [resourceId, start, end]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}

export async function commitHold(resourceId: string, start: Date, end: Date) {
  // For now, simply release hold on commit; booking row should be created elsewhere atomically
  await releaseHold(resourceId, start, end);
}
