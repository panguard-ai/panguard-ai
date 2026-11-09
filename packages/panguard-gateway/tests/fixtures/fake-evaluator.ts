/**
 * A deterministic stand-in for the ATR worker pool: rules are predicates on
 * the event, so unit tests do not depend on the live rule corpus.
 */

import type { AgentEvent } from 'agent-threat-rules';
import type { Evaluation, Evaluator } from '../../src/evaluator-pool.js';
import type { EngineKind } from '../../src/worker/protocol.js';

export interface FakeRule {
  readonly id: string;
  readonly outcome: 'deny' | 'ask';
  readonly engine?: EngineKind;
  readonly when: (event: AgentEvent) => boolean;
}

export interface Seen {
  readonly engine: EngineKind;
  readonly event: AgentEvent;
}

export class FakeEvaluator implements Evaluator {
  private readonly rules: readonly FakeRule[];
  private readonly failWhen: (event: AgentEvent) => boolean;
  private seen: readonly Seen[] = [];

  constructor(rules: readonly FakeRule[], failWhen: (event: AgentEvent) => boolean = () => false) {
    this.rules = rules;
    this.failWhen = failWhen;
  }

  calls(): readonly Seen[] {
    return this.seen;
  }

  async evaluate(engine: EngineKind, event: AgentEvent): Promise<Evaluation> {
    this.seen = [...this.seen, { engine, event }];
    if (this.failWhen(event)) return { kind: 'failure', reason: 'fake timeout', durationMs: 1 };
    const matched = this.rules.filter((r) => (r.engine ?? 'runtime') === engine && r.when(event));
    const deny = matched.find((r) => r.outcome === 'deny');
    const ask = matched.find((r) => r.outcome === 'ask');
    const top = deny ?? ask;
    return {
      kind: 'result',
      result: {
        outcome: deny ? 'deny' : ask ? 'ask' : 'allow',
        reason: top ? `fake rule ${top.id}` : 'No threats detected',
        matchedRules: matched.map((r) => r.id),
        confidence: top ? 0.9 : 0,
        durationMs: 0,
        adviseOnly: false,
      },
      windows: 1,
      coverage: 'full',
      durationMs: 0,
    };
  }
}

/** Matches when any of the event's text carries the needle. */
export function contains(needle: string): (event: AgentEvent) => boolean {
  return (event) =>
    event.content.includes(needle) ||
    Object.values(event.fields ?? {}).some((v) => v.includes(needle));
}
