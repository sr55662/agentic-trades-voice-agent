# Patch Notes (Manual Apply)

This bundle contains **only new files**. Add them to your repo in the paths shown.

Then make these small manual edits in your existing files:

1) **package.json**
   - Add script: `"purge:holds": "node scripts/purge_holds.ts"`
   - (If missing) add dependency: `"@fastify/websocket": "^8"`

2) **.env.example**
   - Add:
     OPERATOR_PHONE=+15551234567
     DEFAULT_LANGUAGE=en

3) **src/index.ts**
   - Add: `import smsRoutes from './routes/sms';`
   - Register: `app.register(smsRoutes,{ prefix:'/sms' });`

4) **src/routes/voice.ts**
   - Add imports:
     `import { buildEscalationTwiml, requestEscalation } from '../services/hitl';`
   - Add endpoints:
     POST `/voice/escalate` -> call `requestEscalation(callSid)`
     GET  `/voice/escalation-twiml` -> `buildEscalationTwiml(process.env.OPERATOR_PHONE!)`

5) **src/services/notify.ts**
   - Before sending SMS, insert an audit row into `sms_messages` (direction='outbound').
   - For marketing messages, verify `calls.marketing_consent = true` when `callId` provided.

6) **src/services/scheduling.ts**
   - Ensure `holdSlot/commitHold/releaseHold` use `booking_holds` with TTL and delete on commit/release.

7) **src/llm/agent_state.ts**
   - Ensure `ensureRecordingConsent(ctx)` prompts for recording consent; if denied/unclear, trigger escalation.

8) **Terraform**
   - Add `infra/monitoring.tf` to your Terraform and set `alarm_topic_arn` (SNS). `terraform apply`.

9) **DB Migrations**
   - Run new migrations: `migrations/008_multilingual.sql`, `migrations/009_sms.sql`

## Commands
npm run build
npm run migrate
npm run purge:holds
