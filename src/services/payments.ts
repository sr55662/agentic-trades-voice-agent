/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import Stripe from 'stripe';
import { env } from '../lib/config';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });

export async function createDepositCheckoutSession(jobId: string, customerId: string, depositAmount: number) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: depositAmount * 100,
        product_data: {
          name: 'Service Deposit',
          description: `Deposit for Job ${jobId.slice(0,8)}`
        }
      }
    }],
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    metadata: { job_id: jobId, customer_id: customerId, type: 'deposit' }
  });
  return session;
}