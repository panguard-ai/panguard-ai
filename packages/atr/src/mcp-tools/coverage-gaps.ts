/**
 * atr_coverage_gaps MCP tool - Analyze coverage gaps against security frameworks
 * @module agent-threat-rules/mcp-tools/coverage-gaps
 */

import { CoverageAnalyzer } from '../coverage-analyzer.js';
import type { CoverageReport } from '../coverage-analyzer.js';
import type { ATREngine } from '../engine.js';

export function handleCoverageGaps(engine: ATREngine, args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const framework = ((args['framework'] as string) ?? 'all').toLowerCase();

  const validFrameworks = ['owasp_agentic', 'mitre_atlas', 'all'];
  if (!validFrameworks.includes(framework)) {
    return {
      content: [{ type: 'text', text: `Error: "framework" must be one of: ${validFrameworks.join(', ')}` }],
      isError: true,
    };
  }

  const analyzer = new CoverageAnalyzer(engine.getRules());
  const report: CoverageReport = analyzer.analyze();

  // Filter gaps by requested framework
  const filteredGaps = framework === 'all'
    ? report.gaps
    : report.gaps.filter((g) => {
        if (framework === 'owasp_agentic') return g.framework === 'OWASP Agentic Top 10';
        if (framework === 'mitre_atlas') return g.framework === 'MITRE ATLAS';
        return true;
      });

  const filteredSuggestions = framework === 'all'
    ? report.suggestions
    : report.suggestions.filter((s) => {
        if (framework === 'owasp_agentic') return s.includes('OWASP') || s.includes('ASI');
        if (framework === 'mitre_atlas') return s.includes('MITRE') || s.includes('AML');
        return true;
      });

  const result = {
    analysis_timestamp: new Date().toISOString(),
    total_rules_loaded: engine.getRuleCount(),
    total_active_rules: report.totalRules,
    framework_filter: framework,
    gaps: filteredGaps.map((g) => ({
      framework: g.framework,
      risk_id: g.riskId,
      risk_name: g.riskName,
      current_rule_count: g.currentRuleCount,
      recommended_min: g.recommendedMin,
    })),
    category_distribution: report.categoryDistribution,
    suggestions: filteredSuggestions,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
