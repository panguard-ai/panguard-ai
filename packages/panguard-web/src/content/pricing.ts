/**
 * Pricing plans content (community edition — all free)
 * 定價方案內容（社群版 — 完全免費）
 */

import type { PricingPlanDetails, PricingPlan, PersonaType } from '../types.js';

export const PRICING_PLANS: PricingPlanDetails[] = [
  {
    plan: 'community',
    nameEn: 'Community',
    nameZh: '社群版',
    taglineEn: 'Free forever. No credit card required.',
    taglineZh: '永久免費。不需信用卡。',
    priceUsd: 0,
    priceDisplayEn: 'Free',
    priceDisplayZh: '免費',
    features: [
      { nameEn: 'Panguard Scan', nameZh: 'Panguard Scan', included: true },
      { nameEn: 'Panguard Guard', nameZh: 'Panguard Guard', included: true },
      { nameEn: 'Panguard Chat', nameZh: 'Panguard Chat', included: true },
      { nameEn: 'Panguard Trap', nameZh: 'Panguard Trap', included: true },
      { nameEn: 'Panguard Report', nameZh: 'Panguard Report', included: true },
      { nameEn: 'Open Source', nameZh: '開放原始碼', included: true },
    ],
    targetPersona: 'developer',
    highlighted: true,
  },
];

export function getAllPricingPlans(): PricingPlanDetails[] {
  return PRICING_PLANS;
}

export function getPricingPlan(plan: PricingPlan): PricingPlanDetails | undefined {
  return PRICING_PLANS.find((p) => p.plan === plan);
}

export function getRecommendedPlan(
  personaType: PersonaType
): { plan: PricingPlan; details: PricingPlanDetails } | undefined {
  const match = PRICING_PLANS.find((p) => p.targetPersona === personaType);
  if (!match) return undefined;
  return { plan: match.plan, details: match };
}
