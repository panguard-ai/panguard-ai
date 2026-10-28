/**
 * Model text in a streamed turn (checkpoints S6/S7).
 *
 * Deltas go out whole (so `logprobs` and `obfuscation` stay aligned). Every
 * check reads all text added since the previous check plus `overlap` characters
 * before it, so a single large delta is read in full and a pattern straddling
 * two checks is seen whole. Checks run every `window` characters and once more
 * at the end; with a hold-back nothing leaves before a check has read it. Text
 * cannot be recalled once sent, so a hit ends the response as incomplete.
 *
 * Text that reaches the client by any other carrier is checked too: text a
 * provider pre-fills in output_item.added or content_part.added, `text` parts,
 * and text repeated in the done events that differs from what streamed.
 *
 * @module @panguard-ai/panguard-gateway/text-gate
 */

import { checkText } from './call-check.js';
import type { GatewayPolicy } from './config.js';
import {
  GATEWAY_RULES,
  decisionOf,
  gatewayJudgement,
  type Decision,
  type Judgement,
} from './decision.js';
import type { Evaluator } from './evaluator-pool.js';
import { isObject, num, obj, str, type JsonObject } from './json.js';

/** What the gate needs from the turn it belongs to. */
export interface TurnHooks {
  readonly evaluator: Evaluator;
  readonly policy: GatewayPolicy;
  /** Number an event for the client. */
  emit(event: JsonObject): JsonObject;
  /** Rewrite output_index to the client's numbering. */
  mapped(event: JsonObject): JsonObject;
  mapIndex(upstreamIndex: number | undefined): number;
  decide(decision: Decision): void;
  addOutput(item: JsonObject): void;
  endIncomplete(): readonly JsonObject[];
  endFailed(code: string, reason: string): readonly JsonObject[];
}

/** Content part types that carry model text to the client. */
const TEXT_PARTS: ReadonlySet<string> = new Set(['output_text', 'text']);

interface TextState {
  /** Upstream delta events not yet sent: released whole, so logprobs stay aligned. */
  readonly pending: readonly JsonObject[];
  readonly pendingText: string;
  readonly emitted: string;
  readonly checkedUpTo: number;
  readonly lastFlag: string;
  /** Latest passing check: recorded when the part ends, if nothing was flagged. */
  readonly lastPass: Judgement | undefined;
  /** output_text.done seen: `emitted` is the whole checked text of the part. */
  readonly finished: boolean;
  /** Latest event of the part: where a cut at the end of the turn closes it. */
  readonly origin: JsonObject | undefined;
}

const EMPTY_TEXT: TextState = {
  pending: [],
  pendingText: '',
  emitted: '',
  checkedUpTo: 0,
  lastFlag: '',
  lastPass: undefined,
  finished: false,
  origin: undefined,
};

interface MessageState {
  readonly item: JsonObject;
  /** Finished content parts by content_index. */
  readonly parts: ReadonlyMap<number, JsonObject>;
}

const blocks = (judgement: Judgement): boolean =>
  judgement.disposition === 'deny' || judgement.disposition === 'fault';

const isTextPart = (part: unknown): part is JsonObject =>
  isObject(part) && TEXT_PARTS.has(str(part, 'type') ?? '');

export class TextGate {
  private readonly turn: TurnHooks;
  private texts: ReadonlyMap<string, TextState> = new Map();
  private messages: ReadonlyMap<string, MessageState> = new Map();

  constructor(turn: TurnHooks) {
    this.turn = turn;
  }

  /**
   * A message item opens. Text pre-filled in it goes out with the event, so it
   * is checked first; on a hit the message opens empty and the response is cut.
   */
  async onMessageAdded(event: JsonObject, item: JsonObject): Promise<readonly JsonObject[]> {
    const id = str(item, 'id');
    if (id !== undefined) {
      this.messages = new Map([...this.messages, [id, { item, parts: new Map() }]]);
    }
    const content = Array.isArray(item['content']) ? item['content'] : [];
    const text = content
      .filter(isTextPart)
      .map((p) => str(p, 'text') ?? '')
      .join('\n');
    if (text === '') return [this.turn.emit(this.turn.mapped(event))];
    const judgement = await this.check(text);
    if (!blocks(judgement)) {
      this.flagText(event, EMPTY_TEXT, judgement);
      return [this.turn.emit(this.turn.mapped(event))];
    }
    const emptied = { ...item, content: [] };
    const opened = this.turn.emit(this.turn.mapped({ ...event, item: emptied }));
    return [opened, ...this.cutMessage(event, emptied, [], judgement)];
  }

  async onDelta(event: JsonObject): Promise<readonly JsonObject[]> {
    const key = textKey(event);
    const prior = this.texts.get(key) ?? EMPTY_TEXT;
    let state: TextState = {
      ...prior,
      pending: [...prior.pending, event],
      pendingText: prior.pendingText + (str(event, 'delta') ?? ''),
      origin: event,
    };
    const seen = state.emitted + state.pendingText;
    const { window, holdback } = this.turn.policy.text;
    const { release, keep, chars } = releasable(state.pending, holdback);
    // With a hold-back nothing leaves before a check has read it; without one,
    // text goes out at once and is checked every `window` characters.
    const exposesUnchecked = state.emitted.length + chars > state.checkedUpTo;
    if (seen.length - state.checkedUpTo >= window || (holdback > 0 && exposesUnchecked)) {
      const checked = await this.checkSeen(event, key, state, seen);
      if (checked.cut) return checked.cut;
      state = checked.state;
    }
    const releasedText = release.map((e) => str(e, 'delta') ?? '').join('');
    this.setText(key, {
      ...state,
      pending: keep,
      pendingText: state.pendingText.slice(releasedText.length),
      emitted: state.emitted + releasedText,
    });
    return release.map((e) => this.turn.emit(this.turn.mapped(e)));
  }

  /**
   * The turn is ending: a part that never got output_text.done still has its
   * unchecked text checked, and held-back deltas go out only if it passes.
   */
  async closeOpenParts(): Promise<readonly JsonObject[]> {
    const out: JsonObject[] = [];
    for (const [key, state] of this.texts) {
      if (state.finished || !state.origin) continue;
      const seen = state.emitted + state.pendingText;
      let settled = state;
      if (seen.length > state.checkedUpTo) {
        const checked = await this.checkSeen(state.origin, key, state, seen);
        if (checked.cut) return [...out, ...checked.cut];
        settled = checked.state;
      }
      out.push(...settled.pending.map((e) => this.turn.emit(this.turn.mapped(e))));
      this.setText(key, {
        ...settled,
        pending: [],
        pendingText: '',
        emitted: seen,
        finished: true,
      });
    }
    return out;
  }

  /**
   * End of a text part. If the provider's final text differs from what
   * streamed (or nothing streamed), the final text goes out only after a check
   * of the whole of it.
   */
  async onDone(event: JsonObject): Promise<readonly JsonObject[]> {
    const key = textKey(event);
    let state = this.texts.get(key) ?? EMPTY_TEXT;
    const seen = state.emitted + state.pendingText;
    if (seen.length > state.checkedUpTo) {
      const checked = await this.checkSeen(event, key, state, seen);
      if (checked.cut) return checked.cut;
      state = checked.state;
    }
    const itemId = str(event, 'item_id');
    const repeated = str(event, 'text');
    let final = seen;
    if (repeated !== undefined && repeated !== seen) {
      const judgement = await this.check(repeated);
      if (blocks(judgement)) return this.cutText(event, state, judgement);
      state = this.flagText(event, state, judgement);
      const mismatch = gatewayJudgement(
        'flag',
        GATEWAY_RULES.textMismatch,
        'output_text.done differed from the streamed text; it was checked whole'
      );
      this.turn.decide(decisionOf('output_text', mismatch, 'pass', { item_id: itemId }));
      final = repeated;
    }
    if (state.lastFlag === '' && state.lastPass) {
      this.turn.decide(decisionOf('output_text', state.lastPass, 'pass', { item_id: itemId }));
    }
    const flushed = state.pending.map((e) => this.turn.emit(this.turn.mapped(e)));
    this.setText(key, { ...state, pending: [], pendingText: '', emitted: final, finished: true });
    return [...flushed, this.turn.emit(this.turn.mapped({ ...event, text: final }))];
  }

  /**
   * Text a provider puts in the part itself reaches the client as it is, so it
   * is checked first; on a hit the part opens empty and the response is cut.
   */
  async onPartAdded(event: JsonObject): Promise<readonly JsonObject[]> {
    const part = obj(event, 'part');
    const text = str(part, 'text') ?? '';
    if (!isTextPart(part) || text === '') return [this.turn.emit(this.turn.mapped(event))];
    const judgement = await this.check(text);
    if (blocks(judgement)) {
      const opened = this.turn.emit(this.turn.mapped({ ...event, part: { ...part, text: '' } }));
      return [opened, ...this.cutText(event, EMPTY_TEXT, judgement)];
    }
    this.setText(textKey(event), {
      ...this.flagText(event, EMPTY_TEXT, judgement),
      emitted: text,
      checkedUpTo: text.length,
      lastPass: judgement,
    });
    return [this.turn.emit(this.turn.mapped(event))];
  }

  /** A finished part carries the checked text; a part that never streamed is checked now. */
  async onPartDone(event: JsonObject): Promise<readonly JsonObject[]> {
    const part = obj(event, 'part');
    if (!isTextPart(part)) {
      this.recordPart(event);
      return [this.turn.emit(this.turn.mapped(event))];
    }
    const key = textKey(event);
    const state = this.texts.get(key);
    if (state?.finished) {
      const settled = { ...event, part: { ...part, text: state.emitted } };
      this.recordPart(settled);
      return [this.turn.emit(this.turn.mapped(settled))];
    }
    const text = str(part, 'text') ?? '';
    const judgement = await this.check(text);
    if (blocks(judgement)) return this.cutText(event, state ?? EMPTY_TEXT, judgement);
    this.setText(key, {
      ...this.flagText(event, state ?? EMPTY_TEXT, judgement),
      emitted: text,
      finished: true,
    });
    this.recordPart(event);
    return [this.turn.emit(this.turn.mapped(event))];
  }

  /**
   * The finished message is rebuilt from what the client received. A part that
   * never streamed is checked here; a hit closes the message as incomplete and
   * ends the response.
   */
  async onMessageDone(event: JsonObject, item: JsonObject): Promise<readonly JsonObject[]> {
    const id = str(item, 'id') ?? '';
    const content = Array.isArray(item['content']) ? item['content'] : [];
    const rebuilt: unknown[] = [];
    for (const [index, part] of content.entries()) {
      if (!isTextPart(part)) {
        rebuilt.push(part);
        continue;
      }
      const state = this.texts.get(`${id}:${index}`);
      if (state?.finished) {
        rebuilt.push({ ...part, text: state.emitted });
        continue;
      }
      const judgement = await this.check(str(part, 'text') ?? '');
      if (blocks(judgement)) return this.cutMessage(event, item, rebuilt, judgement);
      if (judgement.disposition === 'flag') {
        this.turn.decide(decisionOf('output_text', judgement, 'pass', { item_id: id }));
      }
      rebuilt.push(part);
    }
    const settled = { ...item, content: rebuilt };
    this.turn.addOutput(settled);
    return [this.turn.emit(this.turn.mapped({ ...event, item: settled }))];
  }

  private check(text: string): Promise<Judgement> {
    return checkText(text, this.turn.evaluator, this.turn.policy);
  }

  private cutMessage(
    event: JsonObject,
    item: JsonObject,
    kept: readonly unknown[],
    judgement: Judgement
  ): readonly JsonObject[] {
    const fault = judgement.disposition === 'fault';
    this.turn.decide(
      decisionOf('output_text', judgement, fault ? 'failed' : 'incomplete', {
        item_id: str(item, 'id'),
      })
    );
    if (fault) return this.turn.endFailed('gateway_evaluation_failed', judgement.reason);
    const closed = { ...item, status: 'incomplete', content: kept };
    this.turn.addOutput(closed);
    const index = this.turn.mapIndex(num(event, 'output_index'));
    return [
      this.turn.emit({ type: 'response.output_item.done', output_index: index, item: closed }),
      ...this.turn.endIncomplete(),
    ];
  }

  /**
   * Check everything added since the last check, plus `overlap` characters of
   * already-checked text before it. A deny or fault cuts the response there.
   */
  private async checkSeen(
    event: JsonObject,
    key: string,
    state: TextState,
    seen: string
  ): Promise<{ readonly state: TextState; readonly cut?: readonly JsonObject[] }> {
    const from = Math.max(0, state.checkedUpTo - this.turn.policy.text.overlap);
    const judgement = await this.check(seen.slice(from));
    const checked: TextState = { ...state, checkedUpTo: seen.length };
    if (blocks(judgement)) {
      this.setText(key, checked);
      return { state: checked, cut: this.cutText(event, checked, judgement) };
    }
    return { state: this.flagText(event, { ...checked, lastPass: judgement }, judgement) };
  }

  /** Record a flag once per distinct rule set, not on every rolling check. */
  private flagText(event: JsonObject, state: TextState, judgement: Judgement): TextState {
    if (judgement.disposition !== 'flag') return state;
    const signature = judgement.rules.join(',');
    if (signature === state.lastFlag) return state;
    this.turn.decide(
      decisionOf('output_text', judgement, 'pass', { item_id: str(event, 'item_id') })
    );
    return { ...state, lastFlag: signature };
  }

  /**
   * End the response at a text hit: the message is closed with the text the
   * client already has, marked incomplete, and nothing after it is sent. A
   * fault fails the response instead.
   */
  private cutText(
    event: JsonObject,
    state: TextState,
    judgement: Judgement
  ): readonly JsonObject[] {
    const itemId = str(event, 'item_id') ?? '';
    const fault = judgement.disposition === 'fault';
    this.turn.decide(
      decisionOf('output_text', judgement, fault ? 'failed' : 'incomplete', { item_id: itemId })
    );
    if (fault) return this.turn.endFailed('gateway_evaluation_failed', judgement.reason);
    const index = this.turn.mapIndex(num(event, 'output_index'));
    const contentIndex = num(event, 'content_index') ?? 0;
    const part = { type: 'output_text', text: state.emitted, annotations: [] };
    const message = this.messages.get(itemId);
    const earlier = [...(message?.parts.entries() ?? [])]
      .filter(([i]) => i < contentIndex)
      .sort(([a], [b]) => a - b)
      .map(([, p]) => p);
    const item = {
      ...(message?.item ?? { type: 'message', id: itemId, role: 'assistant' }),
      status: 'incomplete',
      content: [...earlier, part],
    };
    this.turn.addOutput(item);
    const at = { item_id: itemId, output_index: index, content_index: contentIndex };
    return [
      this.turn.emit({
        type: 'response.output_text.done',
        ...at,
        text: state.emitted,
        logprobs: [],
      }),
      this.turn.emit({ type: 'response.content_part.done', ...at, part }),
      this.turn.emit({ type: 'response.output_item.done', output_index: index, item }),
      ...this.turn.endIncomplete(),
    ];
  }

  private setText(key: string, state: TextState): void {
    this.texts = new Map([...this.texts, [key, state]]);
  }

  private recordPart(event: JsonObject): void {
    const itemId = str(event, 'item_id');
    const part = obj(event, 'part');
    const message = itemId !== undefined ? this.messages.get(itemId) : undefined;
    if (!message || !part || itemId === undefined) return;
    const parts = new Map([...message.parts, [num(event, 'content_index') ?? 0, part]]);
    this.messages = new Map([...this.messages, [itemId, { ...message, parts }]]);
  }
}

function textKey(event: JsonObject): string {
  return `${str(event, 'item_id') ?? ''}:${num(event, 'content_index') ?? 0}`;
}

/** Leading deltas that may go out while `holdback` characters stay behind. */
export function releasable(
  pending: readonly JsonObject[],
  holdback: number
): { release: readonly JsonObject[]; keep: readonly JsonObject[]; chars: number } {
  let remaining = pending.reduce((sum, e) => sum + (str(e, 'delta') ?? '').length, 0);
  let count = 0;
  let chars = 0;
  for (const event of pending) {
    const length = (str(event, 'delta') ?? '').length;
    if (remaining - length < holdback) break;
    remaining -= length;
    chars += length;
    count += 1;
  }
  return { release: pending.slice(0, count), keep: pending.slice(count), chars };
}
