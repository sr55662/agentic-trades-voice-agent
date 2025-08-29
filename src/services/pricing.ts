/**
 * Agentic Trades Voice Agent — documented source
 * This file is part of the production-ready Fastify + OpenAI Realtime stack.
 */

const config = {
  hvac: {
    diagnostic: { min: 150, max: 250, avg: 200 },
    repair: { min: 300, max: 800, avg: 550 },
    maintenance: { min: 120, max: 180, avg: 150 },
    emergency: { multiplier: 1.5 }
  },
  emergencyKeywords: ['gas leak','smoke','carbon monoxide','no heat','no cooling']
};

export class PricingEngine {
  static calculateQuote(serviceType: string, description: string, isAfterHours: boolean) {
    const base = (config as any).hvac[serviceType] || (config as any).hvac.diagnostic;
    let estimate = base.avg;
    const desc = (description || '').toLowerCase();
    const hasEmergency = config.emergencyKeywords.some(kw => desc.includes(kw));

    if (hasEmergency || isAfterHours) estimate *= (config.hvac.emergency.multiplier);

    if (desc.includes('multiple') || desc.includes('system')) estimate *= 1.2;

    return {
      service_call: Math.round(estimate * 0.3),
      estimated_repair: Math.round(estimate),
      range: `$${Math.round(base.min)}-$${Math.round(base.max)}`,
      total_estimate: Math.round(estimate),
      emergency_fee: (hasEmergency || isAfterHours) ? Math.round(estimate * 0.3) : 0
    };
  }
}