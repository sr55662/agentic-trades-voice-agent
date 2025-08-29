import { describe, it, expect, beforeAll } from 'vitest';
import { encryptPII, decryptPII } from '../src/lib/crypto';

beforeAll(() => {
  // 32-byte key
  process.env.PII_KEY = Buffer.alloc(32, 5).toString('base64');
});

describe('crypto PII roundtrip', () => {
  it('encrypts and decrypts', () => {
    const msg = '555-867-5309';
    const enc = encryptPII(msg);
    expect(enc).not.toBe(msg);
    const dec = decryptPII(enc);
    expect(dec).toBe(msg);
  });
});
