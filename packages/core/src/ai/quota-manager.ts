/* AI Quota Manager — community edition */

export type QuotaTier = 'free' | 'pro' | 'enterprise';

export interface QuotaConfig {
  tier: QuotaTier;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

export interface QuotaUsage {
  tier: string;
  hourlyUsed: number;
  monthlySpentUsd: number;
}

export class AIQuotaManager {
  private readonly tierName: string;
  private readonly isFree: boolean;

  constructor(tier?: QuotaTier | string, _override?: Partial<QuotaConfig>) {
    this.tierName = typeof tier === 'string' ? tier : (tier ?? 'free');
    this.isFree = this.tierName === 'free';
  }

  check(): QuotaCheckResult {
    if (this.isFree) {
      return { allowed: false, reason: 'Free tier: AI analysis not included' };
    }
    return { allowed: true };
  }

  checkQuota(): QuotaCheckResult {
    return this.check();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordCall(_cost?: number): void {
    /* no-op in community edition */
  }

  recordUsage(): void {
    /* no-op in community edition */
  }

  getUsage(): QuotaUsage {
    return { tier: this.tierName, hourlyUsed: 0, monthlySpentUsd: 0 };
  }
}
