/**
 * response-engine.ts - Policy application and polling extracted from GuardEngine
 *
 * Contains:
 * - applyPolicy() - dispatch policy rules to appropriate agents
 * - pollPolicy() - poll the Manager for policy updates
 *
 * @module @panguard-ai/panguard-guard/response-engine
 */

import { createLogger } from '@panguard-ai/core';
import type { ActionPolicy } from './types.js';
import type { RespondAgent } from './agent/index.js';
import type { PanguardAgentClient } from './agent-client/index.js';

const logger = createLogger('panguard-guard:response-engine');

/** A single policy rule received from the Manager */
export interface PolicyRule {
  readonly type: string;
  readonly condition: Record<string, unknown>;
  readonly action: string;
  readonly description: string;
}

/** A policy update containing an array of rules */
export interface PolicyUpdate {
  readonly rules: ReadonlyArray<PolicyRule>;
}

/**
 * Apply a policy update by iterating over its rules and dispatching
 * each to the appropriate agent method.
 *
 * Supported rule types:
 * - block_ip: calls respondAgent.addBlockedIP(condition.ip)
 * - alert_threshold: calls respondAgent.updateActionPolicy({ autoRespond, notifyAndWait })
 * - auto_respond: calls respondAgent.updateActionPolicy({ autoRespond: 90 | 100 })
 * Other rule types are silently ignored.
 */
export function applyPolicy(policy: PolicyUpdate, respondAgent: RespondAgent): void {
  for (const rule of policy.rules) {
    switch (rule.type) {
      case 'block_ip': {
        const ip = rule.condition['ip'] as string | undefined;
        if (ip) {
          void respondAgent.addBlockedIP(ip);
        }
        break;
      }
      case 'alert_threshold': {
        const updates: Partial<ActionPolicy> = {};
        if (typeof rule.condition['autoRespond'] === 'number') {
          updates.autoRespond = rule.condition['autoRespond'] as number;
        }
        if (typeof rule.condition['notifyAndWait'] === 'number') {
          updates.notifyAndWait = rule.condition['notifyAndWait'] as number;
        }
        if (Object.keys(updates).length > 0) {
          respondAgent.updateActionPolicy(updates);
        }
        break;
      }
      case 'auto_respond': {
        const enabled = rule.condition['enabled'] as boolean | undefined;
        if (enabled === true) {
          respondAgent.updateActionPolicy({ autoRespond: 90 });
        } else if (enabled === false) {
          respondAgent.updateActionPolicy({ autoRespond: 100 });
        }
        break;
      }
      default:
        // Unknown rule type: silently ignore
        break;
    }
  }
}

/**
 * Poll the Manager for a policy update.
 * Does nothing if the agent client is not registered or null.
 */
export async function pollPolicy(agentClient: PanguardAgentClient | null): Promise<void> {
  if (!agentClient) return;
  try {
    if (
      typeof (agentClient as unknown as { pollPolicy?: () => Promise<void> }).pollPolicy ===
      'function'
    ) {
      await (agentClient as unknown as { pollPolicy: () => Promise<void> }).pollPolicy();
    }
  } catch (err: unknown) {
    logger.warn(`Policy poll failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
