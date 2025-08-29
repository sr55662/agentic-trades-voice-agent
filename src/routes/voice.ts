/**
 * Voice routes
 *  - POST /incoming: Twilio Voice webhook -> returns TwiML that bridges audio via <Connect><Stream> to our WS
 *  - GET  /media   : WebSocket endpoint Twilio connects to; we spin up an OpenAI Realtime session and stream audio
 *
 * Security:
 *  - Optional Twilio signature validation (X-Twilio-Signature)
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
import { isValidTwilioSignature } from '../lib/twilio';

export default async function voice(app: FastifyInstance) {
  app.register(fastifyFormBody);

  function validateTwilio(req: any): boolean {
    if (env.TWILIO_VALIDATE_SIGNATURE !== 'true') return true;
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.headers.host}${req.raw.url.split('?')[0]}`;
    try {
      return twilioClient.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body || {});
    } catch {
      return false;
    }
  }

  /**
   * Twilio voice webhook -> return TwiML to start media stream
   */
  app.all('/incoming', async (req, reply) => {
    if (!validateTwilio(req)) return reply.code(403).send('Forbidden');
    const hour = new Date().getHours();
    const isAfterHours = (hour < 8 || hour > 18);
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
    const params = new URLSearchParams((req as any).url.split('?')[1] || '');
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
            event.error ? false : true
          ]
        );
      } catch (e) {
        // don't crash the call for analytics failures
      }
    });

    session.on('error', async (err: any) => {
      await pool.query('UPDATE calls SET outcome=$2 WHERE call_sid=$1', [callSid, 'escalated']).catch(()=>{});
    });

    connection.socket.on('close', async () => {
      await pool.query('UPDATE calls SET ended_at=now(), outcome=$2 WHERE call_sid=$1 AND ended_at IS NULL', [callSid, 'completed']).catch(()=>{});
    });
  });
}
// TODO: Ensure Twilio signature validation is enforced in /incoming route (fail-closed when not dev)

// Example: trackMetric('voice_incoming', { route: 'incoming' });
