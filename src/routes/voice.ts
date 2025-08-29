/**
 * Voice routes
 *  - POST /incoming: Twilio Voice webhook -> returns TwiML that bridges audio via <Connect><Stream> to our WS
 *  - GET  /media   : WebSocket endpoint Twilio connects to; we spin up an OpenAI Realtime session and stream audio
 *
 * Security:
 *  - Enforce Twilio signature validation (X-Twilio-Signature). In development you can bypass with env toggle.
 *  - We do minimal work in the webhook; heavy work is in the WS endpoint
 *
 * Observability:
 *  - On connection, we log a call record; on close, we update the outcome
 *  - Turn events are handled from the Realtime session and inserted into agent_turns
 */

import { FastifyInstance } from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import { twilio as twilioClient } from '../services/notify';
import { env } from '../lib/config';
import { pool } from '../lib/db';
import { AppError } from '../lib/errors';
import { createSessionForTwilio, setRetention } from '../llm/agent';
import { escalateToHuman } from '../services/hitl';

export default async function voice(app: FastifyInstance) {
  app.register(fastifyFormBody);

  /**
   * Validate Twilio webhook signature.
   * Fail-closed in non-development. In development, you may bypass unless TWILIO_VALIDATE_SIGNATURE=true.
   */
  function validateTwilio(req: any): boolean {
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.headers.host}${(req.raw.url || '').split('?')[0]}`;
    try {
      const valid = twilioClient.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body || {});
      if (process.env.NODE_ENV !== 'development') return !!valid; // enforce in prod/stage
      return env.TWILIO_VALIDATE_SIGNATURE === 'true' ? !!valid : true; // dev: allow bypass unless explicitly required
    } catch {
      return false;
    }
  }

  /**
   * Twilio voice webhook -> return TwiML to start media stream
   */
  app.all('/incoming', async (req, reply) => {
    if (!validateTwilio(req)) throw new AppError('InvalidSignature', 'Twilio signature invalid', 403);

    const hour = new Date().getHours();
    const isAfterHours = hour < 8 || hour > 18;
    const wsUrl = `wss://${req.headers.host}/media?after_hours=${isAfterHours}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling. This call may be recorded for quality assurance.</Say>
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>
</Response>`;
    reply.type('text/xml').send(twiml);
  });

  /**
   * Twilio <Stream> connects here (WebSocket). We:
   * - create a call record
   * - start an OpenAI Realtime session bound to this WS
   * - capture session events for QA/metrics
   * - update call outcome on close
   */
  app.get('/media', { websocket: true }, async (connection, req) => {
    const params = new URLSearchParams(((req as any).url || '').split('?')[1] || '');
    const isAfterHours = params.get('after_hours') === 'true';
    const callSid = params.get('CallSid') || `call_${Date.now()}`;

    await pool.query(
      'INSERT INTO calls (call_sid, started_at, channel, business_hours) VALUES ($1, now(), $2, $3) ON CONFLICT (call_sid) DO NOTHING',
      [callSid, 'PSTN', !isAfterHours]
    );

    // Create LLM session bound to this Twilio WebSocket
    const session = await createSessionForTwilio(connection, { apiKey: env.OPENAI_API_KEY });

    // ---- Instrumentation: capture basic session events ----
    let turnCounter = 0;
    session.on('turn_start', async () => {
      turnCounter += 1;
    });

    session.on('turn_complete', async (event: any) => {
      try {
        await pool.query(
          `INSERT INTO agent_turns (call_sid, turn_number, role, message_text, latency_ms, tool_calls_json, tool_success)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (call_sid, turn_number) DO NOTHING`,
          [
            callSid,
            turnCounter,
            event.role || 'assistant',
            event.transcript || null,
            event.latency_ms || null,
            event.tool_calls ? JSON.stringify(event.tool_calls) : null,
            event.error ? false : true,
          ]
        );
      } catch {
        // don't crash the call for analytics failures
      }
    });

    session.on('error', async () => {
      await pool
        .query('UPDATE calls SET outcome=$2 WHERE call_sid=$1', [callSid, 'escalated'])
        .catch(() => {});
    });

    connection.socket.on('close', async () => {
      await pool
        .query('UPDATE calls SET ended_at=now(), outcome=$2 WHERE call_sid=$1 AND ended_at IS NULL', [
          callSid,
          'completed',
        ])
        .catch(() => {});
    });
  });

  /**
   * Initiate human-in-the-loop escalation (HITL) for a call.
   * Body: { callSid: string, reason?: string }
   * Returns 202 on accepted handoff.
   */
  app.post('/escalate', async (req, reply) => {
    const { callSid, reason } = (req as any).body || {};
    if (!callSid) throw new AppError('BadRequest', 'callSid required', 400);
    await escalateToHuman(app.log, { callSid, reason });
    reply.code(202).send({ status: 'handoff_initiated' });
  });

  /**
   * Optional: provider callback to confirm/annotate escalation outcome.
   * Can be extended to mark calls.outcome='transfer' or similar.
   */
  app.post('/escalation/callback', async (_req, reply) => {
    reply.code(204).send();
  });
}

// Signature enforcement now handled by validateTwilio()

// Example: trackMetric('voice_incoming', { route: 'incoming' });
