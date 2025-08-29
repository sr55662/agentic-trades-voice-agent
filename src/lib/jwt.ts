/**
 * JWT helpers for mobile app auth
 */
import jwt from 'jsonwebtoken';
import { env } from './config';

export function signJWT(payload: object, ttlSeconds = 60 * 60 * 24 * 30) { // 30 days
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ttlSeconds });
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}
