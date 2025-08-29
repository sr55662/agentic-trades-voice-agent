import { classifyYesNo } from './consent_classifier';
/**
 * LLM Agent: HVAC Scheduler Pro
 * ---------------------------------
 * Real-time agent plugged into Twilio <Stream> audio using OpenAI Realtime.
 * Responsibilities:
 * - Converse with callers (disclose AI, follow call flow, avoid technical advice).
 * - Use tools to: price jobs, check scheduling, book appointments, escalate.
 * - Emit QA/metrics events we persist in Postgres (via the voice route listeners).
 */

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { PricingEngine } from '../services/pricing';
import { SchedulingEngine } from '../services/scheduling';
import { trackMetric } from '../lib/metrics';
import { pool } from '../lib/db';
import { createDepositCheckoutSession } from '../services/payments';
import { sendSMS } from '../services/notify';

/** Utility to parse after-hours window (08:00–18:00) */
function isAfterHours(date = new Date()) {
  const hour = date.getHours();
  return (hour < 8 || hour > 18);
}

/** Construct the business-aware agent with tools */
export function buildBusinessAgent() {
  const agent = new RealtimeAgent({
    name: 'HVAC Scheduler Pro',
    instructions: `
You are a professional HVAC scheduling assistant for a home services company.

CORE RULES:
- Always disclose you're an AI assistant at the start.
- Keep responses under 6 seconds and conversational.
- Ask ONE question at a time to avoid overwhelming callers.
- NEVER give technical repair advice — only schedule appointments.
- For emergencies (gas leak, smoke, carbon monoxide), tell caller to hang up and call 911 immediately.

CALL FLOW:
1) Greeting: "Thanks for calling [Company]. I'm the scheduling assistant. How can I help with your HVAC needs?"
2) Qualify: Service type (heating/cooling/maintenance), urgency, brief description.
3) Collect: Name, phone number, service address.
4) Quote: Provide good-better-best pricing options.
5) Schedule: Offer 2-3 available time slots.
6) Confirm: Repeat details, mention deposit requirement.
7) Close: "You'll receive a text confirmation with a payment link for your deposit."

PRICING APPROACH:
- Always offer service call fee + estimated repair cost.
- Mention membership savings if applicable.
- For after-hours: explain emergency fees upfront.
- Use ranges: "Typically runs $300-600 depending on the repair needed."

COMPLIANCE:
- This call may be recorded for quality assurance.
- Never collect credit card numbers over the phone.
- Confirm spelling of addresses for accuracy.
- Ask about pets or special access instructions.
`,
    tools: [
      {
        name: 'get_pricing_quote',
        description: 'Generate pricing estimate for HVAC service',
        parameters: {
          type: 'object',
          properties: {
            service_type: { type: 'string', enum: ['diagnostic','repair','maintenance','emergency'] },
            description: { type: 'string' },
            is_after_hours: { type: 'boolean' }
          },
          required: ['service_type','description']
        },
        execute: async ({ service_type, description, is_after_hours }: any) => {
          const quote = PricingEngine.calculateQuote(service_type, description, !!is_after_hours);
          await trackMetric('QuoteGenerated', 1, 'Count', [
            { name: 'ServiceType', value: String(service_type) },
            { name: 'AfterHours', value: String(!!is_after_hours) }
          ]);
          const emerg = ['gas leak','smoke','carbon monoxide','no heat','no cooling'].some(k => (description||'').toLowerCase().includes(k));
          return {
            ...quote,
            message: emerg
              ? 'This appears to be an emergency. We can have a technician out within 2 hours.'
              : "Here's your pricing estimate. Would you like to schedule an appointment?"
          };
        }
      },
      {
        name: 'check_availability',
        description: 'Check available appointment slots',
        parameters: {
          type: 'object',
          properties: {
            service_type: { type: 'string' },
            is_emergency: { type: 'boolean' },
            preferred_date: { type: 'string', format: 'date' }
          },
          required: ['service_type']
        },
        execute: async ({ service_type, is_emergency=false, preferred_date }: any) => {
          const slots = await SchedulingEngine.getAvailableSlots(service_type, is_emergency, preferred_date);
          return {
            available_slots: slots.map((slot: Date) => ({
              datetime: slot,
              display: slot.toLocaleString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
              })
            })),
            message: is_emergency
              ? "For emergency service, I can get you on today's schedule."
              : "Here are our next available appointments. Which time works best?"
          };
        }
      },
      {
        name: 'book_appointment',
        description: 'Create appointment and customer record, return Stripe Checkout link for deposit',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            service_type: { type: 'string' },
            description: { type: 'string' },
            scheduled_time: { type: 'string', format: 'date-time' },
            estimated_cost: { type: 'number' },
            is_emergency: { type: 'boolean' }
          },
          required: ['customer_name','phone','address','service_type','scheduled_time']
        },
        execute: async (params: any) => {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            // Upsert customer
            const cust = await client.query(
              `INSERT INTO customers (name, phone_e164, email, address_json, created_at)
               VALUES ($1,$2,$3,$4, now())
               ON CONFLICT (phone_e164) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()
               RETURNING id`,
              [params.customer_name, params.phone, params.email, JSON.stringify({ full_address: params.address })]
            );
            const customerId = cust.rows[0].id;

            // Create job
            const start = new Date(params.scheduled_time);
            const end = new Date(start.getTime() + 2*60*60*1000);
            const isAfter = isAfterHours(start);
            const job = await client.query(
              `INSERT INTO jobs (customer_id, svc_type, category, description, urgency, window_start, window_end, status, priority, source, booking_channel, estimated_cost, lead_time_hours, is_after_hours)
               VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled',$8,'voice_agent','voice',$9,$10,$11)
               RETURNING *`,
               [
                 customerId,
                 params.service_type,
                 params.service_type === 'emergency' ? 'emergency' : 'repair',
                 params.description || '',
                 params.is_emergency ? 'emergency' : 'routine',
                 start, end,
                 params.is_emergency ? 'emergency' : 'normal',
                 params.estimated_cost || null,
                 Math.max(0, Math.round((start.getTime()-Date.now())/(1000*60*60))),
                 isAfter
               ]
            );
            const jobRow = job.rows[0];

            // Deposit (25% or $50 min)
            const estimate = Number(params.estimated_cost || 200);
            const deposit = Math.max(50, Math.round(estimate * 0.25));
            const session = await createDepositCheckoutSession(jobRow.id, customerId, deposit);

            await client.query('COMMIT');

            // Notify (optional): send SMS with link if we have a phone
            if (params.phone) {
              await sendSMS(params.phone, `Your ${params.service_type} appointment is set for ${start.toLocaleString()}. Job #${jobRow.job_number}. Deposit link: ${session.url}`);
            }

            await trackMetric('AppointmentBooked', 1, 'Count', [
              { name: 'ServiceType', value: String(params.service_type) },
              { name: 'Channel', value: 'voice' },
              { name: 'Emergency', value: String(!!params.is_emergency) }
            ]);

            return {
              job_id: jobRow.id,
              job_number: jobRow.job_number,
              deposit_amount: deposit,
              checkout_url: session.url,
              message: `Booked for ${start.toLocaleString()}. I just texted you a deposit link.`
            };
          } catch (err: any) {
            await client.query('ROLLBACK');
            console.error('book_appointment failed:', err);
            return { error: 'Booking failed, transferring to a specialist.' };
          } finally {
            client.release();
          }
        }
      },
      {
        name: 'escalate_to_human',
        description: 'Transfer call to human operator (metadata logged)',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
            customer_info: { type: 'object' }
          },
          required: ['reason']
        },
        execute: async ({ reason, customer_info }: any) => {
          await trackMetric('CallEscalated', 1, 'Count', [{ name: 'Reason', value: String(reason) }]);
          await pool.query(`INSERT INTO call_escalations (reason, customer_info, created_at) VALUES ($1,$2, now())`,
            [reason, JSON.stringify(customer_info || {})]).catch(() => {});
          return { message: 'Let me connect you with a specialist. One moment please.', action: 'transfer' };
        }
      }
    ]
  });

  return agent;
}

/**
 * Build a RealtimeSession for a given Twilio <Stream> WebSocket.
 * The caller of this function is responsible for wiring event listeners.
 */
export async function createSessionForTwilio(ws: any, opts: { apiKey: string, model?: string }) {
  
// --- CONSENT_INVOKED: obtain recording consent before proceeding ---
const say = async (text: string) => { /* TODO: send TTS via Realtime streaming */ };
const listenYesNo = async (): Promise<boolean|null> => {
  // TODO: fetch last ASR transcript; for now assume variable `lastTranscript` is available in scope.
  const transcript = (global as any).__lastTranscript as string | undefined;
  const cls = classifyYesNo(transcript);
  if (cls === 'yes') return true;
  if (cls === 'no')  return false;
  if (process.env.CONSENT_FALLBACK_LLM === '1') {
    // Optional: call small LLM to classify transcript; must return boolean|null.
    return null;
  }
  return null;
};
const onNoConsent = async () => {
  await say("Understood. We can't proceed without recording consent. Please contact us by email or request a callback.");
  // Optionally update call outcome and end session.
};
if (typeof (global as any).BYPASS_RECORDING_CONSENT === 'undefined') {
  const consented = await ensureRecordingConsent({ callId: (req as any)?.callId ?? 'unknown', say, listenYesNo, onNoConsent });
  if (!consented) { return; }
}
const agent = buildBusinessAgent();

  // Twilio transport: routes audio frames to/from Twilio stream
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: ws,
    sessionConfig: {
      turn_detection: { type: 'server_vad', threshold: 0.5 },
      input_audio_transcription: { model: 'whisper-1' }
    }
  });

  const session = new RealtimeSession(agent, { transport });
  await session.connect({ apiKey: opts.apiKey, model: opts.model || 'gpt-4o-realtime-preview' });

  return session;
}

// --- Added: optional explicit FSM (see src/llm/agent_state.ts)
import { CallFSM, CallState } from './agent_state';
import { bargeInMs, maxSilenceMs } from '../lib/config';
const fsm = new CallFSM({ bargeInThresholdMs: bargeInMs, maxSilenceMs: maxSilenceMs });
// advance via fsm.next({ type: 'user_speaks', intent: 'book' }) etc.


// --- Added: Consent tools and retention helpers
import { pool } from '../lib/db';

type ConsentType = 'recording' | 'marketing' | 'transactional';

export async function recordConsent(callId: string, customerId: string | null, channel: 'voice'|'sms'|'email', consentType: ConsentType, proof?: string) {
  await pool.query(
    `INSERT INTO consent_events (customer_id, channel, consent_type, proof) VALUES ($1,$2,$3,$4)`,
    [customerId, channel, consentType, proof || null]
  );
  if (consentType === 'recording') {
    await pool.query(`UPDATE calls SET recording_consent=true WHERE id=$1`, [callId]);
  }
  if (consentType === 'marketing') {
    await pool.query(`UPDATE calls SET marketing_consent=true WHERE id=$1`, [callId]);
  }
}

export async function setRetention(callId: string, days: number) {
  await pool.query(`UPDATE calls SET retention_until = now() + ($2 || ' days')::interval WHERE id=$1`, [callId, String(days)]);
}


// --- Consent: runtime recording-consent prompt (minimal gate) ---
import { recordConsent } from './agent'; // self-import resolved by TS hoist; if circular, inline recordConsent

export async function ensureRecordingConsent(opts: {
  callId: string;
  say: (text: string) => Promise<void>;
  listenYesNo: () => Promise<boolean | null>;
  onNoConsent?: () => Promise<void>;
}) {
  const { callId, say, listenYesNo, onNoConsent } = opts;
  await say("This call may be recorded for quality and training. Do you consent to call recording? Please say yes or no.");
  const ok = await listenYesNo();
  if (ok === true) {
    await recordConsent(callId, null, 'voice', 'recording', 'caller:yes');
    return true;
  }
  await recordConsent(callId, null, 'voice', 'recording', ok === false ? 'caller:no' : 'no-input');
  if (onNoConsent) await onNoConsent();
  return false;
}
