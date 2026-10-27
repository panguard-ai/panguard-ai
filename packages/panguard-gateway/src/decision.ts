/**
 * From an evaluation to what the gateway does, and the record it keeps.
 *
 * Decisions carry identifiers and rule ids only, never the inspected content:
 * they go into the response's `panguard:verdict` extension field and the
 * AuditChain, and both outlive the request.
 *
 * @module @panguard-ai/panguard-gateway/decision
 */

import { newDecisionId } from '@panguard-ai/panguard-guard/audit';
import type { Evaluation } from './evaluator-pool.js';
import type { Coverage } from './windows.js';

export type FailMode = 'open' | 'closed';

/**
 * allow: nothing actionable.  flag: recorded and passed (an 'ask' verdict, or
 * an unverifiable input under fail-open).  deny: policy block.  fault: the
 * gateway could not evaluate and fails closed.
 */
export type Disposition = 'allow' | 'flag' | 'deny' | 'fault';

export type Checkpoint =
  | 'tool_definition'
  | 'user_message'
  | 'tool_output'
  | 'call_binding'
  | 'previous_response'
  | 'function_call'
  | 'output_text'
  | 'hosted_tool_receipt';

export type Action =
  | 'pass'
  | 'refusal'
  | 'incomplete'
  | 'failed'
  | 'rewrite_output'
  | 'strip_tool'
  | 'reject'
  | 'synthesize_output';

/** Rule ids the gateway assigns to its own findings (not ATR rules). */
export const GATEWAY_RULES = {
  undeclaredTool: 'panguard-gateway:undeclared-tool',
  argumentsMismatch: 'panguard-gateway:arguments-mismatch',
  itemMismatch: 'panguard-gateway:item-mismatch',
  uninspectable: 'panguard-gateway:uninspectable',
  invalidArguments: 'panguard-gateway:arguments-not-json',
  oversize: 'panguard-gateway:oversize',
  evaluationFailed: 'panguard-gateway:evaluation-failed',
  withheldCallOutput: 'panguard-gateway:output-for-withheld-call',
  forgedCallOutput: 'panguard-gateway:output-without-call',
  unboundCallOutput: 'panguard-gateway:output-for-unrecorded-call',
  historyMismatch: 'panguard-gateway:history-mismatch',
  upstreamIncomplete: 'panguard-gateway:upstream-stream-incomplete',
  notDelivered: 'panguard-gateway:not-delivered',
  textMismatch: 'panguard-gateway:text-mismatch',
} as const;

export interface Judgement {
  readonly disposition: Disposition;
  readonly reason: string;
  readonly rules: readonly string[];
  readonly durationMs: number;
  readonly coverage: Coverage;
}

export function judge(evaluation: Evaluation, failMode: FailMode): Judgement {
  if (evaluation.kind === 'failure') {
    return {
      disposition: failMode === 'closed' ? 'fault' : 'flag',
      reason: `evaluation failed (fail-${failMode}): ${evaluation.reason}`,
      rules: [GATEWAY_RULES.evaluationFailed],
      durationMs: evaluation.durationMs,
      coverage: 'partial',
    };
  }
  const { result, coverage, durationMs } = evaluation;
  const base = { rules: result.matchedRules, durationMs, coverage };
  if (result.outcome === 'deny') return { ...base, disposition: 'deny', reason: result.reason };
  if (coverage === 'partial') {
    const reason = `input too long to scan in full (fail-${failMode})`;
    return failMode === 'closed'
      ? {
          ...base,
          disposition: 'deny',
          reason,
          rules: [...result.matchedRules, GATEWAY_RULES.oversize],
        }
      : { ...base, disposition: 'flag', reason };
  }
  if (result.outcome === 'ask') return { ...base, disposition: 'flag', reason: result.reason };
  return { ...base, disposition: 'allow', reason: result.reason };
}

/** A gateway finding that needs no engine: binding checks, scope, mismatches. */
export function gatewayJudgement(
  disposition: Disposition,
  rule: string,
  reason: string
): Judgement {
  return { disposition, reason, rules: [rule], durationMs: 0, coverage: 'full' };
}

/** One check, as recorded on the response and in the audit chain. */
export interface Decision {
  readonly decision_id: string;
  readonly checkpoint: Checkpoint;
  readonly disposition: Disposition;
  readonly action: Action;
  readonly reason: string;
  readonly rules: readonly string[];
  readonly duration_ms: number;
  readonly coverage: Coverage;
  readonly call_id?: string;
  readonly item_id?: string;
  readonly tool?: string;
}

export interface DecisionSubject {
  readonly call_id?: string | undefined;
  readonly item_id?: string | undefined;
  readonly tool?: string | undefined;
}

export function decisionOf(
  checkpoint: Checkpoint,
  judgement: Judgement,
  action: Action,
  subject: DecisionSubject = {}
): Decision {
  return {
    decision_id: newDecisionId(),
    checkpoint,
    disposition: judgement.disposition,
    action,
    reason: judgement.reason,
    rules: judgement.rules,
    duration_ms: judgement.durationMs,
    coverage: judgement.coverage,
    ...(subject.call_id !== undefined ? { call_id: subject.call_id } : {}),
    ...(subject.item_id !== undefined ? { item_id: subject.item_id } : {}),
    ...(subject.tool !== undefined ? { tool: subject.tool } : {}),
  };
}

/** Rule ids for a message shown to the agent or model; at most five. */
export function ruleList(rules: readonly string[]): string {
  const shown = rules.slice(0, 5).join(', ');
  return rules.length > 5 ? `${shown} (+${rules.length - 5} more)` : shown;
}
