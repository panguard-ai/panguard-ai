/**
 * MCP Proxy — sits between AI agent and MCP server
 *
 * Intercepts every tool call, evaluates with ATR rules,
 * and only forwards if the call is safe.
 *
 * Architecture:
 *   Agent ←stdio→ [Proxy Server] ←stdio→ [Upstream MCP Server]
 *                       ↓
 *                  ATR Evaluation
 *
 * @module @panguard-ai/panguard-mcp-proxy/proxy
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ProxyEvaluator } from './evaluator.js';
import type { EvalResult } from './evaluator.js';
import {
  GuardGate,
  InlineGate,
  RiskAnalyzer,
  InMemoryRiskStore,
  NoopContainmentController,
  applyMcpGate,
} from '@panguard-ai/containment';
import type { McpGateVerdict } from '@panguard-ai/containment';

const VERDICT_LOG = join(homedir(), '.panguard-guard', 'proxy-verdicts.jsonl');

function logVerdict(entry: Record<string, unknown>): void {
  try {
    mkdirSync(join(homedir(), '.panguard-guard'), { recursive: true });
    appendFileSync(VERDICT_LOG, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
  } catch {
    /* best-effort logging */
  }
}

export interface ProxyConfig {
  /** Command to start the upstream MCP server */
  readonly upstreamCommand: string;
  /** Arguments for the upstream command */
  readonly upstreamArgs: readonly string[];
  /** Evaluation timeout in ms (default: 5000) */
  readonly evalTimeout?: number;
  /** Fail mode: 'closed' blocks on error (safer), 'open' allows on error (default for availability) */
  readonly failMode?: 'open' | 'closed';
}

/** The subset of ProxyEvaluator the proxy uses — injectable for testing. */
export interface ProxyEvaluatorLike {
  loadRules(): Promise<number>;
  evaluateToolCall(toolName: string, args: Record<string, unknown>): Promise<EvalResult>;
  evaluateToolResponse(toolName: string, response: string): Promise<EvalResult>;
}

export class MCPProxy {
  private readonly config: ProxyConfig;
  private readonly evaluator: ProxyEvaluatorLike;
  private client: Client | null = null;
  private server: Server | null = null;
  private readonly evalTimeout: number;
  private readonly failMode: 'open' | 'closed';
  /** Layer 1 inline gate. The ProxyEvaluator stays the Layer 2 brain. */
  private readonly guard: GuardGate;
  /** Session risk: the brain (evaluator verdicts) writes, the inline gate reads. */
  private readonly riskStore: InMemoryRiskStore;
  /** Confidence at/above which an evaluator deny escalates the whole session. */
  private static readonly ESCALATE_CONFIDENCE = 95;
  /** One stdio session per proxy process. */
  private readonly sessionId = 'mcp-proxy-session';
  /** Upstream tool names = the Layer 0 capability scope (populated in start()). */
  private upstreamToolNames = new Set<string>();

  constructor(config: ProxyConfig, deps: { evaluator?: ProxyEvaluatorLike } = {}) {
    this.config = config;
    this.evaluator = deps.evaluator ?? new ProxyEvaluator();
    // Fail-CLOSED by default (security-first): if the async evaluator errors or
    // times out, DENY the call rather than forward it unprotected. A security
    // tool whose default failure mode is "allow" can be defeated by simply making
    // it fail (slow/ReDoS payload). Rules are awaited in connect() BEFORE the
    // proxy accepts any call, so there is no cold-start window where a timeout is
    // expected — a timeout means a genuine problem, where denying is correct.
    // Availability-first deployments can opt back to fail-open via config or the
    // PANGUARD_PROXY_FAIL_MODE=open env var.
    const envFailMode = process.env['PANGUARD_PROXY_FAIL_MODE'];
    this.failMode =
      config.failMode ??
      (envFailMode === 'open' || envFailMode === 'closed' ? envFailMode : 'closed');
    this.evalTimeout = config.evalTimeout ?? 5000;
    // Sync sub-ms pre-check. Runs in front of the async evaluator so the worst
    // payloads (and any session the brain flags) are blocked instantly — and,
    // with fail-closed as the default, an unavailable async evaluator denies.
    this.riskStore = new InMemoryRiskStore();
    this.guard = new GuardGate({
      gate: new InlineGate(),
      analyzer: new RiskAnalyzer({ detect: () => [] }),
      riskStore: this.riskStore,
      containment: new NoopContainmentController(),
    });
  }

  async start(): Promise<void> {
    const upstreamTransport = new StdioClientTransport({
      command: this.config.upstreamCommand,
      args: [...this.config.upstreamArgs],
      stderr: 'pipe',
    });
    const agentTransport = new StdioServerTransport();
    await this.connect(upstreamTransport, agentTransport);
  }

  /**
   * Wire the proxy between an upstream (client) transport and an agent (server)
   * transport. Extracted from start() so tests can drive the full flow over
   * in-memory transports without spawning a process.
   */
  async connect(upstreamTransport: Transport, agentTransport: Transport): Promise<void> {
    const ruleCount = await this.evaluator.loadRules();
    process.stderr.write(`[panguard-proxy] Loaded ${ruleCount} ATR rules\n`);

    this.client = new Client(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: {} }
    );
    await this.client.connect(upstreamTransport);
    process.stderr.write(`[panguard-proxy] Connected to upstream\n`);

    // Cache upstream tool names as the Layer 0 capability scope: an agent may
    // only call tools the upstream actually exposes. Best-effort — if the list
    // can't be fetched, the gate falls back to allowing the requested tool.
    try {
      const upstream = await this.client.listTools();
      this.upstreamToolNames = new Set(upstream.tools.map((t) => t.name));
    } catch {
      /* leave empty; per-call fallback allows the requested tool */
    }

    this.server = new Server(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.registerHandlers();
    await this.server.connect(agentTransport);
    process.stderr.write(
      `[panguard-proxy] Proxy active. ${ruleCount} rules protecting all tool calls.\n`
    );
  }

  /**
   * Run the Layer 1 inline gate for a tool call (sync, sub-ms): build the
   * ActionContext and apply the gate. Capabilities default to the upstream tool
   * set (Layer 0 scope); when unknown, the requested tool is allowed so the gate
   * only adds block-on-sight + risk gating. Exposed so the wiring is testable.
   */
  gateCheck(name: string, toolArgs: Record<string, unknown>): McpGateVerdict {
    return applyMcpGate(this.guard, {
      name,
      args: toolArgs,
      sessionId: this.sessionId,
      agentId: 'mcp-agent',
      capabilities: this.upstreamToolNames.size > 0 ? this.upstreamToolNames : new Set([name]),
    });
  }

  /**
   * Feed an async-evaluator verdict back into session risk — the dual-path
   * loop. A high-confidence deny escalates the session so the inline gate
   * fast-blocks subsequent calls without re-evaluating. The threshold is
   * deliberately high (ATR precision is ~99.6%) so a single false positive
   * cannot lock out a legitimate agent.
   */
  recordEvalVerdict(verdict: {
    outcome: string;
    confidence: number;
    matchedRules: readonly string[];
  }): void {
    if (verdict.outcome === 'deny' && verdict.confidence >= MCPProxy.ESCALATE_CONFIDENCE) {
      this.riskStore.set(this.sessionId, { level: 'high', reasons: [...verdict.matchedRules] });
    }
  }

  private registerHandlers(): void {
    const client = this.client!;
    const server = this.server!;

    // ── listTools: forward upstream tools ──
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const result = await client.listTools();
      return result;
    });

    // ── callTool: intercept + evaluate + forward ──
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolArgs = (args ?? {}) as Record<string, unknown>;

      // Layer 1 inline gate (sync, sub-ms) — runs BEFORE the async evaluator so
      // the worst payloads (and any session the brain has flagged) are blocked
      // instantly, even if the async evaluator times out fail-open.
      const gateVerdict = this.gateCheck(name, toolArgs);
      if (!gateVerdict.allow) {
        logVerdict({
          phase: 'pre-gate',
          tool: name,
          outcome: 'deny',
          reason: gateVerdict.reason ?? '',
        });
        process.stderr.write(
          `[panguard-proxy] BLOCKED (inline gate): ${name} — ${gateVerdict.reason}\n`
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: `[BLOCKED by PanGuard] Tool call "${name}" was blocked.\nReason: ${gateVerdict.reason}`,
            },
          ],
        };
      }

      // PreToolUse: evaluate the call
      let preResult;
      try {
        preResult = await Promise.race([
          this.evaluator.evaluateToolCall(name, toolArgs),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), this.evalTimeout)
          ),
        ]);
      } catch {
        // Timeout or error → respect failMode
        const fallbackOutcome = this.failMode === 'closed' ? ('deny' as const) : ('allow' as const);
        preResult = {
          outcome: fallbackOutcome,
          reason: `Evaluation error (fail-${this.failMode})`,
          matchedRules: [] as string[],
          confidence: 0,
          durationMs: this.evalTimeout,
        };
      }

      logVerdict({
        phase: 'pre',
        tool: name,
        outcome: preResult.outcome,
        reason: preResult.reason,
        rules: preResult.matchedRules,
        ms: preResult.durationMs,
      });

      // Close the dual-path loop: a high-confidence deny escalates the session.
      this.recordEvalVerdict(preResult);

      if (preResult.outcome === 'deny') {
        process.stderr.write(`[panguard-proxy] BLOCKED: ${name} — ${preResult.reason}\n`);
        return {
          content: [
            {
              type: 'text' as const,
              text: `[BLOCKED by PanGuard] Tool call "${name}" was blocked.\nReason: ${preResult.reason}\nMatched rules: ${preResult.matchedRules.join(', ')}`,
            },
          ],
        };
      }

      // Forward to upstream
      const result = await client.callTool({ name, arguments: toolArgs });

      // PostToolUse: evaluate the response
      const responseText = (result.content as Array<{ type: string; text?: string }>)
        ?.map((c) => c.text ?? '')
        .join('\n')
        .slice(0, 10000); // Cap at 10KB for evaluation

      if (responseText) {
        let postResult;
        try {
          postResult = await Promise.race([
            this.evaluator.evaluateToolResponse(name, responseText),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), this.evalTimeout)
            ),
          ]);
        } catch {
          const fallbackOutcome =
            this.failMode === 'closed' ? ('deny' as const) : ('allow' as const);
          postResult = {
            outcome: fallbackOutcome,
            reason: `Post-eval error (fail-${this.failMode})`,
            matchedRules: [] as string[],
            confidence: 0,
            durationMs: this.evalTimeout,
          };
        }

        logVerdict({
          phase: 'post',
          tool: name,
          outcome: postResult.outcome,
          reason: postResult.reason,
          rules: postResult.matchedRules,
          ms: postResult.durationMs,
        });

        this.recordEvalVerdict(postResult);

        if (postResult.outcome === 'deny') {
          process.stderr.write(
            `[panguard-proxy] BLOCKED response: ${name} — ${postResult.reason}\n`
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `[BLOCKED by PanGuard] Response from "${name}" contained a security threat.\nReason: ${postResult.reason}`,
              },
            ],
          };
        }
      }

      return result;
    });

    // ── Pass-through handlers for non-tool requests ──
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return await client.listResources();
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await client.readResource(request.params);
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return await client.listPrompts();
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await client.getPrompt(request.params);
    });
  }
}
