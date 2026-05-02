/**
 * Pick `agent_source.type` from ATR's 10-type enum.
 *
 * D1: hardcoded default `llm_io` + warning. D2 adds real heuristics.
 * Sigma's logsource is host-OS-centric — there's no clean mapping to ATR's
 * agent-context types. Honest default + needs-review marker is the W1 stance.
 */

const ATR_AGENT_SOURCE_TYPES = [
  'llm_io',
  'tool_call',
  'mcp_exchange',
  'agent_behavior',
  'multi_agent_comm',
  'context_window',
  'memory_access',
  'skill_lifecycle',
  'skill_permission',
  'skill_chain',
] as const;

export type AtrAgentSourceType = (typeof ATR_AGENT_SOURCE_TYPES)[number];

export function classifyAgentSource(): {
  type: AtrAgentSourceType;
  needsReview: boolean;
} {
  return { type: 'llm_io', needsReview: true };
}
