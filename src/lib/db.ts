/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

import pg from 'pg';
import { env } from './config';

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });