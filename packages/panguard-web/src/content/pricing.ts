/**
 * Pricing plan definitions
 * 定價方案定義
 *
 * @module @openclaw/panguard-web/content/pricing
 */

import type { PricingPlanDetails, PricingPlan, PlanFeature } from '../types.js';

// ---------------------------------------------------------------------------
// Shared features
// 共享功能
// ---------------------------------------------------------------------------

function feature(nameEn: string, nameZh: string, included: boolean, limit?: string): PlanFeature {
  return { nameEn, nameZh, included, limit };
}

// ---------------------------------------------------------------------------
// Plan definitions
// 方案定義
// ---------------------------------------------------------------------------

export const PRICING_PLANS: PricingPlanDetails[] = [
  {
    plan: 'free',
    nameEn: 'Free',
    nameZh: '免費版',
    taglineEn: '60-second security health check',
    taglineZh: '60 秒資安健檢',
    priceUsd: 0,
    priceDisplayEn: 'Free',
    priceDisplayZh: '免費',
    targetPersona: 'developer',
    highlighted: false,
    features: [
      feature('Panguard Scan (60-sec scan)', 'Panguard Scan（60 秒掃描）', true),
      feature('PDF security report', 'PDF 資安報告', true),
      feature('Basic risk scoring', '基礎風險評分', true),
      feature('Remediation suggestions', '修復建議', true),
      feature('Real-time monitoring', '即時監控', false),
      feature('AI threat detection', 'AI 威脅偵測', false),
      feature('Chat notifications', '聊天通知', false),
      feature('Compliance reports', '合規報告', false),
      feature('Honeypot (Panguard Trap)', '蜜罐（Panguard Trap）', false),
    ],
  },
  {
    plan: 'starter',
    nameEn: 'Starter',
    nameZh: '入門版',
    taglineEn: 'For developers who ship fast',
    taglineZh: '給快速出貨的開發者',
    priceUsd: 9,
    priceDisplayEn: '$9/mo',
    priceDisplayZh: 'US$9/月',
    targetPersona: 'developer',
    highlighted: false,
    features: [
      feature('Panguard Scan (unlimited)', 'Panguard Scan（無限制）', true),
      feature('Panguard Guard (1 endpoint)', 'Panguard Guard（1 台端點）', true, '1 endpoint'),
      feature('LINE / Telegram notifications', 'LINE / Telegram 通知', true),
      feature('Daily security summary', '每日資安摘要', true),
      feature('Auto-block malicious IPs', '自動封鎖惡意 IP', true),
      feature('7-day learning period', '7 天學習期', true),
      feature('Compliance reports', '合規報告', false),
      feature('Honeypot (Panguard Trap)', '蜜罐（Panguard Trap）', false),
      feature('Multi-endpoint management', '多端點管理', false),
    ],
  },
  {
    plan: 'pro',
    nameEn: 'Pro',
    nameZh: '專業版',
    taglineEn: 'Protect your entire business',
    taglineZh: '保護你的整個企業',
    priceUsd: 29,
    priceDisplayEn: '$29/mo per endpoint',
    priceDisplayZh: 'US$29/月/端點',
    targetPersona: 'small_business',
    highlighted: true,
    features: [
      feature('Everything in Starter', '入門版所有功能', true),
      feature('Panguard Guard (up to 50 endpoints)', 'Panguard Guard（最多 50 台端點）', true, '50 endpoints'),
      feature('Slack / Email notifications', 'Slack / Email 通知', true),
      feature('AI auto-response', 'AI 自動回應', true),
      feature('Panguard Trap (basic honeypot)', 'Panguard Trap（基礎蜜罐）', true),
      feature('Weekly reports', '週報', true),
      feature('Compliance reports', '合規報告', false),
      feature('mTLS encrypted channels', 'mTLS 加密管道', false),
      feature('Custom Sigma rules', '自訂 Sigma 規則', false),
    ],
  },
  {
    plan: 'business',
    nameEn: 'Business',
    nameZh: '企業版',
    taglineEn: 'Compliance-ready, audit-proof',
    taglineZh: '合規就緒，稽核免煩惱',
    priceUsd: 59,
    priceDisplayEn: '$59/mo per endpoint',
    priceDisplayZh: 'US$59/月/端點',
    targetPersona: 'mid_enterprise',
    highlighted: false,
    features: [
      feature('Everything in Pro', '專業版所有功能', true),
      feature('Panguard Guard (up to 1000 endpoints)', 'Panguard Guard（最多 1000 台端點）', true, '1000 endpoints'),
      feature('Panguard Report (3 frameworks)', 'Panguard Report（3 大框架）', true),
      feature('mTLS / Webhook channels', 'mTLS / Webhook 加密管道', true),
      feature('Custom Sigma/YARA rules', '自訂 Sigma/YARA 規則', true),
      feature('SIEM integration', 'SIEM 整合', true),
      feature('Panguard Trap (advanced honeypot)', 'Panguard Trap（進階蜜罐）', true),
      feature('Priority support', '優先技術支援', true),
      feature('On-premise deployment option', '地端部署選項', true),
    ],
  },
];

/**
 * Get pricing plan by type
 * 根據類型取得方案
 */
export function getPricingPlan(plan: PricingPlan): PricingPlanDetails | undefined {
  return PRICING_PLANS.find((p) => p.plan === plan);
}

/**
 * Get all pricing plans
 * 取得所有方案
 */
export function getAllPricingPlans(): PricingPlanDetails[] {
  return PRICING_PLANS;
}

/**
 * Get recommended plan for a persona
 * 根據角色取得推薦方案
 */
export function getRecommendedPlan(persona: string): PricingPlanDetails | undefined {
  return PRICING_PLANS.find((p) => p.targetPersona === persona && p.highlighted)
    ?? PRICING_PLANS.find((p) => p.targetPersona === persona);
}
