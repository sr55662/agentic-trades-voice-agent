/**
 * Mobile App endpoints (JWT protected)
 * - GET  /api/app/me
 * - GET  /api/app/jobs
 * - GET  /api/app/payments
 * - POST /api/app/book (simple booking request for clients)
 */
import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../lib/jwt';
import { pool } from '../lib/db';

async function authGuard(req: any, reply: any) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return reply.code(401).send({ error: 'Missing token' });
  const payload = verifyJWT(token);
  if (!payload) return reply.code(401).send({ error: 'Invalid token' });
  (req as any).user = payload;
}

export default async function appRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/api/app/me', async (req, reply) => {
    const user = (req as any).user;
    const { rows } = await pool.query(
      `SELECT id, name, phone_e164, email, membership_level, lifetime_value, address_json
       FROM customers WHERE id=$1`, [user.sub]
    );
    return reply.send({ me: rows[0] });
  });

  app.get('/api/app/jobs', async (req, reply) => {
    const user = (req as any).user;
    const { rows } = await pool.query(
      `SELECT j.*, 
              to_char(j.window_start, 'YYYY-MM-DD"T"HH24:MI:SSZ') as window_start_iso,
              to_char(j.window_end, 'YYYY-MM-DD"T"HH24:MI:SSZ') as window_end_iso
       FROM jobs j
       WHERE j.customer_id=$1
       ORDER BY j.window_start DESC`, [user.sub]
    );
    return reply.send({ jobs: rows });
  });


app.get('/api/app/calls', async (req, reply) => {
  const user = (req as any).user;
  const { rows } = await pool.query(
    `SELECT c.call_sid, c.started_at, c.outcome, c.booking_created, c.total_duration_seconds, 
            c.intent_detected as intents_detected, c.caller_number
       FROM calls c
      WHERE c.caller_number = (SELECT phone_e164 FROM customers WHERE id=$1)
      ORDER BY c.started_at DESC
      LIMIT 200`, [user.sub]
  );
  return reply.send({ calls: rows });
});

app.get('/api/app/call-stats', async (req, reply) => {
  const user = (req as any).user;
  const { rows } = await pool.query(
    `WITH my_calls AS (
       SELECT * FROM calls 
        WHERE caller_number = (SELECT phone_e164 FROM customers WHERE id=$1)
          AND started_at >= current_date - interval '90 days'
     )
     SELECT 
       COUNT(*) AS total_calls,
       COUNT(*) FILTER (WHERE outcome != 'no_answer' AND outcome != 'abandoned') AS answered_calls,
       COUNT(*) FILTER (WHERE booking_created = true) AS bookings,
       ROUND(
         CASE WHEN COUNT(*) FILTER (WHERE outcome != 'no_answer' AND outcome != 'abandoned') > 0
           THEN COUNT(*) FILTER (WHERE booking_created = true)::numeric 
                / COUNT(*) FILTER (WHERE outcome != 'no_answer' AND outcome != 'abandoned') * 100
           ELSE 0 END, 2
       ) AS booking_conversion_percent
     FROM my_calls`, [user.sub]
  );
  return reply.send({ stats: rows[0] || { total_calls:0, answered_calls:0, bookings:0, booking_conversion_percent:0 } });
});
  app.get('/api/app/payments', async (req, reply) => {
    const user = (req as any).user;
    const { rows } = await pool.query(
      `SELECT p.* 
         FROM payments p 
        WHERE p.customer_id=$1
        ORDER BY p.created_at DESC`, [user.sub]
    );
    return reply.send({ payments: rows });
  });

  // Simple booking request (non-emergency)
  app.post('/api/app/book', async (req, reply) => {
    const user = (req as any).user;
    const { service_type, description, preferred_time } = (req.body as any) || {};
    if (!service_type || !preferred_time) return reply.code(400).send({ error: 'Missing fields' });

    const cust = await pool.query('SELECT id FROM customers WHERE id=$1', [user.sub]);
    if (cust.rows.length === 0) return reply.code(404).send({ error: 'Customer not found' });

    const start = new Date(preferred_time);
    const end = new Date(start.getTime() + 2*60*60*1000);
    const job = await pool.query(
      `INSERT INTO jobs (customer_id, svc_type, category, description, urgency, window_start, window_end, status, priority, source, booking_channel, is_after_hours)
       VALUES ($1,$2,$3,$4,'routine',$5,$6,'scheduled','normal','mobile_app','mobile', false)
       RETURNING *`,
       [user.sub, service_type, service_type === 'maintenance' ? 'maintenance' : 'repair', description||'', start, end]
    );

    return reply.send({ job: job.rows[0] });
  });
}
