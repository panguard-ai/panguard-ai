/**
 * The `panguard:verdict` extension field on the response object.
 *
 * The verdict rides on the response, not in an event or item of its own: the
 * official conformance suite validates events and output items against closed
 * unions, so one extra event dropped it from 17/17 to 10/17 and a prefixed item
 * is rejected outright, while an unknown field on the response passes (the zod
 * schema strips it). The spec's guidance for extending an existing schema is an
 * optional, documented field, which this is.
 *
 * @module @panguard-ai/panguard-gateway/verdict-field
 */

import type { Decision } from './decision.js';

export const VERDICT_FIELD = 'panguard:verdict';

/** Inputs the gateway saw but could not inspect (design §5.1 capability boundary). */
export interface NotInspected {
  /** Image, file, video and other non-text content parts. */
  readonly content_parts: number;
  /** Encrypted reasoning, compaction and item_reference items. */
  readonly opaque_items: number;
  /** System and developer messages plus `instructions`: not scanned as user input. */
  readonly developer_messages: number;
  /** Request items of a type the gateway does not know. */
  readonly unknown_items: number;
  /** Model refusals and reasoning in the response: relayed, not scanned (design S8). */
  readonly unscanned_output_parts: number;
  /** Provider streaming events outside the spec's set: dropped, not relayed. */
  readonly dropped_events: number;
}

export const NOTHING_UNINSPECTED: NotInspected = {
  content_parts: 0,
  opaque_items: 0,
  developer_messages: 0,
  unknown_items: 0,
  unscanned_output_parts: 0,
  dropped_events: 0,
};

export interface VerdictField {
  readonly outcome: 'pass' | 'flagged' | 'blocked' | 'failed';
  /** Checks run for this turn, request side included. */
  readonly checks: number;
  /** Every decision other than a plain allow. The audit chain has all of them. */
  readonly decisions: readonly Decision[];
  readonly not_inspected: NotInspected;
}

export function verdictField(
  decisions: readonly Decision[],
  notInspected: NotInspected
): VerdictField {
  const has = (d: Decision['disposition']): boolean => decisions.some((x) => x.disposition === d);
  const outcome = has('fault')
    ? 'failed'
    : has('deny')
      ? 'blocked'
      : has('flag')
        ? 'flagged'
        : 'pass';
  return {
    outcome,
    checks: decisions.length,
    decisions: decisions.filter((d) => d.disposition !== 'allow'),
    not_inspected: notInspected,
  };
}
