/* AI Quota Manager — community edition (no limits) */

export interface QuotaTier {
  name: string;
  hourlyLimit: number;
  monthlyBudgetUsd: number;
  byok: boolean;
}

export interface QuotaConfig {
  tier: QuotaTier;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

export interface QuotaUsage {
  hourlyUsed: number;
  monthlySpentUsd: number;
}

export class AIQuotaManager {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_tier?: QuotaTier | string, _override?: Partial<QuotaConfig>) {
    /* community edition — no quota enforcement */
  }

  check(): QuotaCheckResult {
    return { allowed: true };
  }

  checkQuota(): QuotaCheckResult {
    return { allowed: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordCall(_cost?: number): void {
    /* no-op in community edition */
  }

  recordUsage(): void {
    /* no-op in community edition */
  }

  getUsage(): QuotaUsage {
    return { hourlyUsed: 0, monthlySpentUsd: 0 };
  }
}
