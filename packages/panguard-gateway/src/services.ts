/**
 * What the HTTP and WebSocket front ends share: configuration, evaluator,
 * ledger and audit sink, and the bookkeeping at the edges of a turn.
 *
 * @module @panguard-ai/panguard-gateway/services
 */

import type { AuditContext, AuditSink } from './audit.js';
import type { GatewayConfig } from './config.js';
import type { Decision } from './decision.js';
import type { Evaluator } from './evaluator-pool.js';
import type { InspectContext } from './request-inspector.js';
import type { VerdictLedger } from './ledger.js';
import type { TurnContext, TurnOutcome } from './turn-processor.js';
import type { NotInspected } from './verdict-field.js';

export interface GatewayServices {
  readonly config: GatewayConfig;
  readonly evaluator: Evaluator;
  readonly ledger: VerdictLedger;
  readonly audit: AuditSink;
}

export function inspectContext(services: GatewayServices): InspectContext {
  return { evaluator: services.evaluator, ledger: services.ledger, policy: services.config.policy };
}

export function turnContext(
  services: GatewayServices,
  declared: ReadonlySet<string>,
  requestDecisions: readonly Decision[],
  notInspected: NotInspected
): TurnContext {
  return {
    evaluator: services.evaluator,
    policy: services.config.policy,
    declared,
    requestDecisions,
    notInspected,
  };
}

/** Write what the turn did with its function calls to the ledger. */
export function recordLedger(services: GatewayServices, outcome: TurnOutcome): void {
  if (outcome.responseId === undefined) return;
  services.ledger.recordResponse(outcome.responseId, outcome.previousResponseId, outcome.calls);
}

/** Audit the response-side decisions of a finished turn. */
export function auditResponse(
  services: GatewayServices,
  base: Omit<AuditContext, 'phase' | 'session' | 'response_id'>,
  session: string | undefined,
  outcome: TurnOutcome
): void {
  const responseId = outcome.responseId;
  services.audit.record(
    {
      ...base,
      phase: 'response',
      session:
        session ?? (responseId !== undefined ? services.ledger.chainRoot(responseId) : 'unknown'),
      response_id: responseId,
    },
    outcome.decisions
  );
}
