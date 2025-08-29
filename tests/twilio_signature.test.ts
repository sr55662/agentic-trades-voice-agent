import { describe, it, expect } from 'vitest';
import { isValidTwilioSignature } from '../src/lib/twilio';

describe('twilio signature', () => {
  it('returns false when missing token/signature', () => {
    const req: any = { headers: {}, body: {} };
    const ok = isValidTwilioSignature(req as any, 'https://example.com/incoming', '');
    expect(ok).toBe(false);
  });
});
