/**
 * One streamed response turn (design §2.2, §3): upstream events in, the events
 * the client receives out. Shared by SSE and WebSocket.
 *
 *   S1  response.created/in_progress/queued   snapshot kept for the terminal event
 *   S2  output_item.added (function_call)     the whole item is held, added included
 *   S3  function_call_arguments.delta         buffered, not evaluated
 *   S4  function_call_arguments.done          main checkpoint: Layer 0 scope + ATR
 *   S5  output_item.done (function_call)      arguments must equal those of S4
 *   S6  output_text.delta                     rolling check of the trailing text
 *   S7  output_text.done                      final check
 *   S9  hosted tool receipt                   scanned and recorded, never blocked
 *   S10 terminal event                        rebuilt with the gateway's output
 *
 * While an item is held every later event waits behind it, so the client gets
 * upstream order. Every event the client gets is renumbered from 0. Nothing of
 * the gateway's own is inserted: the verdict travels in the terminal response's
 * `panguard:verdict` field.
 *
 * @module @panguard-ai/panguard-gateway/turn-processor
 */

import { callRefusalText, checkFunctionCall, gatewayItemId } from './call-check.js';
import type { GatewayPolicy } from './config.js';
import {
  GATEWAY_RULES,
  decisionOf,
  gatewayJudgement,
  judge,
  type Action,
  type Decision,
  type Judgement,
} from './decision.js';
import { canonicalArgs, hostedReceiptEvent } from './atr-events.js';
import type { Evaluator } from './evaluator-pool.js';
import { isFunctionCall, isHostedToolReceipt } from './items.js';
import { isObject, num, obj, str, type JsonObject } from './json.js';
import type { CallRecordInput } from './ledger.js';
import { TextGate } from './text-gate.js';
import { VERDICT_FIELD, verdictField, type NotInspected } from './verdict-field.js';

export interface TurnContext {
  readonly evaluator: Evaluator;
  readonly policy: GatewayPolicy;
  /** Function names this request allows (from request-side R1/R2). */
  readonly declared: ReadonlySet<string>;
  readonly requestDecisions: readonly Decision[];
  readonly notInspected: NotInspected;
}

/** What the ledger and the audit chain need once the turn is over. */
export interface TurnOutcome {
  readonly responseId: string | undefined;
  readonly previousResponseId: string | undefined;
  readonly calls: readonly CallRecordInput[];
  readonly decisions: readonly Decision[];
}

interface Held {
  readonly upstreamIndex: number | undefined;
  readonly itemId: string | undefined;
  readonly item: JsonObject | undefined;
  readonly events: readonly JsonObject[];
  /** Arguments as of function_call_arguments.done (S4). */
  readonly arguments: string | undefined;
  readonly judgement: Judgement | undefined;
}

const TERMINAL = new Set(['response.completed', 'response.incomplete', 'response.failed']);

/**
 * Streaming event types of the spec (the union the official conformance suite
 * validates against). Anything else is a provider extension whose content the
 * gateway cannot inspect, so it is dropped and counted, not relayed.
 */
const STANDARD_EVENTS: ReadonlySet<string> = new Set([
  'response.created',
  'response.queued',
  'response.in_progress',
  'response.completed',
  'response.failed',
  'response.incomplete',
  'response.output_item.added',
  'response.output_item.done',
  'response.content_part.added',
  'response.content_part.done',
  'response.output_text.delta',
  'response.output_text.done',
  'response.refusal.delta',
  'response.refusal.done',
  'response.function_call_arguments.delta',
  'response.function_call_arguments.done',
  'response.reasoning_summary_part.added',
  'response.reasoning_summary_part.done',
  'response.reasoning.delta',
  'response.reasoning.done',
  'response.reasoning_summary_text.delta',
  'response.reasoning_summary_text.done',
  'response.output_text.annotation.added',
  'error',
]);

export class TurnProcessor {
  private readonly ctx: TurnContext;
  private seq = 0;
  private snapshot: JsonObject | undefined;
  private upstreamTerminal: JsonObject | undefined;
  private indexMap: ReadonlyMap<number, number> = new Map();
  private output: readonly JsonObject[] = [];
  private held: Held | undefined;
  private waiting: readonly JsonObject[] = [];
  private ended = false;
  private decisions: readonly Decision[] = [];
  private calls: readonly CallRecordInput[] = [];
  private seenCalls: ReadonlyMap<string, JsonObject> = new Map();
  private readonly text: TextGate;
  /** Model refusals and reasoning items relayed without a scan (design S8). */
  private unscanned = 0;
  /** Provider events outside the standard set, dropped. */
  private dropped = 0;

  constructor(ctx: TurnContext) {
    this.ctx = ctx;
    this.text = new TextGate({
      evaluator: ctx.evaluator,
      policy: ctx.policy,
      emit: (event) => this.emit(event),
      mapped: (event) => this.mapped(event),
      mapIndex: (index) => this.mapIndex(index),
      decide: (decision) => this.decide(decision),
      addOutput: (item) => {
        this.output = [...this.output, item];
      },
      endIncomplete: () => this.endIncomplete(),
      endFailed: (code, reason) => this.endFailed(code, reason),
    });
  }

  /** True once the client has received a terminal event. */
  isEnded(): boolean {
    return this.ended;
  }

  /** Process one upstream event; returns the events to send, already numbered. */
  async push(event: JsonObject): Promise<readonly JsonObject[]> {
    this.track(event);
    if (this.ended) return [];
    if (this.held && !this.belongsToHeld(event)) {
      if (TERMINAL.has(str(event, 'type') ?? '')) return this.abandonHeld(event);
      this.waiting = [...this.waiting, event];
      return [];
    }
    return this.route(event);
  }

  /** The upstream stream ended. If the client has no terminal event yet, fail the response. */
  finish(): readonly JsonObject[] {
    if (this.ended) return [];
    this.withholdHeld('the upstream stream ended before the item completed');
    return this.endFailed(
      'upstream_stream_incomplete',
      'the upstream stream ended before a terminal event'
    );
  }

  outcome(): TurnOutcome {
    const recorded = new Set(this.calls.map((c) => c.call_id));
    const undelivered = [...this.seenCalls.entries()]
      .filter(([callId]) => !recorded.has(callId))
      .map(([callId, item]) =>
        callRecord(item, callId, 'withheld', undefined, {
          rules: [GATEWAY_RULES.notDelivered],
          reason: 'not delivered: the response was cut before this call',
        })
      );
    const response = this.upstreamTerminal ?? this.snapshot;
    return {
      responseId: str(response, 'id'),
      previousResponseId: str(response, 'previous_response_id'),
      calls: [...this.calls, ...undelivered],
      decisions: this.decisions,
    };
  }

  private async route(event: JsonObject): Promise<readonly JsonObject[]> {
    const type = str(event, 'type') ?? '';
    switch (type) {
      case 'response.created':
      case 'response.in_progress':
      case 'response.queued':
        this.snapshot = obj(event, 'response') ?? this.snapshot;
        return [this.emit(event)];
      case 'response.output_item.added':
        return this.onItemAdded(event);
      case 'response.function_call_arguments.delta':
        this.hold(event);
        return [];
      case 'response.function_call_arguments.done':
        return this.onArgumentsDone(event);
      case 'response.output_item.done':
        return this.onItemDone(event);
      case 'response.content_part.added':
        return this.text.onPartAdded(event);
      case 'response.content_part.done':
        return this.text.onPartDone(event);
      case 'response.output_text.delta':
        return this.text.onDelta(event);
      case 'response.output_text.done':
        return this.text.onDone(event);
      default:
        if (TERMINAL.has(type)) return this.onUpstreamTerminal(event);
        if (!STANDARD_EVENTS.has(type)) {
          this.dropped += 1;
          return [];
        }
        if (type === 'response.refusal.done') this.unscanned += 1;
        return [this.emit(this.mapped(event))];
    }
  }

  // --- function calls (S2-S5) ---------------------------------------------

  private async onItemAdded(event: JsonObject): Promise<readonly JsonObject[]> {
    const item = obj(event, 'item');
    if (item && isFunctionCall(item)) {
      this.hold(event);
      return [];
    }
    if (item && str(item, 'type') === 'message') return this.text.onMessageAdded(event, item);
    return [this.emit(this.mapped(event))];
  }

  /** Start or extend the held function_call item. */
  private hold(event: JsonObject): void {
    const item = obj(event, 'item');
    const current = this.held ?? {
      upstreamIndex: num(event, 'output_index'),
      itemId: str(event, 'item_id') ?? str(item, 'id'),
      item,
      events: [],
      arguments: undefined,
      judgement: undefined,
    };
    this.held = { ...current, events: [...current.events, event] };
  }

  private async onArgumentsDone(event: JsonObject): Promise<readonly JsonObject[]> {
    this.hold(event);
    const held = this.held!;
    const args = str(event, 'arguments') ?? '';
    // No output_item.added seen (a non-conforming upstream): judge at output_item.done instead.
    if (!held.item) {
      this.held = { ...held, arguments: args };
      return [];
    }
    const name = str(held.item, 'name') ?? '';
    const judgement = await checkFunctionCall(
      name,
      args,
      this.ctx.declared,
      this.ctx.evaluator,
      this.ctx.policy
    );
    this.held = { ...held, arguments: args, judgement };
    return [];
  }

  private async onItemDone(event: JsonObject): Promise<readonly JsonObject[]> {
    const item = obj(event, 'item');
    if (item && isFunctionCall(item)) return this.finalizeCall(event, item);
    if (item && str(item, 'type') === 'message') return this.text.onMessageDone(event, item);
    if (item) {
      this.output = [...this.output, item];
      if (isHostedToolReceipt(item)) await this.scanReceipt(item);
      if (str(item, 'type') === 'reasoning') this.unscanned += 1;
    }
    return [this.emit(this.mapped(event))];
  }

  private async finalizeCall(event: JsonObject, item: JsonObject): Promise<readonly JsonObject[]> {
    const held = this.held ?? {
      upstreamIndex: num(event, 'output_index'),
      itemId: str(item, 'id'),
      item: undefined,
      events: [],
      arguments: undefined,
      judgement: undefined,
    };
    this.held = undefined;
    const events = [...held.events, event];
    const mismatch = heldMismatch(held.item, events, item);
    const judgement = mismatch
      ? gatewayJudgement('deny', mismatch.rule, mismatch.reason)
      : (held.judgement ??
        (await checkFunctionCall(
          str(item, 'name') ?? '',
          str(item, 'arguments') ?? '',
          this.ctx.declared,
          this.ctx.evaluator,
          this.ctx.policy
        )));
    const out = this.applyCallJudgement(item, events, judgement, held.upstreamIndex);
    return [...out, ...(await this.releaseWaiting())];
  }

  private applyCallJudgement(
    item: JsonObject,
    events: readonly JsonObject[],
    judgement: Judgement,
    upstreamIndex: number | undefined
  ): readonly JsonObject[] {
    const name = str(item, 'name') ?? '';
    const callId = str(item, 'call_id') ?? '';
    const subject = { call_id: callId, item_id: str(item, 'id'), tool: name };
    if (judgement.disposition === 'allow' || judgement.disposition === 'flag') {
      this.decide(decisionOf('function_call', judgement, 'pass', subject));
      this.recordCall(callRecord(item, callId, 'released', this.lastDecisionId(), judgement));
      this.output = [...this.output, item];
      return events.map((e) => this.emit(this.mapped(e)));
    }
    const action: Action =
      judgement.disposition === 'fault'
        ? 'failed'
        : this.ctx.policy.blockStyle === 'refusal'
          ? 'refusal'
          : 'incomplete';
    this.decide(decisionOf('function_call', judgement, action, subject));
    this.recordCall(callRecord(item, callId, 'withheld', this.lastDecisionId(), judgement));
    if (action === 'refusal')
      return this.refusalEvents(upstreamIndex, callRefusalText(name, judgement));
    if (action === 'incomplete') return this.endIncomplete();
    return this.endFailed('gateway_evaluation_failed', judgement.reason);
  }

  /** A terminal event arrived while a call was still held: it never completed. */
  private async abandonHeld(terminal: JsonObject): Promise<readonly JsonObject[]> {
    const held = this.held;
    this.held = undefined;
    const item = held?.item;
    const judgement = gatewayJudgement(
      'deny',
      GATEWAY_RULES.upstreamIncomplete,
      'the upstream ended the response before the function call completed'
    );
    const blocked = item
      ? this.applyCallJudgement(item, held?.events ?? [], judgement, held?.upstreamIndex)
      : [];
    const waiting = await this.releaseWaiting();
    return [...blocked, ...waiting, ...(await this.push(terminal))];
  }

  private withholdHeld(reason: string): void {
    const item = this.held?.item;
    this.held = undefined;
    if (!item) return;
    const callId = str(item, 'call_id') ?? '';
    this.recordCall(
      callRecord(item, callId, 'withheld', undefined, {
        rules: [GATEWAY_RULES.upstreamIncomplete],
        reason,
      })
    );
  }

  /** Events that queued behind a held item, replayed in upstream order. */
  private async releaseWaiting(): Promise<readonly JsonObject[]> {
    const waiting = this.waiting;
    this.waiting = [];
    const out: JsonObject[] = [];
    for (const event of waiting) out.push(...(await this.push(event)));
    return out;
  }

  /** Block style A: a refusal message in the blocked call's output slot. */
  private refusalEvents(upstreamIndex: number | undefined, refusal: string): readonly JsonObject[] {
    const index = this.mapIndex(upstreamIndex);
    const id = gatewayItemId('msg');
    const part = { type: 'refusal', refusal };
    const done = { type: 'message', id, status: 'completed', role: 'assistant', content: [part] };
    this.output = [...this.output, done];
    const at = { item_id: id, output_index: index, content_index: 0 };
    return [
      this.emit({
        type: 'response.output_item.added',
        output_index: index,
        item: { ...done, status: 'in_progress', content: [] },
      }),
      this.emit({
        type: 'response.content_part.added',
        ...at,
        part: { type: 'refusal', refusal: '' },
      }),
      this.emit({ type: 'response.refusal.delta', ...at, delta: refusal }),
      this.emit({ type: 'response.refusal.done', ...at, refusal }),
      this.emit({ type: 'response.content_part.done', ...at, part }),
      this.emit({ type: 'response.output_item.done', output_index: index, item: done }),
    ];
  }

  private async scanReceipt(item: JsonObject): Promise<void> {
    const evaluation = await this.ctx.evaluator.evaluate(
      'runtime',
      hostedReceiptEvent(item, new Date().toISOString())
    );
    const judgement = judge(evaluation, this.ctx.policy.failMode);
    // The provider already ran the tool: nothing to block, the finding is recorded.
    const recorded: Judgement =
      judgement.disposition === 'allow'
        ? judgement
        : {
            ...judgement,
            disposition: 'flag',
            reason: `hosted tool already ran: ${judgement.reason}`,
          };
    this.decide(
      decisionOf('hosted_tool_receipt', recorded, 'pass', {
        item_id: str(item, 'id'),
        tool: str(item, 'type'),
      })
    );
  }

  // --- terminal events (S10) ------------------------------------------------

  private async onUpstreamTerminal(event: JsonObject): Promise<readonly JsonObject[]> {
    const closing = await this.text.closeOpenParts();
    if (this.ended) return closing;
    const upstream = obj(event, 'response') ?? {};
    this.ended = true;
    return [
      ...closing,
      this.emit({
        type: str(event, 'type'),
        response: { ...upstream, output: this.output, [VERDICT_FIELD]: this.verdict() },
      }),
    ];
  }

  private endIncomplete(): readonly JsonObject[] {
    this.ended = true;
    return [
      this.emit({
        type: 'response.incomplete',
        response: this.synthesizedTerminal('incomplete', {
          incomplete_details: { reason: 'content_filter' },
        }),
      }),
    ];
  }

  private endFailed(code: string, reason: string): readonly JsonObject[] {
    this.ended = true;
    const message = `[PanGuard] ${reason}`;
    return [
      this.emit({ type: 'error', error: { type: 'server_error', code, message, param: null } }),
      this.emit({
        type: 'response.failed',
        response: this.synthesizedTerminal('failed', { error: { code, message } }),
      }),
    ];
  }

  /**
   * A terminal response the gateway writes itself: the last upstream snapshot
   * with status, output and the incomplete/error detail replaced.
   */
  private synthesizedTerminal(status: 'incomplete' | 'failed', patch: JsonObject): JsonObject {
    const base = this.upstreamTerminal ?? this.snapshot ?? {};
    return {
      ...base,
      status,
      output: this.output,
      completed_at: null,
      incomplete_details: null,
      error: null,
      ...patch,
      [VERDICT_FIELD]: this.verdict(),
    };
  }

  private verdict(): JsonObject {
    return {
      ...verdictField([...this.ctx.requestDecisions, ...this.decisions], {
        ...this.ctx.notInspected,
        unscanned_output_parts: this.ctx.notInspected.unscanned_output_parts + this.unscanned,
        dropped_events: this.ctx.notInspected.dropped_events + this.dropped,
      }),
    };
  }

  // --- bookkeeping ----------------------------------------------------------

  /** Seen even after the client's stream ended: the ledger needs every call. */
  private track(event: JsonObject): void {
    const type = str(event, 'type') ?? '';
    const item = obj(event, 'item');
    if (item && isFunctionCall(item)) {
      const callId = str(item, 'call_id');
      if (callId !== undefined) this.seenCalls = new Map([...this.seenCalls, [callId, item]]);
    }
    if (TERMINAL.has(type)) {
      const response = obj(event, 'response');
      this.upstreamTerminal = response;
      for (const out of Array.isArray(response?.['output']) ? response['output'] : []) {
        if (isObject(out) && isFunctionCall(out)) {
          const callId = str(out, 'call_id');
          if (callId !== undefined) this.seenCalls = new Map([...this.seenCalls, [callId, out]]);
        }
      }
    }
  }

  private belongsToHeld(event: JsonObject): boolean {
    const held = this.held;
    if (!held) return false;
    const index = num(event, 'output_index');
    if (index !== undefined && held.upstreamIndex !== undefined)
      return index === held.upstreamIndex;
    const itemId = str(event, 'item_id') ?? str(obj(event, 'item'), 'id');
    return itemId !== undefined && itemId === held.itemId;
  }

  private decide(decision: Decision): void {
    this.decisions = [...this.decisions, decision];
  }

  private lastDecisionId(): string | undefined {
    return this.decisions[this.decisions.length - 1]?.decision_id;
  }

  private recordCall(record: CallRecordInput): void {
    this.calls = [...this.calls.filter((c) => c.call_id !== record.call_id), record];
  }

  private mapIndex(upstreamIndex: number | undefined): number {
    const key = upstreamIndex ?? -1;
    const known = this.indexMap.get(key);
    if (known !== undefined) return known;
    const next = this.indexMap.size;
    this.indexMap = new Map([...this.indexMap, [key, next]]);
    return next;
  }

  private mapped(event: JsonObject): JsonObject {
    const index = num(event, 'output_index');
    return index === undefined ? event : { ...event, output_index: this.mapIndex(index) };
  }

  private emit(event: JsonObject): JsonObject {
    return { ...event, sequence_number: this.seq++ };
  }
}

/**
 * Everything of a held call that reaches the client must be what was checked:
 * name and call_id as in output_item.added (and any arguments pre-filled
 * there), every function_call_arguments.done, and the deltas joined, must all
 * match the final item. Returns the mismatch, or undefined.
 */
function heldMismatch(
  added: JsonObject | undefined,
  events: readonly JsonObject[],
  item: JsonObject
): { readonly rule: string; readonly reason: string } | undefined {
  const args = str(item, 'arguments') ?? '';
  if (added) {
    for (const field of ['name', 'call_id'] as const) {
      if (str(added, field) !== str(item, field)) {
        return {
          rule: GATEWAY_RULES.itemMismatch,
          reason: `the function_call ${field} changed between output_item.added and output_item.done`,
        };
      }
    }
    const prefilled = str(added, 'arguments') ?? '';
    if (prefilled !== '' && prefilled !== args) {
      return {
        rule: GATEWAY_RULES.argumentsMismatch,
        reason: 'arguments in output_item.added differ from the final arguments',
      };
    }
  }
  const ofType = (type: string) => events.filter((e) => str(e, 'type') === type);
  if (ofType('response.function_call_arguments.done').some((e) => str(e, 'arguments') !== args)) {
    return {
      rule: GATEWAY_RULES.argumentsMismatch,
      reason: 'arguments changed between function_call_arguments.done and output_item.done',
    };
  }
  const deltas = ofType('response.function_call_arguments.delta');
  if (deltas.length > 0 && deltas.map((e) => str(e, 'delta') ?? '').join('') !== args) {
    return {
      rule: GATEWAY_RULES.argumentsMismatch,
      reason: 'the streamed argument deltas do not add up to the final arguments',
    };
  }
  return undefined;
}

function callRecord(
  item: JsonObject,
  callId: string,
  status: CallRecordInput['status'],
  decisionId: string | undefined,
  verdict: { readonly rules: readonly string[]; readonly reason: string }
): CallRecordInput {
  const args = str(item, 'arguments') ?? '';
  return {
    call_id: callId,
    item_id: str(item, 'id'),
    name: str(item, 'name') ?? '',
    canonicalArguments: canonicalArgs(args).canonical,
    status,
    decision_id: decisionId,
    rules: verdict.rules,
    reason: verdict.reason,
  };
}
