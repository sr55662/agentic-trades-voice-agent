/**
 * Minimal deterministic yes/no micro-intent classifier.
 */
export type YesNo = 'yes' | 'no' | 'unknown';

const YES = /\b(y(es)?|yeah|yep|affirmative|correct|sure|ok(ay)?|i do|please|go ahead)\b/i;
const NO  = /\b(n(o)?|nope|negative|don'?t|do not|nah|stop|decline|not now)\b/i;

export function classifyYesNo(text: string | null | undefined): YesNo {
  if (!text) return 'unknown';
  const t = text.trim();
  if (!t) return 'unknown';
  if (YES.test(t)) return 'yes';
  if (NO.test(t))  return 'no';
  return 'unknown';
}
