import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Ask Twilio to redirect the live call to our escalation TwiML endpoint.
 * You must provide PUBLIC_BASE_URL in env, and an operator number.
 */
export async function requestEscalation(callSid: string) {
  const base = process.env.PUBLIC_BASE_URL || '';
  const url = `${base}/voice/escalation-twiml`;
  await client.calls(callSid).update({ method: 'GET', url });
}

export function buildEscalationTwiml(operatorNumber: string) {
  const safe = operatorNumber || '';
  return `<Response><Say>Transferring you to a live operator now.</Say><Dial><Number>${safe}</Number></Dial></Response>`;
}
