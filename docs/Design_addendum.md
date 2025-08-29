# Design Addendum: Explicit FSM, Consent Logging, and Cost Controls

## Call State Machine
We introduce `src/llm/agent_state.ts` with explicit states:
`Greeting -> Qualify -> Quote -> Book -> Payment -> Confirm -> End` (+ `Escalate` on errors)
- Barge-in threshold and max-silence are configurable.
- Each tool call returns an event to advance the FSM.

## Consent/TCPA
- **Recording consent (voice):** Agent prompts at call start; denial ends call or routes to non-recorded alt; stored to `consent_events`.
- **Marketing consent (SMS/email):** Checked and recorded before promotional outreach; blocked if not granted.
- Store explicit consent in `consent_events` with proof (Call SID/SMS SID).
- On webhook connect, prompt for recording consent if required; set `calls.recording_consent`.
- Before marketing SMS, require `marketing_consent=true`.

## Cost Controls
- Env switches (suggested keys):
  - `MODEL_TIER=realtime-small|realtime-nano|...`
  - `STT_MODE=streaming|batch`
  - `TTS_TIER=premium|standard`
- Use `scripts/cost_estimator.ts` to model $/call and document trade-offs.

## PCI Scope
**Posture:** This application is intentionally designed to avoid PCI DSS scope wherever possible.
- All card entry uses **Stripe Checkout** (or Elements) hosted by Stripe.
- The application stores only Stripe Customer IDs and PaymentMethod IDs; **no PAN or sensitive auth data** is stored or transmitted by the app.
- Refunds/disputes handled via Stripe webhooks and back-office actions; see runbook for reconciliation steps.


1. **Card capture:** All card entry uses **Stripe Checkout** (or Elements) hosted by Stripe. We never render inputs that accept PAN, CVV, or expiry.
2. **Data at rest:** We store **only** opaque identifiers (Stripe `customer`, `payment_method`, `checkout.session` IDs). No PAN/CVV/track data is ever stored.
3. **Data in transit:** Card data flows directly from client to Stripe; server exchanges tokens/IDs only.
4. **Lifecycle events:** Refunds & disputes handled via Stripe webhooks (`charge.refunded`, `charge.dispute.created/closed`), see `src/routes/payments.ts`.
5. **Secrets:** Stripe keys live in AWS Secrets Manager; IAM-scoped, KMS-protected.
6. **Audit:** Payment actions are logged (no card data); booking/AR states updated for reconciliation.
