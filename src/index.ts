/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import rawBody from 'fastify-raw-body';
import { env } from './lib/config';
import { pool } from './lib/db';
import smsRoutes from './routes/sms';


import health from './routes/health';
import voice from './routes/voice';
import payments from './routes/payments';
import api from './routes/api';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: Number(env.RATE_LIMIT_MAX), timeWindow: Number(env.RATE_LIMIT_TIME_WINDOW) });
await app.register(websocket);
await app.register(rawBody, { field: 'rawBody', global: false, encoding: 'utf8', runFirst: true });

await app.register(health);
await app.register(voice);
await app.register(payments);
await app.register(api);
await app.register(smsRoutes,{ prefix:'/sms' });


const port = Number(env.PORT || 5050);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on ${port}`);
}).catch(err => {
  app.log.error(err);
  process.exit(1);
});
import { toErrorResponse, AppError } from './lib/errors';

// Unified error handler
app.setErrorHandler((err, req, reply) => {
  const status = err instanceof AppError ? err.status : 500;
  req.log?.error(err);
  return reply.code(status).send(toErrorResponse(err));
});

// Lightweight tracing hooks (can be replaced by full OpenTelemetry tracing)
app.addHook('onRequest', async (req) => {
  (req as any).trace = { start: Date.now(), path: (req as any).routerPath || req.url };
});
app.addHook('onResponse', async (req, reply) => {
  const start = (req as any).trace?.start;
  if (start) {
    const durMs = Date.now() - start;
    try { 
      // trackMetric('http_request_duration_ms', { path: (req as any).trace.path, code: reply.statusCode }, durMs);
    } catch {}
  }
});
