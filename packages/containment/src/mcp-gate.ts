/**
 * MCP chokepoint adapter — lets an MCP proxy run an attempted tool call through
 * the inline gate (Layer 1) BEFORE forwarding it upstream. Synchronous and
 * sub-ms: this is the hot path. The proxy's existing async evaluator becomes
 * the Layer 2 brain (fed via guard.onSessionActivity, off this path).
 *
 * @module @panguard-ai/panguard-guard/containment/mcp-gate
 */
import type { GuardGate } from './guard-gate.js';
import type { ActionContext } from './types.js';

export interface McpToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly sessionId: string;
  readonly agentId: string;
  /** Tools this agent is allowed to call (Layer 0 scope). */
  readonly capabilities: ReadonlySet<string>;
}

export interface McpGateVerdict {
  readonly allow: boolean;
  /** Set when blocked — a clean, actionable reason for the agent. */
  readonly reason?: string;
  /** True when the session was escalated to containment. */
  readonly escalated: boolean;
}

/** Build an ActionContext from an MCP tool call. */
export function mcpToolCallToAction(call: McpToolCall): ActionContext {
  return {
    agentId: call.agentId,
    sessionId: call.sessionId,
    kind: 'tool_call',
    target: call.name,
    payload: safeStringify(call.args),
    capabilities: call.capabilities,
  };
}

/**
 * Run a tool call through the inline gate. Synchronous and sub-ms — call in the
 * MCP proxy's CallTool handler BEFORE forwarding upstream. ESCALATE is treated
 * as a block at the gate; the async brain handles the session out of band.
 */
export function applyMcpGate(guard: GuardGate, call: McpToolCall): McpGateVerdict {
  const ctx = mcpToolCallToAction(call);
  const decision = guard.onAction(ctx);
  if (decision === 'ALLOW') return { allow: true, escalated: false };
  if (decision === 'ESCALATE') {
    return { allow: false, reason: 'Session is under elevated containment.', escalated: true };
  }
  return { allow: false, reason: guard.denyMessage(ctx), escalated: false };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}
