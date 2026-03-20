'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRuleStats } from '@/hooks/useRuleStats';
import { STATS } from '@/lib/stats';

interface RuleStatsValues {
  [key: string]: string | number;
  atrRules: number;
  atrPatterns: number;
  totalRules: string;
  totalRulesDisplay: string;
}

const RuleStatsContext = createContext<RuleStatsValues>({
  atrRules: STATS.atrRules,
  atrPatterns: STATS.atrPatterns,
  totalRules: STATS.totalRules.toLocaleString(),
  totalRulesDisplay: STATS.totalRulesDisplay,
});

export function RuleStatsProvider({ children }: { children: ReactNode }) {
  const stats = useRuleStats();

  const values: RuleStatsValues = {
    atrRules: stats.atrRules,
    atrPatterns: stats.atrPatterns,
    totalRules: stats.totalRules.toLocaleString(),
    totalRulesDisplay: STATS.totalRulesDisplay,
  };

  return <RuleStatsContext.Provider value={values}>{children}</RuleStatsContext.Provider>;
}

export function useRuleStatsContext() {
  return useContext(RuleStatsContext);
}
