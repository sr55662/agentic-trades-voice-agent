/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import { FastifyInstance } from 'fastify';
import { pool } from '../lib/db';

export default async function health(app: FastifyInstance) {
  app.get('/health', async (req, reply) => {
    try {
      const { rows } = await pool.query('SELECT 1 as healthy');
      reply.send({ status: 'healthy', database: rows.length > 0, version: '2.0.0' });
    } catch (e:any) {
      reply.code(503).send({ status: 'unhealthy', error: e.message });
    }
  });
}