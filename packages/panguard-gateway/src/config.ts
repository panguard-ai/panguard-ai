/**
 * Gateway configuration: defaults, validation, and the environment reader the
 * CLI uses.
 *
 * @module @panguard-ai/panguard-gateway/config
 */

import { z } from 'zod';
import { DEFAULT_AUDIT_LOG } from './audit.js';
import { DEFAULT_LEDGER, type LedgerOptions } from './ledger.js';
import { DEFAULT_WINDOWS, ENGINE_MAX_EVAL_LENGTH, type WindowOptions } from './windows.js';
import type { FailMode } from './decision.js';
import type { Lane } from './worker/protocol.js';

/**
 * How a blocked function_call reaches the client.
 *   refusal    (A): a refusal message takes the call's place; the response
 *                   completes and the agent loop keeps going.
 *   incomplete (B): the response ends there as `incomplete`, reason
 *                   `content_filter`, which tells the client to stop.
 * Text the model already streamed can only be cut, so a text block is always B.
 */
export type BlockStyle = 'refusal' | 'incomplete';

export interface TextPolicy {
  /** Characters between rolling checks of streamed text. */
  readonly window: number;
  /** Characters held back from the client until a check has covered them. */
  readonly holdback: number;
  /** Characters of trailing text each check reads. */
  readonly tail: number;
}

export interface GatewayPolicy {
  readonly failMode: FailMode;
  readonly blockStyle: BlockStyle;
  /**
   * Request-side hit on a tool definition or tool output: `rewrite` strips the
   * tool / replaces the output (E) and forwards; `reject` answers 400 (D).
   * A hit on a user message is always a 400.
   */
  readonly requestMode: 'rewrite' | 'reject';
  /**
   * A tool output for a call the gateway has no record of (history from before
   * the gateway, another instance, a restart): `flag` records and forwards it,
   * `reject` answers 400. Outputs for a call the gateway withheld, or for a
   * call absent from a fully recorded chain, are always rejected.
   */
  readonly binding: 'flag' | 'reject';
  readonly text: TextPolicy;
}

export interface GatewayConfig {
  /** Upstream Open Responses base URL including its version path, e.g. https://host/v1. */
  readonly upstream: string;
  readonly host: string;
  /** 0 picks a free port. */
  readonly port: number;
  readonly lane: Lane;
  readonly policy: GatewayPolicy;
  readonly evaluation: {
    readonly workers: number;
    readonly timeoutMs: number;
    readonly windows: WindowOptions;
    readonly blocklistPath?: string;
  };
  readonly ledger: LedgerOptions;
  /** AuditChain log; null turns the out-of-band record off. */
  readonly auditLog: string | null;
  /** HMAC key for the audit chain; default resolves the machine's audit key. */
  readonly auditKey?: Buffer;
  readonly maxBodyBytes: number;
  /** Request headers forwarded upstream besides the built-in list. */
  readonly forwardHeaders: readonly string[];
}

export const DEFAULT_POLICY: GatewayPolicy = {
  failMode: 'closed',
  blockStyle: 'refusal',
  requestMode: 'rewrite',
  binding: 'flag',
  text: { window: 256, holdback: 0, tail: 4_096 },
};

const windowsSchema = z
  .object({
    size: z.number().int().min(1_000).max(ENGINE_MAX_EVAL_LENGTH),
    overlap: z.number().int().min(0),
    maxChars: z.number().int().min(ENGINE_MAX_EVAL_LENGTH),
  })
  .refine((w) => w.overlap < w.size, { message: 'overlap must be smaller than size' });

const configSchema = z.object({
  upstream: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//.test(u), { message: 'upstream must be an http(s) URL' }),
  host: z.string().min(1),
  port: z.number().int().min(0).max(65_535),
  lane: z.enum(['hunt', 'alert', 'enforce']),
  policy: z.object({
    failMode: z.enum(['open', 'closed']),
    blockStyle: z.enum(['refusal', 'incomplete']),
    requestMode: z.enum(['rewrite', 'reject']),
    binding: z.enum(['flag', 'reject']),
    text: z.object({
      window: z.number().int().min(1),
      holdback: z.number().int().min(0),
      tail: z.number().int().min(64).max(ENGINE_MAX_EVAL_LENGTH),
    }),
  }),
  evaluation: z.object({
    workers: z.number().int().min(1).max(64),
    timeoutMs: z.number().int().min(10),
    windows: windowsSchema,
    blocklistPath: z.string().optional(),
  }),
  ledger: z.object({
    ttlMs: z.number().int().min(1_000),
    maxResponses: z.number().int().min(1),
    storeArguments: z.boolean(),
  }),
  auditLog: z.string().min(1).nullable(),
  auditKey: z.instanceof(Buffer).optional(),
  maxBodyBytes: z.number().int().min(1_024),
  forwardHeaders: z.array(z.string().min(1)),
});

export type GatewayConfigInput = Pick<GatewayConfig, 'upstream'> &
  Partial<Omit<GatewayConfig, 'upstream' | 'policy' | 'evaluation' | 'ledger'>> & {
    readonly policy?: Partial<Omit<GatewayPolicy, 'text'>> & {
      readonly text?: Partial<TextPolicy>;
    };
    readonly evaluation?: Partial<GatewayConfig['evaluation']>;
    readonly ledger?: Partial<LedgerOptions>;
  };

/** Fill defaults and validate. Throws with every problem listed. */
export function resolveConfig(input: GatewayConfigInput): GatewayConfig {
  const candidate = {
    upstream: input.upstream.replace(/\/+$/, ''),
    host: input.host ?? '127.0.0.1',
    port: input.port ?? 8790,
    lane: input.lane ?? 'hunt',
    policy: {
      ...DEFAULT_POLICY,
      ...input.policy,
      text: { ...DEFAULT_POLICY.text, ...input.policy?.text },
    },
    evaluation: {
      workers: 1,
      timeoutMs: 2_000,
      windows: DEFAULT_WINDOWS,
      ...input.evaluation,
    },
    ledger: { ...DEFAULT_LEDGER, ...input.ledger },
    auditLog: input.auditLog === undefined ? DEFAULT_AUDIT_LOG : input.auditLog,
    ...(input.auditKey !== undefined ? { auditKey: input.auditKey } : {}),
    maxBodyBytes: input.maxBodyBytes ?? 20 * 1024 * 1024,
    forwardHeaders: input.forwardHeaders ?? [],
  };
  const parsed = configSchema.safeParse(candidate);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`
    );
    throw new Error(`Invalid gateway configuration:\n  ${problems.join('\n  ')}`);
  }
  return parsed.data as GatewayConfig;
}

const ENV = 'PANGUARD_GATEWAY_';

function envNumber(env: NodeJS.ProcessEnv, key: string): number | undefined {
  const raw = env[ENV + key];
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${ENV}${key} must be a number, got '${raw}'`);
  return value;
}

function envString(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = env[ENV + key];
  return raw === undefined || raw === '' ? undefined : raw;
}

function envEnum<T extends string>(
  env: NodeJS.ProcessEnv,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const raw = envString(env, key);
  if (raw === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error(`${ENV}${key} must be one of ${allowed.join(', ')}, got '${raw}'`);
  }
  return raw as T;
}

/** Read PANGUARD_GATEWAY_* variables. Only UPSTREAM is required. */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const upstream = envString(env, 'UPSTREAM');
  if (!upstream) {
    throw new Error(`${ENV}UPSTREAM is required (the provider's Open Responses base URL)`);
  }
  const audit = envString(env, 'AUDIT_LOG');
  const timeoutMs = envNumber(env, 'EVAL_TIMEOUT_MS');
  const workers = envNumber(env, 'WORKERS');
  const blocklistPath = envString(env, 'BLOCKLIST');
  const failMode = envEnum(env, 'FAIL_MODE', ['open', 'closed'] as const);
  const blockStyle = envEnum(env, 'BLOCK_STYLE', ['refusal', 'incomplete'] as const);
  const requestMode = envEnum(env, 'REQUEST_MODE', ['rewrite', 'reject'] as const);
  const binding = envEnum(env, 'BINDING', ['flag', 'reject'] as const);
  const holdback = envNumber(env, 'TEXT_HOLDBACK');
  const window = envNumber(env, 'TEXT_WINDOW');
  const host = envString(env, 'HOST');
  const port = envNumber(env, 'PORT');
  const lane = envEnum(env, 'LANE', ['hunt', 'alert', 'enforce'] as const);
  const headers = envString(env, 'FORWARD_HEADERS');
  return resolveConfig({
    upstream,
    ...(host !== undefined ? { host } : {}),
    ...(port !== undefined ? { port } : {}),
    ...(lane !== undefined ? { lane } : {}),
    policy: {
      ...(failMode !== undefined ? { failMode } : {}),
      ...(blockStyle !== undefined ? { blockStyle } : {}),
      ...(requestMode !== undefined ? { requestMode } : {}),
      ...(binding !== undefined ? { binding } : {}),
      text: {
        ...(holdback !== undefined ? { holdback } : {}),
        ...(window !== undefined ? { window } : {}),
      },
    },
    evaluation: {
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      ...(workers !== undefined ? { workers } : {}),
      ...(blocklistPath !== undefined ? { blocklistPath } : {}),
    },
    ...(audit !== undefined ? { auditLog: audit === 'off' ? null : audit } : {}),
    ...(headers !== undefined
      ? { forwardHeaders: headers.split(',').map((h) => h.trim().toLowerCase()) }
      : {}),
  });
}
