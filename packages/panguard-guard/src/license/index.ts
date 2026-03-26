/* License — community edition (all features enabled, no key required) */

export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface LicenseInfo {
  key: string;
  tier: LicenseTier;
  isValid: boolean;
  expiresAt?: string;
  maxEndpoints?: number;
  features: string[];
}

const COMMUNITY_FEATURES = [
  'basic_monitoring',
  'rule_matching',
  'auto_respond',
  'threat_cloud_upload',
  'dashboard',
  'ai_analysis',
];

const TIER_FEATURES: Record<LicenseTier, string[]> = {
  free: COMMUNITY_FEATURES,
  pro: COMMUNITY_FEATURES,
  enterprise: COMMUNITY_FEATURES,
};

export function validateLicense(_key?: string): LicenseInfo {
  return {
    key: _key ?? '',
    tier: 'free',
    isValid: true,
    maxEndpoints: 1,
    features: COMMUNITY_FEATURES,
  };
}

export function hasFeature(license: LicenseInfo | string, feature?: string): boolean {
  if (typeof license === 'string') {
    // legacy: hasFeature(featureString, optionalKey)
    return COMMUNITY_FEATURES.includes(license);
  }
  return COMMUNITY_FEATURES.includes(feature ?? '');
}

export function getTierFeatures(tier: LicenseTier): string[] {
  return TIER_FEATURES[tier] ?? COMMUNITY_FEATURES;
}

export function generateTestLicenseKey(_tier?: LicenseTier): string {
  return 'PG-FREE-TEST-0000-0000';
}
