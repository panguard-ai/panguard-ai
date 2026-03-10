/**
 * atr_scan MCP tool - Scan content for agent threats
 * @module agent-threat-rules/mcp-tools/scan
 */

import type { ATREngine } from '../engine.js';
import type { AgentEvent, AgentEventType, ATRSeverity } from '../types.js';

export interface ScanInput {
  content: string;
  event_type?: string;
  min_severity?: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  informational: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'llm_input',
  'llm_output',
  'tool_call',
  'tool_response',
  'agent_behavior',
  'multi_agent_message',
]);

export function handleScan(engine: ATREngine, args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const content = args['content'];
  if (typeof content !== 'string' || content.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: "content" is required and must be a non-empty string.' }],
      isError: true,
    };
  }

  const eventTypeRaw = (args['event_type'] as string) ?? 'llm_input';
  if (!VALID_EVENT_TYPES.has(eventTypeRaw)) {
    return {
      content: [{ type: 'text', text: `Error: Invalid event_type "${eventTypeRaw}". Valid types: ${[...VALID_EVENT_TYPES].join(', ')}` }],
      isError: true,
    };
  }

  const minSeverity = ((args['min_severity'] as string) ?? 'informational').toLowerCase();
  if (!(minSeverity in SEVERITY_ORDER)) {
    return {
      content: [{ type: 'text', text: `Error: Invalid min_severity "${minSeverity}". Valid: informational, low, medium, high, critical` }],
      isError: true,
    };
  }

  const minIdx = SEVERITY_ORDER[minSeverity] ?? 0;

  const event: AgentEvent = {
    type: eventTypeRaw as AgentEventType,
    timestamp: new Date().toISOString(),
    content: content,
    fields: {
      user_input: content,
      agent_output: content,
      tool_response: content,
      content: content,
    },
  };

  const matches = engine.evaluate(event);
  const filtered = matches.filter(
    (m) => (SEVERITY_ORDER[m.rule.severity] ?? 0) >= minIdx
  );

  const result = {
    threats_found: filtered.length,
    scan_timestamp: event.timestamp,
    event_type: eventTypeRaw,
    matches: filtered.map((m) => ({
      rule_id: m.rule.id,
      title: m.rule.title,
      severity: m.rule.severity,
      category: m.rule.tags.category,
      confidence: Math.round(m.confidence * 100),
      description: m.rule.description,
      matched_patterns: m.matchedPatterns,
      recommended_actions: m.rule.response.actions,
    })),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
