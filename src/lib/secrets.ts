/**
 * src/lib/secrets.ts
 * Retrieve secrets from AWS Secrets Manager with env fallback.
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function getSecretOrEnv(name: string, envKey: string): Promise<string> {
  const envVal = process.env[envKey];
  if (envVal) return envVal;
  try {
    const out = await client.send(new GetSecretValueCommand({ SecretId: name }));
    if (out.SecretString) return out.SecretString;
    if (out.SecretBinary) return Buffer.from(out.SecretBinary as any).toString('utf8');
  } catch (e) {
    // fallback to empty string; caller decides
  }
  return '';
}
