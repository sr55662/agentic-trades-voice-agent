/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.string().default('5050'),
  APP_URL: z.string().url().default('http://localhost:5050'),
  OPENAI_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  TWILIO_VALIDATE_SIGNATURE: z.string().default('true'),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  STRIPE_SUCCESS_URL: z.string().default('http://localhost:5050/pay/success'),
  STRIPE_CANCEL_URL: z.string().default('http://localhost:5050/pay/canceled'),
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().default('60000'),
});

export const env = envSchema.parse(process.env);
export const jwt = { secret: process.env.JWT_SECRET } as const;


// --- Added: cost & ops controls
export const modelTier = (process.env.MODEL_TIER || 'realtime-small') as
  'realtime-nano' | 'realtime-small' | 'realtime-med' | 'realtime-large';
export const sttMode = (process.env.STT_MODE || 'streaming') as 'streaming' | 'batch';
export const ttsTier = (process.env.TTS_TIER || 'premium') as 'premium' | 'standard';
export const metricsExporter = (process.env.METRICS_EXPORTER || 'cloudwatch') as 'cloudwatch' | 'prometheus' | 'none';
export const retentionDays = parseInt(process.env.RETENTION_DAYS || '180', 10);
export const bargeInMs = parseInt(process.env.BARGE_IN_MS || '200', 10);
export const maxSilenceMs = parseInt(process.env.MAX_SILENCE_MS || '6000', 10);
