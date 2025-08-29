/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import { FastifyInstance } from 'fastify';
import { stripe } from '../services/payments';
import { pool } from '../lib/db';
import { trackMetric } from '../lib/metrics';
import { env } from '../lib/config';

export default async function payments(app: FastifyInstance) {
  // Stripe requires raw body for webhook signature verification
  app.post('/webhooks/stripe', { config: { rawBody: true } }, async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return reply.code(400).send({ error: 'Missing signature' });
    try {
      const event = stripe.webhooks.constructEvent((req as any).rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const jobId = session.metadata?.job_id;
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        if (jobId) {
          await pool.query(
            """
UPDATE jobs SET deposit_paid=true, deposit_amount=$1, payment_status='partial', updated_at=now() WHERE id=$2
""", 
            [amount, jobId]
          );
          await trackMetric('DepositPaid', amount);
        }
      }
      reply.send({ received: true });
    } catch (err:any) {
      reply.code(400).send({ error: 'Invalid signature', details: err.message });
    }
  });
}

// --- Refund/Dispute handling (PCI-scope neutral: no PAN ever stored) ---
server.post('/payments/webhook', async (req, reply) => {
  // TODO: verify Stripe signature here; parse event
  const event: any = (req as any).stripeEvent;
  if (!event) return reply.code(200).send({ received: true });
  switch (event.type) {
    case 'charge.refunded':
    case 'payment_intent.partially_refunded':
      req.log?.info({ type: event.type }, 'refund processed');
      // await db.query('update bookings set refunded=true, refunded_at=now() where payment_intent_id=$1', [pid]);
      break;
    case 'charge.dispute.created':
    case 'charge.dispute.closed':
      req.log?.warn({ type: event.type }, 'dispute event');
      // optional: store minimal dispute metadata for ops
      break;
    default:
      break;
  }
  return reply.code(200).send({ received: true });
});
