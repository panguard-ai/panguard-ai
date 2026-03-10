/**
 * atr_list_rules MCP tool - List and filter ATR rules
 * @module agent-threat-rules/mcp-tools/list-rules
 */

import type { ATREngine } from '../engine.js';

export interface ListRulesInput {
  category?: string;
  severity?: string;
  search?: string;
}

export function handleListRules(engine: ATREngine, args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
} {
  const category = args['category'] as string | undefined;
  const severity = args['severity'] as string | undefined;
  const search = args['search'] as string | undefined;

  let rules = [...engine.getRules()];

  if (category) {
    rules = rules.filter((r) => r.tags.category === category);
  }

  if (severity) {
    rules = rules.filter((r) => r.severity === severity.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    rules = rules.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        r.tags.category.toLowerCase().includes(term)
    );
  }

  const result = {
    total: rules.length,
    filters_applied: {
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
      ...(search ? { search } : {}),
    },
    rules: rules.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      category: r.tags.category,
      source_type: r.agent_source.type,
      description: r.description,
      actions: r.response.actions,
    })),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
