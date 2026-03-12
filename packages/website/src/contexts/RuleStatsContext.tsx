'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRuleStats } from '@/hooks/useRuleStats';

interface RuleStatsValues {
  [key: string]: string | number;
  atrRules: number;
  sigmaRules: string;
  yaraRules: string;
  totalRules: string;
  totalRulesDisplay: string;
}

const RuleStatsContext = createContext<RuleStatsValues>({
  atrRules: 49,
  sigmaRules: '3,700',
  yaraRules: '4,300',
  totalRules: '8,000',
  totalRulesDisplay: '8,000+',
});

export function RuleStatsProvider({ children }: { children: ReactNode }) {
  const stats = useRuleStats();

  const values: RuleStatsValues = {
    atrRules: stats.atrRules,
    sigmaRules: stats.sigmaRules.toLocaleString(),
    yaraRules: stats.yaraRules.toLocaleString(),
    totalRules: (stats.sigmaRules + stats.yaraRules).toLocaleString(),
    totalRulesDisplay: '8,000+',
  };

  return <RuleStatsContext.Provider value={values}>{children}</RuleStatsContext.Provider>;
}

export function useRuleStatsContext() {
  return useContext(RuleStatsContext);
}
