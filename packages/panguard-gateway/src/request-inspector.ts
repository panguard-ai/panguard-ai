/**
 * Request-side checkpoints (design §2.1), run before anything reaches the
 * provider:
 *   R1 tools[] definitions      tool-definition engine; a hit strips the tool
 *   R2 tool_choice / allowed    the declared tool scope for checkpoint S2
 *   R3 function_call_output     indirect injection; a hit rewrites the output (E)
 *   R4 role=user messages       direct injection; a deny answers 400 (D)
 *   R5 system/developer         not scanned as user input, counted
 *   R6 previous_response_id     ledger: synthetic outputs for withheld calls
 *   R7 opaque content           counted as not inspected
 *
 * @module @panguard-ai/panguard-gateway/request-inspector
 */

import {
  canonicalArgs,
  functionCallOutputEvent,
  userMessageEvent,
  type ResolvedCall,
} from './atr-events.js';
import type { GatewayPolicy } from './config.js';
import {
  GATEWAY_RULES,
  decisionOf,
  gatewayJudgement,
  judge,
  ruleList,
  type Decision,
  type Judgement,
} from './decision.js';
import { faultRejection, invalidRequest, policyRejection, type Rejection } from './errors.js';
import type { Evaluator } from './evaluator-pool.js';
import {
  inputItems,
  isFunctionCall,
  isFunctionCallOutput,
  isMessage,
  isOpaqueItem,
  isOtherToolOutput,
  isUnknownInputItem,
  textOf,
} from './items.js';
import { isObject, str, stringifyJson, type JsonObject } from './json.js';
import { sha256, type LedgerCall, type VerdictLedger } from './ledger.js';
import { inspectTools } from './request-tools.js';
import { NOTHING_UNINSPECTED, type NotInspected } from './verdict-field.js';

export interface InspectContext {
  readonly evaluator: Evaluator;
  readonly ledger: VerdictLedger;
  readonly policy: GatewayPolicy;
}

export type RequestInspection =
  | {
      readonly kind: 'forward';
      readonly body: JsonObject;
      /** Function names the model may call this turn (checkpoint S2). */
      readonly declared: ReadonlySet<string>;
      readonly decisions: readonly Decision[];
      readonly notInspected: NotInspected;
    }
  | {
      readonly kind: 'reject';
      readonly rejection: Rejection;
      readonly decisions: readonly Decision[];
    };

interface Step<T> {
  readonly value: T;
  readonly decisions: readonly Decision[];
  readonly rejection?: Rejection | undefined;
}

const timestamp = (): string => new Date().toISOString();

export async function inspectRequest(
  body: JsonObject,
  ctx: InspectContext
): Promise<RequestInspection> {
  const shape = checkShape(body);
  if (shape) return { kind: 'reject', rejection: shape, decisions: [] };

  const tools = await inspectTools(body, ctx);
  if (tools.rejection) return reject(tools.rejection, tools.decisions);

  const items = inputItems(body['input']);
  const previousId = str(body, 'previous_response_id');
  const outputs = await inspectToolOutputs(items, previousId, ctx);
  if (outputs.rejection)
    return reject(outputs.rejection, [...tools.decisions, ...outputs.decisions]);

  const users = await inspectUserMessages(items, ctx);
  const synthetic =
    previousId !== undefined ? synthesizeWithheld(previousId, items, ctx) : none([]);
  const decisions = [
    ...tools.decisions,
    ...synthetic.decisions,
    ...outputs.decisions,
    ...users.decisions,
  ];
  if (users.rejection) return reject(users.rejection, decisions);

  const inputChanged = synthetic.value.length > 0 || outputs.value.changed;
  const forwarded: JsonObject = {
    ...body,
    ...tools.value.patch,
    ...(inputChanged ? { input: [...synthetic.value, ...outputs.value.items] } : {}),
  };
  return {
    kind: 'forward',
    body: forwarded,
    declared: tools.value.declared,
    decisions,
    notInspected: countNotInspected(items, body),
  };
}

function reject(rejection: Rejection, decisions: readonly Decision[]): RequestInspection {
  return { kind: 'reject', rejection, decisions };
}

function none<T>(value: T): Step<T> {
  return { value, decisions: [] };
}

/** Shapes the gateway cannot inspect are refused rather than forwarded unread. */
function checkShape(body: JsonObject): Rejection | undefined {
  if (body['background'] === true) {
    // Background results are fetched through provider routes the gateway does not see.
    return invalidRequest(
      'unsupported_parameter',
      'background responses are not supported through the PanGuard gateway',
      'background'
    );
  }
  const input = body['input'];
  if (input !== undefined && typeof input !== 'string' && !Array.isArray(input)) {
    return invalidRequest('invalid_input', 'input must be a string or an array of items', 'input');
  }
  const tools = body['tools'];
  if (tools !== undefined && !Array.isArray(tools)) {
    return invalidRequest('invalid_tools', 'tools must be an array', 'tools');
  }
  if (body['previous_response_id'] !== undefined && body['previous_response_id'] !== null) {
    if (typeof body['previous_response_id'] !== 'string') {
      return invalidRequest(
        'invalid_previous_response_id',
        'previous_response_id must be a string',
        'previous_response_id'
      );
    }
  }
  return undefined;
}

/**
 * R6: the provider stored the previous response with the calls the client never
 * saw and waits for their results. Answer each withheld call it was not sent.
 */
function synthesizeWithheld(
  previousId: string,
  items: readonly unknown[],
  ctx: InspectContext
): Step<readonly JsonObject[]> {
  const withheld = ctx.ledger.withheldCalls(previousId);
  const answered = new Set(
    items
      .filter(isObject)
      .filter(isFunctionCallOutput)
      .map((i) => str(i, 'call_id'))
  );
  const missing = withheld.filter((call) => !answered.has(call.call_id));
  return {
    value: missing.map((call) => ({
      type: 'function_call_output',
      call_id: call.call_id,
      output: `[PanGuard] call blocked: ${call.reason} (${ruleList(call.rules)})`,
    })),
    decisions: missing.map((call) =>
      decisionOf(
        'previous_response',
        {
          disposition: 'flag',
          reason: call.reason,
          rules: call.rules,
          durationMs: 0,
          coverage: 'full',
        },
        'synthesize_output',
        { call_id: call.call_id, tool: call.name }
      )
    ),
  };
}

interface OutputRewrite {
  readonly items: readonly unknown[];
  readonly changed: boolean;
}

/** R3 with the binding check: every tool output must answer a call the gateway released. */
async function inspectToolOutputs(
  items: readonly unknown[],
  previousId: string | undefined,
  ctx: InspectContext
): Promise<Step<OutputRewrite>> {
  const inline = new Map(
    items
      .filter(isObject)
      .filter(isFunctionCall)
      .map((i) => [str(i, 'call_id') ?? '', i] as const)
  );
  const chain = previousId !== undefined ? ctx.ledger.chainCalls(previousId) : undefined;

  const checked = await Promise.all(
    items.map(
      async (item): Promise<CheckedItem> =>
        !isObject(item)
          ? { item, decisions: [] }
          : isFunctionCallOutput(item)
            ? inspectToolOutput(item, inline, chain, ctx)
            : isOtherToolOutput(item)
              ? inspectOtherOutput(item, ctx)
              : { item, decisions: [] }
    )
  );
  return {
    value: {
      items: checked.map((c) => c.item),
      changed: checked.some((c, i) => c.item !== items[i]),
    },
    decisions: checked.flatMap((c) => c.decisions),
    rejection: checked.find((c) => c.rejection !== undefined)?.rejection,
  };
}

interface CheckedItem {
  readonly item: unknown;
  readonly decisions: readonly Decision[];
  readonly rejection?: Rejection;
}

async function inspectToolOutput(
  item: JsonObject,
  inline: ReadonlyMap<string, JsonObject>,
  chain: { readonly ids: ReadonlySet<string>; readonly complete: boolean } | undefined,
  ctx: InspectContext
): Promise<CheckedItem> {
  const callId = str(item, 'call_id') ?? '';
  const recorded = ctx.ledger.call(callId);
  const inlineCall = inline.get(callId);
  const subject = { call_id: callId, tool: recorded?.name ?? str(inlineCall, 'name') };

  const binding = bindingJudgement(recorded, inlineCall, chain, ctx.policy);
  const bindingDecision = binding
    ? decisionOf(
        'call_binding',
        binding,
        binding.disposition === 'deny' ? 'reject' : 'pass',
        subject
      )
    : undefined;
  if (binding?.disposition === 'deny') {
    return {
      item,
      decisions: [bindingDecision!],
      rejection: policyRejection(`${binding.reason} (call_id ${callId})`, 'input'),
    };
  }

  const { text } = textOf(item['output']);
  const call = resolveCall(recorded, inlineCall);
  const judgement = judge(
    await ctx.evaluator.evaluate('runtime', functionCallOutputEvent(call, text, timestamp())),
    ctx.policy.failMode
  );
  const prior = bindingDecision ? [bindingDecision] : [];
  if (judgement.disposition === 'fault') {
    return {
      item,
      decisions: [...prior, decisionOf('tool_output', judgement, 'reject', subject)],
      rejection: faultRejection(`could not evaluate the tool output for call ${callId}`, 'input'),
    };
  }
  if (judgement.disposition !== 'deny') {
    return { item, decisions: [...prior, decisionOf('tool_output', judgement, 'pass', subject)] };
  }
  if (ctx.policy.requestMode === 'reject') {
    return {
      item,
      decisions: [...prior, decisionOf('tool_output', judgement, 'reject', subject)],
      rejection: policyRejection(
        `tool output for call ${callId} blocked: ${judgement.reason} (${ruleList(judgement.rules)})`,
        'input'
      ),
    };
  }
  // E: keep call_id so the provider's call/result pairing holds; the model learns why.
  return {
    item: { ...item, output: `[PanGuard] tool output withheld: ${ruleList(judgement.rules)}` },
    decisions: [...prior, decisionOf('tool_output', judgement, 'rewrite_output', subject)],
  };
}

/**
 * A non-function tool result (no ledger record to bind or resolve against).
 * Its shape is the provider's, so a hit rejects the request instead of
 * rewriting a structure the gateway does not know.
 */
async function inspectOtherOutput(item: JsonObject, ctx: InspectContext): Promise<CheckedItem> {
  const output = item['output'];
  const text =
    typeof output === 'string' || Array.isArray(output)
      ? textOf(output).text
      : stringifyJson(output);
  const subject = { call_id: str(item, 'call_id'), tool: str(item, 'type') };
  const judgement =
    text === undefined
      ? gatewayJudgement(
          'deny',
          GATEWAY_RULES.uninspectable,
          'tool output too deeply nested to inspect'
        )
      : judge(
          await ctx.evaluator.evaluate(
            'runtime',
            functionCallOutputEvent(undefined, text, timestamp())
          ),
          ctx.policy.failMode
        );
  if (judgement.disposition === 'fault') {
    return {
      item,
      decisions: [decisionOf('tool_output', judgement, 'reject', subject)],
      rejection: faultRejection(`could not evaluate a ${subject.tool ?? 'tool'} output`, 'input'),
    };
  }
  if (judgement.disposition === 'deny') {
    return {
      item,
      decisions: [decisionOf('tool_output', judgement, 'reject', subject)],
      rejection: policyRejection(
        `${subject.tool ?? 'tool'} output blocked: ${judgement.reason} (${ruleList(judgement.rules)})`,
        'input'
      ),
    };
  }
  return { item, decisions: [decisionOf('tool_output', judgement, 'pass', subject)] };
}

function bindingJudgement(
  recorded: LedgerCall | undefined,
  inlineCall: JsonObject | undefined,
  chain: { readonly ids: ReadonlySet<string>; readonly complete: boolean } | undefined,
  policy: GatewayPolicy
): Judgement | undefined {
  const soft = policy.binding === 'reject' ? 'deny' : 'flag';
  if (recorded?.status === 'withheld') {
    return gatewayJudgement(
      'deny',
      GATEWAY_RULES.withheldCallOutput,
      'tool output for a call the gateway withheld from the client'
    );
  }
  if (recorded) {
    if (!inlineCall) return undefined;
    const sameName = str(inlineCall, 'name') === recorded.name;
    const args = canonicalArgs(str(inlineCall, 'arguments') ?? '').canonical;
    const sameArgs =
      recorded.arguments !== undefined
        ? recorded.arguments === args
        : recorded.arguments_sha256 === sha256(args);
    if (sameName && sameArgs) return undefined;
    return gatewayJudgement(
      soft,
      GATEWAY_RULES.historyMismatch,
      'the function_call in the request differs from the call the gateway released'
    );
  }
  if (inlineCall) {
    return gatewayJudgement(
      soft,
      GATEWAY_RULES.unboundCallOutput,
      'tool output answers a call the gateway has no record of'
    );
  }
  if (chain?.complete) {
    return gatewayJudgement(
      'deny',
      GATEWAY_RULES.forgedCallOutput,
      'tool output answers no call in the recorded response chain'
    );
  }
  return gatewayJudgement(
    soft,
    GATEWAY_RULES.unboundCallOutput,
    'tool output answers a call the gateway cannot verify'
  );
}

function resolveCall(
  recorded: LedgerCall | undefined,
  inlineCall: JsonObject | undefined
): ResolvedCall | undefined {
  const inlineArgs = str(inlineCall, 'arguments');
  if (recorded) {
    const args = recorded.arguments ?? inlineArgs;
    return { name: recorded.name, args: args !== undefined ? canonicalArgs(args) : undefined };
  }
  if (inlineCall) {
    return {
      name: str(inlineCall, 'name') ?? '',
      args: inlineArgs !== undefined ? canonicalArgs(inlineArgs) : undefined,
    };
  }
  return undefined;
}

/** R4: user text. Only role=user: system and developer text is configuration, not attack surface. */
async function inspectUserMessages(
  items: readonly unknown[],
  ctx: InspectContext
): Promise<Step<null>> {
  const messages = items
    .filter(isObject)
    .filter((i) => isMessage(i) && str(i, 'role') === 'user')
    .map((i) => ({ item: i, text: textOf(i['content']).text }))
    .filter((m) => m.text !== '');
  const judged = await Promise.all(
    messages.map(async (m) => ({
      ...m,
      judgement: judge(
        await ctx.evaluator.evaluate('runtime', userMessageEvent(m.text, timestamp())),
        ctx.policy.failMode
      ),
    }))
  );
  const decisions = judged.map((m) =>
    decisionOf(
      'user_message',
      m.judgement,
      m.judgement.disposition === 'deny' || m.judgement.disposition === 'fault' ? 'reject' : 'pass',
      { item_id: str(m.item, 'id') }
    )
  );
  const denied = judged.find((m) => m.judgement.disposition === 'deny');
  if (denied) {
    return {
      value: null,
      decisions,
      rejection: policyRejection(
        `user message blocked: ${denied.judgement.reason} (${ruleList(denied.judgement.rules)})`,
        'input'
      ),
    };
  }
  const failed = judged.find((m) => m.judgement.disposition === 'fault');
  if (failed) {
    return {
      value: null,
      decisions,
      rejection: faultRejection('could not evaluate a user message', 'input'),
    };
  }
  return { value: null, decisions };
}

/** R5 and R7: what the gateway saw and did not read. */
function countNotInspected(items: readonly unknown[], body: JsonObject): NotInspected {
  const objectsOnly = items.filter(isObject);
  const scanned = objectsOnly.filter(
    (i) => (isMessage(i) && str(i, 'role') === 'user') || isFunctionCallOutput(i)
  );
  const developer = objectsOnly.filter(
    (i) => isMessage(i) && (str(i, 'role') === 'system' || str(i, 'role') === 'developer')
  ).length;
  return {
    ...NOTHING_UNINSPECTED,
    content_parts: scanned.reduce(
      (sum, i) => sum + textOf(isFunctionCallOutput(i) ? i['output'] : i['content']).opaqueParts,
      0
    ),
    opaque_items: objectsOnly.filter(isOpaqueItem).length,
    developer_messages: developer + (typeof body['instructions'] === 'string' ? 1 : 0),
    unknown_items: objectsOnly.filter(isUnknownInputItem).length,
  };
}
