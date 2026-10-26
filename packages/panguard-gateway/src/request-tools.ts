/**
 * R1 and R2: the request's tool definitions and the scope the model may call.
 *
 * A poisoned definition is removed from `tools` and from an `allowed_tools`
 * choice (or the request is refused, in reject mode). What remains, narrowed by
 * `allowed_tools` or `none`, is the declared scope that checkpoint S2 holds every
 * function_call to: the spec says a server must enforce allowed_tools, and the
 * gateway enforces it again.
 *
 * @module @panguard-ai/panguard-gateway/request-tools
 */

import { toolDefinitionEvent } from './atr-events.js';
import { decisionOf, judge, ruleList, type Decision } from './decision.js';
import { faultRejection, policyRejection, type Rejection } from './errors.js';
import { isObject, list, objects, str, type JsonObject } from './json.js';
import type { InspectContext } from './request-inspector.js';

export interface ToolScope {
  /** Fields to overwrite on the forwarded request; empty when nothing changed. */
  readonly patch: JsonObject;
  readonly declared: ReadonlySet<string>;
}

export interface ToolInspection {
  readonly value: ToolScope;
  readonly decisions: readonly Decision[];
  readonly rejection?: Rejection | undefined;
}

const isFunctionTool = (tool: JsonObject): boolean => str(tool, 'type') === 'function';

export async function inspectTools(body: JsonObject, ctx: InspectContext): Promise<ToolInspection> {
  const tools = list(body, 'tools') ?? [];
  const functions = objects(tools).filter(isFunctionTool);
  const now = new Date().toISOString();
  const judged = await Promise.all(
    functions.map(async (tool) => ({
      name: str(tool, 'name') ?? '',
      judgement: judge(
        await ctx.evaluator.evaluate('tool-definitions', toolDefinitionEvent(tool, now)),
        ctx.policy.failMode
      ),
    }))
  );

  const rejectMode = ctx.policy.requestMode === 'reject';
  const decisions = judged.map(({ name, judgement }) =>
    decisionOf(
      'tool_definition',
      judgement,
      judgement.disposition === 'fault'
        ? 'reject'
        : judgement.disposition === 'deny'
          ? rejectMode
            ? 'reject'
            : 'strip_tool'
          : 'pass',
      { tool: name }
    )
  );
  const failed = judged.find((j) => j.judgement.disposition === 'fault');
  if (failed) {
    return {
      value: emptyScope(),
      decisions,
      rejection: faultRejection(`could not evaluate tool definition '${failed.name}'`, 'tools'),
    };
  }
  const denied = judged.filter((j) => j.judgement.disposition === 'deny');
  const first = denied[0];
  if (first && rejectMode) {
    return {
      value: emptyScope(),
      decisions,
      rejection: policyRejection(
        `tool definition '${first.name}' blocked: ${first.judgement.reason} (${ruleList(first.judgement.rules)})`,
        'tools'
      ),
    };
  }

  const stripped = new Set(denied.map((d) => d.name));
  const choice = body['tool_choice'];
  const forced =
    isObject(choice) && str(choice, 'type') === 'function' ? str(choice, 'name') : undefined;
  if (forced !== undefined && stripped.has(forced)) {
    return {
      value: emptyScope(),
      decisions,
      rejection: policyRejection(
        `tool_choice forces '${forced}', whose definition was blocked`,
        'tool_choice'
      ),
    };
  }

  const keptTools = tools.filter(
    (t) => !(isObject(t) && isFunctionTool(t) && stripped.has(str(t, 'name') ?? ''))
  );
  const keptChoice = narrowChoice(choice, stripped);
  const patch: JsonObject =
    stripped.size === 0
      ? {}
      : { tools: keptTools, ...(choice !== undefined ? { tool_choice: keptChoice } : {}) };
  return { value: { patch, declared: declaredScope(keptTools, keptChoice) }, decisions };
}

function emptyScope(): ToolScope {
  return { patch: {}, declared: new Set() };
}

/** Drop stripped tools from an allowed_tools choice; none left means no calls. */
function narrowChoice(choice: unknown, stripped: ReadonlySet<string>): unknown {
  if (!isObject(choice) || str(choice, 'type') !== 'allowed_tools') return choice;
  const allowed = (list(choice, 'tools') ?? []).filter(
    (t) => !(isObject(t) && stripped.has(str(t, 'name') ?? ''))
  );
  return allowed.length > 0 ? { ...choice, tools: allowed } : 'none';
}

function declaredScope(tools: readonly unknown[], choice: unknown): ReadonlySet<string> {
  if (choice === 'none') return new Set();
  const names = objects(tools)
    .filter(isFunctionTool)
    .map((t) => str(t, 'name'))
    .filter((n): n is string => n !== undefined);
  if (isObject(choice) && str(choice, 'type') === 'allowed_tools') {
    const allowed = new Set(objects(list(choice, 'tools')).map((t) => str(t, 'name')));
    return new Set(names.filter((n) => allowed.has(n)));
  }
  return new Set(names);
}
