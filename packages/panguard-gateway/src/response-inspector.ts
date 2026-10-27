/**
 * Non-streaming responses: the same checks as the stream, run on `output[]`.
 * Each function_call is checkpoint S4 and each assistant message S7. Nothing
 * has reached the client yet, so a text hit can also be withheld whole.
 *
 * @module @panguard-ai/panguard-gateway/response-inspector
 */

import { canonicalArgs, hostedReceiptEvent } from './atr-events.js';
import {
  callRefusalText,
  checkFunctionCall,
  checkText,
  refusalMessage,
  textRefusalText,
} from './call-check.js';
import { GATEWAY_RULES, decisionOf, judge, type Decision, type Judgement } from './decision.js';
import { isFunctionCall, isHostedToolReceipt, isMessage, textOf } from './items.js';
import { list, objects, str, type JsonObject } from './json.js';
import type { CallRecordInput } from './ledger.js';
import type { TurnContext, TurnOutcome } from './turn-processor.js';
import { VERDICT_FIELD, verdictField } from './verdict-field.js';

type Stop =
  | { readonly status: 'incomplete' }
  | { readonly status: 'failed'; readonly code: string; readonly message: string };

interface ItemResult {
  readonly kept: readonly JsonObject[];
  readonly decisions: readonly Decision[];
  readonly calls: readonly CallRecordInput[];
  readonly stop?: Stop;
}

export async function inspectResponseBody(
  response: JsonObject,
  ctx: TurnContext
): Promise<{ readonly body: JsonObject; readonly outcome: TurnOutcome }> {
  const items = objects(list(response, 'output'));
  let kept: readonly JsonObject[] = [];
  let decisions: readonly Decision[] = [];
  let calls: readonly CallRecordInput[] = [];
  let stop: Stop | undefined;
  for (const item of items) {
    if (stop) {
      if (isFunctionCall(item)) calls = [...calls, undelivered(item)];
      continue;
    }
    const result = await inspectItem(item, ctx);
    kept = [...kept, ...result.kept];
    decisions = [...decisions, ...result.decisions];
    calls = [...calls, ...result.calls];
    stop = result.stop;
  }
  const verdict = verdictField(
    [...ctx.requestDecisions, ...decisions],
    {
      ...ctx.notInspected,
      // Only the provider's own items: the gateway's refusal messages are not model output.
      unscanned_output_parts:
        ctx.notInspected.unscanned_output_parts +
        unscannedParts(kept.filter((k) => items.includes(k))),
    },
    ctx.evaluatedWith
  );
  const body: JsonObject = {
    ...response,
    output: kept,
    ...(stop?.status === 'incomplete'
      ? {
          status: 'incomplete',
          incomplete_details: { reason: 'content_filter' },
          completed_at: null,
        }
      : {}),
    ...(stop?.status === 'failed'
      ? {
          status: 'failed',
          error: { code: stop.code, message: stop.message },
          completed_at: null,
        }
      : {}),
    [VERDICT_FIELD]: verdict,
  };
  return {
    body,
    outcome: {
      responseId: str(response, 'id'),
      previousResponseId: str(response, 'previous_response_id'),
      calls,
      decisions,
    },
  };
}

async function inspectItem(item: JsonObject, ctx: TurnContext): Promise<ItemResult> {
  if (isFunctionCall(item)) return inspectCall(item, ctx);
  if (isMessage(item) && str(item, 'role') === 'assistant') return inspectMessage(item, ctx);
  if (isHostedToolReceipt(item)) return inspectReceipt(item, ctx);
  return { kept: [item], decisions: [], calls: [] };
}

async function inspectCall(item: JsonObject, ctx: TurnContext): Promise<ItemResult> {
  const name = str(item, 'name') ?? '';
  const callId = str(item, 'call_id') ?? '';
  const judgement = await checkFunctionCall(
    name,
    str(item, 'arguments') ?? '',
    ctx.declared,
    ctx.evaluator,
    ctx.policy
  );
  const subject = { call_id: callId, item_id: str(item, 'id'), tool: name };
  if (judgement.disposition === 'allow' || judgement.disposition === 'flag') {
    const decision = decisionOf('function_call', judgement, 'pass', subject);
    return {
      kept: [item],
      decisions: [decision],
      calls: [record(item, 'released', decision, judgement)],
    };
  }
  if (judgement.disposition === 'fault') {
    const decision = decisionOf('function_call', judgement, 'failed', subject);
    return {
      kept: [],
      decisions: [decision],
      calls: [record(item, 'withheld', decision, judgement)],
      stop: failedStop(judgement),
    };
  }
  const refusal = ctx.policy.blockStyle === 'refusal';
  const decision = decisionOf(
    'function_call',
    judgement,
    refusal ? 'refusal' : 'incomplete',
    subject
  );
  return {
    kept: refusal ? [refusalMessage(callRefusalText(name, judgement))] : [],
    decisions: [decision],
    calls: [record(item, 'withheld', decision, judgement)],
    ...(refusal ? {} : { stop: { status: 'incomplete' } as const }),
  };
}

async function inspectMessage(item: JsonObject, ctx: TurnContext): Promise<ItemResult> {
  const { text } = textOf(item['content']);
  if (text === '') return { kept: [item], decisions: [], calls: [] };
  const judgement = await checkText(text, ctx.evaluator, ctx.policy);
  const subject = { item_id: str(item, 'id') };
  if (judgement.disposition === 'allow' || judgement.disposition === 'flag') {
    return {
      kept: [item],
      decisions: [decisionOf('output_text', judgement, 'pass', subject)],
      calls: [],
    };
  }
  if (judgement.disposition === 'fault') {
    return {
      kept: [],
      decisions: [decisionOf('output_text', judgement, 'failed', subject)],
      calls: [],
      stop: failedStop(judgement),
    };
  }
  const refusal = ctx.policy.blockStyle === 'refusal';
  return {
    kept: refusal ? [refusalMessage(textRefusalText(judgement))] : [],
    decisions: [decisionOf('output_text', judgement, refusal ? 'refusal' : 'incomplete', subject)],
    calls: [],
    ...(refusal ? {} : { stop: { status: 'incomplete' } as const }),
  };
}

/** S9: the provider already ran the tool; scan the receipt and record, never block. */
async function inspectReceipt(item: JsonObject, ctx: TurnContext): Promise<ItemResult> {
  const judgement = judge(
    await ctx.evaluator.evaluate('runtime', hostedReceiptEvent(item, new Date().toISOString())),
    ctx.policy.failMode
  );
  const recorded: Judgement =
    judgement.disposition === 'allow'
      ? judgement
      : {
          ...judgement,
          disposition: 'flag',
          reason: `hosted tool already ran: ${judgement.reason}`,
        };
  return {
    kept: [item],
    decisions: [
      decisionOf('hosted_tool_receipt', recorded, 'pass', {
        item_id: str(item, 'id'),
        tool: str(item, 'type'),
      }),
    ],
    calls: [],
  };
}

/** Model refusals and reasoning items: relayed, not scanned (design S8). */
function unscannedParts(items: readonly JsonObject[]): number {
  return items.reduce((sum, item) => {
    if (str(item, 'type') === 'reasoning') return sum + 1;
    const content = isMessage(item) ? list(item, 'content') : undefined;
    return sum + objects(content).filter((p) => str(p, 'type') === 'refusal').length;
  }, 0);
}

function failedStop(judgement: Judgement): Stop {
  return {
    status: 'failed',
    code: 'gateway_evaluation_failed',
    message: `[PanGuard] ${judgement.reason}`,
  };
}

function record(
  item: JsonObject,
  status: CallRecordInput['status'],
  decision: Decision,
  judgement: Judgement
): CallRecordInput {
  return {
    call_id: str(item, 'call_id') ?? '',
    item_id: str(item, 'id'),
    name: str(item, 'name') ?? '',
    canonicalArguments: canonicalArgs(str(item, 'arguments') ?? '').canonical,
    status,
    decision_id: decision.decision_id,
    rules: judgement.rules,
    reason: judgement.reason,
  };
}

function undelivered(item: JsonObject): CallRecordInput {
  return {
    call_id: str(item, 'call_id') ?? '',
    item_id: str(item, 'id'),
    name: str(item, 'name') ?? '',
    canonicalArguments: canonicalArgs(str(item, 'arguments') ?? '').canonical,
    status: 'withheld',
    decision_id: undefined,
    rules: [GATEWAY_RULES.notDelivered],
    reason: 'not delivered: the response was cut before this call',
  };
}
