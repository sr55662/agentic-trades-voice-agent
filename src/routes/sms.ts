import { FastifyInstance } from 'fastify';
import { isValidTwilioSignature } from '../lib/twilio';
import { pool } from '../lib/db';
import { AppError } from '../lib/errors';

/**
 * Twilio SMS webhook (basic). Stores the inbound message and replies with an acknowledgment.
 * Prefix routes with /sms when registering.
 */
export default async function smsRoutes(app: FastifyInstance) {
  app.post('/incoming', async (req: any, reply) => {
    if (process.env.NODE_ENV !== 'development') {
      if (!isValidTwilioSignature(req)) {
        throw new AppError('InvalidSignature', 'Twilio signature invalid', 403);
      }
    }
    const from = (req.body && (req.body.From || req.body.from)) as string | undefined;
    const to = (req.body && (req.body.To || req.body.to)) as string | undefined;
    const body = (req.body && (req.body.Body || req.body.body)) as string | undefined;
    if (!from || !to) return reply.code(400).send({ error: 'missing from/to' });
    await pool.query(
      `INSERT INTO sms_messages(from_number,to_number,body) VALUES($1,$2,$3)`,
      [from, to, body || '']
    );
    const twiml = `<Response><Message>Thanks! A scheduler will text you shortly. Reply BOOK to reserve a slot.</Message></Response>`;
    reply.type('text/xml').send(twiml);
  });
}
