/**
 * RiskStore — the decoupling primitive between the inline gate (reads risk)
 * and the async brain (writes risk). Keeps the hot path off the brain.
 *
 * @module @panguard-ai/panguard-guard/containment/risk-store
 */
import type { SessionRisk } from './types.js';
import { NORMAL_RISK } from './types.js';

export interface RiskStore {
  /** Current risk for a session. Returns NORMAL_RISK for unseen sessions. */
  get(sessionId: string): SessionRisk;
  /** Set the risk for a session (written by the async brain). */
  set(sessionId: string, risk: SessionRisk): void;
  /** Drop a session's risk state (on session end). */
  clear(sessionId: string): void;
}

/**
 * In-process risk store. Reads are O(1) so the inline gate stays sub-ms.
 * The Map is the only mutable state and is fully encapsulated.
 */
export class InMemoryRiskStore implements RiskStore {
  private readonly store = new Map<string, SessionRisk>();

  get(sessionId: string): SessionRisk {
    return this.store.get(sessionId) ?? NORMAL_RISK;
  }

  set(sessionId: string, risk: SessionRisk): void {
    this.store.set(sessionId, risk);
  }

  clear(sessionId: string): void {
    this.store.delete(sessionId);
  }

  /** Number of sessions currently tracked (for metrics). */
  size(): number {
    return this.store.size;
  }
}
