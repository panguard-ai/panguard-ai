/**
 * atr_threat_summary MCP tool - Aggregate threat statistics
 * @module agent-threat-rules/mcp-tools/threat-summary
 */

import type { ATREngine } from '../engine.js';

export function handleThreatSummary(engine: ATREngine, args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
} {
  const category = args['category'] as string | undefined;
  const rules = [...engine.getRules()];

  const filtered = category
    ? rules.filter((r) => r.tags.category === category)
    : rules;

  // Aggregate by category
  const byCategory: Record<string, number> = {};
  for (const rule of filtered) {
    const cat = rule.tags.category;
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  // Aggregate by severity
  const bySeverity: Record<string, number> = {};
  for (const rule of filtered) {
    bySeverity[rule.severity] = (bySeverity[rule.severity] ?? 0) + 1;
  }

  // Aggregate by status
  const byStatus: Record<string, number> = {};
  for (const rule of filtered) {
    byStatus[rule.status] = (byStatus[rule.status] ?? 0) + 1;
  }

  // Aggregate by source type
  const bySourceType: Record<string, number> = {};
  for (const rule of filtered) {
    const src = rule.agent_source.type;
    bySourceType[src] = (bySourceType[src] ?? 0) + 1;
  }

  // Count test cases
  let totalTestCases = 0;
  let rulesWithTests = 0;
  for (const rule of filtered) {
    if (rule.test_cases) {
      rulesWithTests++;
      totalTestCases +=
        (rule.test_cases.true_positives?.length ?? 0) +
        (rule.test_cases.true_negatives?.length ?? 0);
    }
  }

  // Top actions
  const actionCounts: Record<string, number> = {};
  for (const rule of filtered) {
    for (const action of rule.response.actions) {
      actionCounts[action] = (actionCounts[action] ?? 0) + 1;
    }
  }

  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  const result = {
    summary_timestamp: new Date().toISOString(),
    ...(category ? { filtered_category: category } : {}),
    total_rules: filtered.length,
    by_category: byCategory,
    by_severity: bySeverity,
    by_status: byStatus,
    by_source_type: bySourceType,
    test_coverage: {
      rules_with_tests: rulesWithTests,
      rules_without_tests: filtered.length - rulesWithTests,
      total_test_cases: totalTestCases,
    },
    top_response_actions: topActions,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
