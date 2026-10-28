/**
 * The function_call check shared by the streaming (S2/S4) and the JSON path,
 * and the refusal message that replaces a blocked call (block style A).
 *
 * @module @panguard-ai/panguard-gateway/call-check
 */

import { randomUUID } from 'node:crypto';
import { canonicalArgs, functionCallEvent, outputTextEvent } from './atr-events.js';
import type { GatewayPolicy } from './config.js';
import { GATEWAY_RULES, gatewayJudgement, judge, ruleList, type Judgement } from './decision.js';
import type { Evaluator } from './evaluator-pool.js';
import type { JsonObject } from './json.js';

/**
 * S2 + S4: the name must be in the request's declared scope (Layer 0), then
 * the arguments go through ATR as a PreToolUse event. Arguments that are not
 * JSON are evaluated as the raw string and flagged.
 */
export async function checkFunctionCall(
  name: string,
  argumentsJson: string,
  declared: ReadonlySet<string>,
  evaluator: Evaluator,
  policy: GatewayPolicy
): Promise<Judgement> {
  if (!declared.has(name)) {
    return gatewayJudgement(
      'deny',
      GATEWAY_RULES.undeclaredTool,
      `tool '${name}' is not among the tools this request allows`
    );
  }
  const args = canonicalArgs(argumentsJson);
  const judgement = judge(
    await evaluator.evaluate('runtime', functionCallEvent(name, args, new Date().toISOString())),
    policy.failMode
  );
  if (!args.valid && judgement.disposition === 'allow') {
    return {
      ...judgement,
      disposition: 'flag',
      reason: 'function_call arguments are not valid JSON',
      rules: [...judgement.rules, GATEWAY_RULES.invalidArguments],
    };
  }
  return judgement;
}

/** S6/S7: model text, read as ATR `llm_output`. */
export async function checkText(
  text: string,
  evaluator: Evaluator,
  policy: GatewayPolicy
): Promise<Judgement> {
  return judge(
    await evaluator.evaluate('runtime', outputTextEvent(text, new Date().toISOString())),
    policy.failMode
  );
}

export function gatewayItemId(prefix: string): string {
  return `${prefix}_pg${randomUUID().replace(/-/g, '')}`;
}

export function callRefusalText(name: string, judgement: Judgement): string {
  return `[PanGuard] blocked tool call '${name}': ${judgement.reason} (${ruleList(judgement.rules)})`;
}

export function textRefusalText(judgement: Judgement): string {
  return `[PanGuard] response text withheld: ${judgement.reason} (${ruleList(judgement.rules)})`;
}

/** A completed assistant message whose only content is a refusal. */
export function refusalMessage(refusal: string): JsonObject {
  return {
    type: 'message',
    id: gatewayItemId('msg'),
    status: 'completed',
    role: 'assistant',
    content: [{ type: 'refusal', refusal }],
  };
}
