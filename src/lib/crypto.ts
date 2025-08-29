/**
 * src/lib/crypto.ts
 * AES-256-GCM encryption for PII at application layer.
 * Provide PII_KEY (32-byte base64) via Secrets Manager or env.
 */
import crypto from 'crypto';

function getKey(): Buffer {
  const b64 = process.env.PII_KEY || '';
  if (!b64) throw new Error('PII_KEY not set');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== 32) throw new Error('PII_KEY must be 32 bytes base64');
  return buf;
}

export function encryptPII(plain: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptPII(b64: string): string {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct  = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{2})/g, '•');
}
