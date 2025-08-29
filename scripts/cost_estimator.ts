/**
 * scripts/cost_estimator.ts
 * Quick CLI to estimate per-call cost under assumptions.
 * Example:
 *   ts-node scripts/cost_estimator.ts --minutes 6 --model realtime-small --tts premium --stt streaming --retry 0.05
 */

type Assumptions = {
  minutes: number;
  model: 'realtime-nano' | 'realtime-small' | 'realtime-med' | 'realtime-large';
  tts: 'standard' | 'premium';
  stt: 'batch' | 'streaming';
  retry: number; // 0..1
};

// Very rough reference rates; adjust to your vendor pricing
const MODEL_RATE_PER_MIN: Record<string, number> = {
  'realtime-nano': 0.04,
  'realtime-small': 0.06,
  'realtime-med': 0.09,
  'realtime-large': 0.15
};

const TTS_RATE_PER_MIN: Record<string, number> = {
  standard: 0.02,
  premium: 0.06
};

const STT_RATE_PER_MIN: Record<string, number> = {
  batch: 0.01,
  streaming: 0.03
};

function parseArgs(): Assumptions {
  const argv = process.argv.slice(2);
  const args: any = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    const v = argv[i + 1];
    args[k] = v;
  }
  return {
    minutes: Number(args.minutes ?? 6),
    model: (args.model ?? 'realtime-small') as Assumptions['model'],
    tts: (args.tts ?? 'premium') as Assumptions['tts'],
    stt: (args.stt ?? 'streaming') as Assumptions['stt'],
    retry: Number(args.retry ?? 0.05)
  };
}

function estimateUSD(a: Assumptions): number {
  const base = a.minutes * (
    (MODEL_RATE_PER_MIN[a.model] ?? 0.06) +
    (TTS_RATE_PER_MIN[a.tts] ?? 0.06) +
    (STT_RATE_PER_MIN[a.stt] ?? 0.03)
  );
  const retries = base * a.retry;
  // add telephony minute (e.g., Twilio) approximate if desired:
  const telephony = a.minutes * 0.015; // e.g., $0.015 per minute inbound
  return Number((base + retries + telephony).toFixed(2));
}

const a = parseArgs();
const est = estimateUSD(a);

console.log(JSON.stringify({
  est_cost_per_call_usd: est,
  assumptions: a
}, null, 2));