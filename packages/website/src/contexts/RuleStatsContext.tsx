'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRuleStats } from '@/hooks/useRuleStats';
import { STATS } from '@/lib/stats';

interface RuleStatsValues {
  [key: string]: string | number;
  atrRules: number;
  sigmaRules: string;
  yaraRules: string;
  totalRules: string;
  totalRulesDisplay: string;
}

const RuleStatsContext = createContext<RuleStatsValues>({
  atrRules: STATS.atrRules,
  sigmaRules: STATS.sigmaRules.toLocaleString(),
  yaraRules: STATS.yaraRules.toLocaleString(),
  totalRules: STATS.totalRules.toLocaleString(),
  totalRulesDisplay: STATS.totalRulesDisplay,
});

export function RuleStatsProvider({ children }: { children: ReactNode }) {
  const stats = useRuleStats();

  const total = stats.sigmaRules + stats.yaraRules + stats.atrRules;
  const values: RuleStatsValues = {
    atrRules: stats.atrRules,
    sigmaRules: stats.sigmaRules.toLocaleString(),
    yaraRules: stats.yaraRules.toLocaleString(),
    totalRules: total.toLocaleString(),
    totalRulesDisplay: `${Math.floor(total / 100) * 100}+`,
  };

  return <RuleStatsContext.Provider value={values}>{children}</RuleStatsContext.Provider>;
}

export function useRuleStatsContext() {
  return useContext(RuleStatsContext);
}
