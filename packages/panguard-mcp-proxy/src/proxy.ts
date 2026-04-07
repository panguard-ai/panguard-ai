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

export class MCPProxy {
  private readonly config: ProxyConfig;
  private readonly evaluator: ProxyEvaluator;
  private client: Client | null = null;
  private server: Server | null = null;
  private readonly evalTimeout: number;
  private readonly failMode: 'open' | 'closed';

  constructor(config: ProxyConfig) {
    this.config = config;
    this.evaluator = new ProxyEvaluator();
    this.failMode = config.failMode ?? 'closed';
    this.evalTimeout = config.evalTimeout ?? 5000;
  }

  async start(): Promise<void> {
    // Load ATR rules
    const ruleCount = await this.evaluator.loadRules();
    process.stderr.write(`[panguard-proxy] Loaded ${ruleCount} ATR rules\n`);

    // Connect to upstream MCP server
    const upstreamTransport = new StdioClientTransport({
      command: this.config.upstreamCommand,
      args: [...this.config.upstreamArgs],
      stderr: 'pipe',
    });
    this.client = new Client(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: {} }
    );
    await this.client.connect(upstreamTransport);
    process.stderr.write(
      `[panguard-proxy] Connected to upstream: ${this.config.upstreamCommand}\n`
    );

    // Create proxy server facing the agent
    this.server = new Server(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.registerHandlers();

    // Connect to agent via stdio
    const agentTransport = new StdioServerTransport();
    await this.server.connect(agentTransport);
    process.stderr.write(
      `[panguard-proxy] Proxy active. ${ruleCount} rules protecting all tool calls.\n`
    );
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
