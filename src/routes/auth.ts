/**
 * Auth endpoints for the mobile client via SMS OTP
 * - POST /api/auth/request-otp  { phone }
 * - POST /api/auth/verify-otp   { phone, code }
 */
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { pool } from '../lib/db';
import { sendSMS } from '../services/notify';
import { signJWT } from '../lib/jwt';

function hashCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return (Math.floor(100000 + Math.random() * 900000)).toString(); // 6 digits
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/request-otp', async (req, reply) => {
    const { phone } = (req.body as any) || {};
    if (!phone) return reply.code(400).send({ error: 'Missing phone' });
    const code = generateCode();
    const codeHash = hashCode(code);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      `INSERT INTO auth_otp (phone_e164, code_hash, expires_at) VALUES ($1,$2,$3)`,
      [phone, codeHash, expires.toISOString()]
    );

    await sendSMS(phone, `Your verification code: ${code}. It expires in 10 minutes.`);

    return reply.send({ ok: true, expires_at: expires.toISOString() });
  });

  app.post('/api/auth/verify-otp', async (req, reply) => {
    const { phone, code } = (req.body as any) || {};
    if (!phone || !code) return reply.code(400).send({ error: 'Missing phone or code' });

    const { rows } = await pool.query(
      `SELECT * FROM auth_otp WHERE phone_e164=$1 ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    const row = rows[0];
    const now = new Date();
    if (!row) return reply.code(400).send({ error: 'Code not found' });
    if (new Date(row.expires_at) < now) return reply.code(400).send({ error: 'Code expired' });

    const codeHash = hashCode(code);
    if (row.code_hash !== codeHash) {
      await pool.query('UPDATE auth_otp SET attempts = attempts + 1 WHERE id=$1', [row.id]);
      return reply.code(400).send({ error: 'Invalid code' });
    }

    // Find or create customer by phone
    const cust = await pool.query(
      `SELECT id, name, phone_e164 FROM customers WHERE phone_e164=$1`,
      [phone]
    );
    if (cust.rows.length === 0) {
      return reply.code(404).send({ error: 'Customer not found. Please contact support to onboard.' });
    }

    const token = signJWT({ sub: cust.rows[0].id, phone: phone });

    return reply.send({ token, customer_id: cust.rows[0].id });
  });
}
