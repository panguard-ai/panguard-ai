/* License — community edition (all features enabled, no key required) */

export type LicenseTier = 'free';

export interface LicenseInfo {
  tier: LicenseTier;
  valid: boolean;
  maxEndpoints: number;
  features: string[];
}

const COMMUNITY_FEATURES = [
  'basic_monitoring',
  'rule_matching',
  'auto_respond',
  'threat_cloud_upload',
  'dashboard',
];

export function validateLicense(_key?: string): LicenseInfo {
  return {
    tier: 'free',
    valid: true,
    maxEndpoints: 1,
    features: COMMUNITY_FEATURES,
  };
}

export function hasFeature(_feature: string, _key?: string): boolean {
  return COMMUNITY_FEATURES.includes(_feature);
}

export function generateTestLicenseKey(): string {
  return 'PG-FREE-TEST-0000-0000';
}
