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
import { mkdirSync } from 'node:fs';
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
import {
  AuditChain,
  buildActor,
  newDecisionId,
  getAuditKey,
  type VerifyResult,
} from '@panguard-ai/panguard-guard/audit';

const VERDICT_LOG = join(homedir(), '.panguard-guard', 'proxy-verdicts.jsonl');

export interface ProxyConfig {
  /** Command to start the upstream MCP server */
  readonly upstreamCommand: string;
  /** Arguments for the upstream command */
  readonly upstreamArgs: readonly string[];
  /** Evaluation timeout in ms (default: 5000) */
  readonly evalTimeout?: number;
  /** Fail mode: 'closed' blocks on error (safer), 'open' allows on error (default for availability) */
  readonly failMode?: 'open' | 'closed';
  /** Stable session id for this proxy run (default: per-process unique). */
  readonly sessionId?: string;
  /** Agent id behind this proxy (default: PANGUARD_AGENT_ID env or 'mcp-agent'). */
  readonly agentId?: string;
}

/** The subset of ProxyEvaluator the proxy uses — injectable for testing. */
export interface ProxyEvaluatorLike {
  loadRules(): Promise<number>;
  evaluateToolCall(
    toolName: string,
    args: Record<string, unknown>,
    eventType?: string
  ): Promise<EvalResult>;
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
  /** Max background attempts to re-fetch the tool list after a listTools() failure. */
  private static readonly SCOPE_RETRY_MAX = 5;
  /** Base backoff (ms) for the exponential scope re-fetch retry (capped). */
  private static readonly SCOPE_RETRY_BASE_MS = 500;
  /** Ceiling (ms) for the exponential scope re-fetch backoff. */
  private static readonly SCOPE_RETRY_MAX_MS = 30_000;
  /**
   * One stdio session per proxy process. Defaults to a per-process unique id
   * (not the old hardcoded constant) so verdict lines from distinct runs are
   * distinguishable; overridable via config for correlation with an orchestrator.
   */
  private readonly sessionId: string;
  /** Agent id behind this proxy — written into every verdict line for attribution. */
  private readonly agentId: string;
  /** Upstream tool names = the Layer 0 capability scope (populated in start()). */
  private upstreamToolNames = new Set<string>();
  /**
   * True once listTools() succeeds (any count) → the scope is KNOWN. False means
   * the list has not been fetched or the fetch FAILED → scope unknown (degraded,
   * fail-open by tool name). A known-but-empty scope is resolved=true with an
   * empty set, which DENIES every call — not the same as unresolved.
   */
  private capabilityScopeResolved = false;
  /** One-shot throttle so the per-call degraded warning does not spam stderr. */
  private warnedScopeDegraded = false;
  /** Count of background scope re-fetch attempts made after a listTools() failure. */
  private scopeRetryAttempts = 0;
  /** True while a background scope re-fetch is in flight (prevents pile-up). */
  private scopeRetryInFlight = false;
  /** Tamper-evident chain over proxy-verdicts.jsonl (lazily keyed in connect()). */
  private chain: AuditChain | null = null;

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
    this.sessionId = config.sessionId ?? `mcp-proxy-${process.pid}-${Date.now().toString(36)}`;
    this.agentId = config.agentId ?? process.env['PANGUARD_AGENT_ID'] ?? 'mcp-agent';
    // Sync sub-ms pre-check (InlineGate.onAction) that reads riskStore: once a
    // session is escalated to 'high' it fast-blocks subsequent calls before the
    // async evaluator even runs. That escalation is FED by recordEvalVerdict()
    // (a real ATR deny -> riskStore.set high), so the session-risk loop is live.
    //
    // HONEST SCOPE (Community): the async behavioral brain — RiskAnalyzer.analyze
    // via guard.onSessionActivity — is NOT driven here; it needs a real
    // ContentDetector + per-session event feed and, more importantly, a real
    // ContainmentController to act on its verdicts (Community ships Noop). So the
    // detector is a deliberate no-op, not a forgotten wire: content detection is
    // the ATR engine (evaluateToolCall/evaluateToolResponse) and session
    // escalation is the sync riskStore path above. Wiring the behavioral brain +
    // active containment is a Pro-tier layer, tracked separately.
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
    await this.ensureChain();
    const ruleCount = await this.evaluator.loadRules();
    process.stderr.write(`[panguard-proxy] Loaded ${ruleCount} ATR rules\n`);

    this.client = new Client(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: {} }
    );
    await this.client.connect(upstreamTransport);
    process.stderr.write(`[panguard-proxy] Connected to upstream\n`);

    // Cache upstream tool names as the Layer 0 capability scope: an agent may
    // only call tools the upstream actually exposes. If the list can't be fetched
    // we do NOT latch a permanent fail-open: a bounded background retry re-tries
    // the fetch (so a transient failure self-heals) and, until it resolves, the
    // gate honors this.failMode — fail-CLOSED (the default) DENIES rather than
    // waving unknown-scope calls through. See resolveCapabilityScope + gateCheck.
    const resolved = await this.resolveCapabilityScope();
    if (!resolved) {
      // listTools failed → the Layer-0 capability scope is UNKNOWN (unresolved).
      // Loudly flag it (a silent pass was indistinguishable from a real allow in
      // logs) and start the background re-fetch so the scope can self-heal.
      process.stderr.write(
        `[panguard-proxy] WARNING: upstream listTools() failed — Layer-0 capability-scope enforcement is DEGRADED. ` +
          `Fail-mode='${this.failMode}': ` +
          (this.failMode === 'closed'
            ? 'tool calls are DENIED until the scope resolves.'
            : 'tools are allowed by name (fail-open opt-in) until the scope resolves.') +
          ' A bounded background retry is re-fetching the tool list.\n'
      );
      this.scheduleScopeRetry();
    }

    this.server = new Server(
      { name: 'panguard-mcp-proxy', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.registerHandlers();
    await this.server.connect(agentTransport);
    // With 0 rules, Layer A catches nothing — say so plainly instead of the
    // misleading "0 rules protecting all tool calls" (the loud warning was
    // already emitted by evaluator.loadRules()).
    if (ruleCount === 0) {
      process.stderr.write(
        '[panguard-proxy] Proxy active in DEGRADED mode — 0 ATR rules loaded; only the Guard blocklist is enforced.\n'
      );
    } else {
      process.stderr.write(
        `[panguard-proxy] Proxy active. ${ruleCount} rules protecting all tool calls.\n`
      );
    }
    // MCP has no user-in-the-loop channel, so an 'ask' verdict cannot pause for
    // approval — it is logged and forwarded, and surfaced on stderr as
    // "FLAGGED (ask)". Document it here so operators know flagged calls still run.
    process.stderr.write(
      "[panguard-proxy] Note: 'ask' verdicts are logged-and-forwarded (no MCP user prompt); watch stderr for FLAGGED (ask) lines.\n"
    );
  }

  /**
   * Fetch the upstream tool list and cache it as the Layer 0 capability scope.
   * Returns true on success (scope RESOLVED, regardless of count — a successful
   * empty list is a known-empty scope that DENIES every call), false if
   * listTools() throws (scope left UNRESOLVED). Never throws. Shared by connect()
   * and the background retry so both paths update the scope identically.
   */
  private async resolveCapabilityScope(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const upstream = await this.client.listTools();
      this.upstreamToolNames = new Set(upstream.tools.map((t) => t.name));
      this.capabilityScopeResolved = true;
      // Reset the degraded-warning throttle so a later re-failure warns again.
      this.warnedScopeDegraded = false;
      return true;
    } catch {
      this.capabilityScopeResolved = false;
      return false;
    }
  }

  /**
   * Schedule a bounded, exponential-backoff background re-fetch of the tool list
   * so a transient listTools() failure self-heals instead of latching a degraded
   * capability scope for the whole proxy lifetime. Fire-and-forget (never blocks a
   * tool call); at most one attempt is in flight at a time and total attempts are
   * capped by SCOPE_RETRY_MAX.
   */
  private scheduleScopeRetry(): void {
    if (this.capabilityScopeResolved || this.scopeRetryInFlight) return;
    if (this.scopeRetryAttempts >= MCPProxy.SCOPE_RETRY_MAX) return;
    this.scopeRetryInFlight = true;
    const attempt = this.scopeRetryAttempts;
    const delay = Math.min(
      MCPProxy.SCOPE_RETRY_BASE_MS * 2 ** attempt,
      MCPProxy.SCOPE_RETRY_MAX_MS
    );
    const timer = setTimeout(() => {
      void this.runScopeRetry();
    }, delay);
    // Do not keep the event loop alive solely for this retry timer.
    if (typeof timer.unref === 'function') timer.unref();
  }

  /** Execute one background scope re-fetch attempt, then reschedule if needed. */
  private async runScopeRetry(): Promise<void> {
    this.scopeRetryAttempts += 1;
    const ok = await this.resolveCapabilityScope();
    this.scopeRetryInFlight = false;
    if (ok) {
      process.stderr.write(
        `[panguard-proxy] Layer-0 capability scope RESOLVED after retry (${this.upstreamToolNames.size} tools); tool-scope enforcement restored.\n`
      );
      return;
    }
    // Still failing — back off and try again until the attempt cap is reached.
    this.scheduleScopeRetry();
  }

  /**
   * Run the Layer 1 inline gate for a tool call (sync, sub-ms): build the
   * ActionContext and apply the gate. Capabilities default to the upstream tool
   * set (Layer 0 scope); when the scope is unresolved the fallback honors
   * this.failMode — fail-CLOSED (default) DENIES, fail-open allows by name.
   * Exposed so the wiring is testable.
   */
  gateCheck(name: string, toolArgs: Record<string, unknown>): McpGateVerdict {
    // Decide the capability set from whether the scope is RESOLVED, never from
    // its size — that was the bug: a successful-but-empty list looked identical
    // to "no list yet" and fell through to a silent allow.
    if (this.capabilityScopeResolved) {
      // Known scope. If it is empty, the upstream exposes no tools, so every call
      // is out-of-scope and applyMcpGate DENIES it. No fallback, no silent allow.
      return applyMcpGate(this.guard, {
        name,
        args: toolArgs,
        sessionId: this.sessionId,
        agentId: this.agentId,
        capabilities: this.upstreamToolNames,
      });
    }

    // Unknown scope (listTools failed / not yet run). Nudge a bounded background
    // re-fetch so a transient failure does not permanently disable tool-scope,
    // then decide THIS call by failMode — never an unconditional fail-open.
    this.scheduleScopeRetry();
    if (!this.warnedScopeDegraded) {
      this.warnedScopeDegraded = true;
      process.stderr.write(
        `[panguard-proxy] scope-degraded: capability scope unresolved (fail-${this.failMode}) — ` +
          (this.failMode === 'closed'
            ? `tools (starting with '${name}') are DENIED until the upstream tool list resolves.`
            : `tools (starting with '${name}') pass Layer-0 by name fallback (fail-open opt-in). Content rules still evaluate them; tool-scope is NOT enforced until the upstream tool list is available.`) +
          '\n'
      );
    }

    if (this.failMode === 'closed') {
      // Fail-CLOSED default (security-first, mirrors the evaluator): an unknown
      // capability scope must not wave calls through. Deny until it resolves.
      return {
        allow: false,
        reason:
          'Capability scope is unresolved (upstream tool list unavailable); denying under fail-closed policy. ' +
          'Set PANGUARD_PROXY_FAIL_MODE=open to allow tools by name while degraded.',
        escalated: false,
      };
    }

    // Fail-open opt-in: allow by name to preserve availability. This gap is
    // capability-scope only; the inline content gate below still runs.
    return applyMcpGate(this.guard, {
      name,
      args: toolArgs,
      sessionId: this.sessionId,
      agentId: this.agentId,
      capabilities: new Set([name]),
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
    // Normalize confidence to a 0-100 scale before the threshold check: the ATR
    // engine reports match confidence on a 0-1 scale, so comparing it raw to a
    // 0-100 threshold (95) made this escalation NEVER fire for a real deny.
    const conf = verdict.confidence <= 1 ? verdict.confidence * 100 : verdict.confidence;
    if (verdict.outcome === 'deny' && conf >= MCPProxy.ESCALATE_CONFIDENCE) {
      this.riskStore.set(this.sessionId, { level: 'high', reasons: [...verdict.matchedRules] });
    }
  }

  /**
   * Lazily build the tamper-evident verdict chain. The audit key is resolved
   * keychain-first (file fallback); getAuditKey never throws. Chain construction
   * is best-effort — if it fails, verdict logging silently no-ops rather than
   * bricking the proxy (fail-open on audit).
   */
  private async ensureChain(): Promise<void> {
    if (this.chain) return;
    try {
      mkdirSync(join(homedir(), '.panguard-guard'), { recursive: true });
      const key = await getAuditKey();
      // Head-anchor defaults to `<VERDICT_LOG>.head` (per-file) so it never
      // collides with the events / manifest chain anchors in the same dataDir.
      this.chain = new AuditChain(VERDICT_LOG, { key });
    } catch (err) {
      process.stderr.write(
        `[panguard-audit] proxy chain init failed (verdict logging disabled): ${
          err instanceof Error ? err.message : String(err)
        }\n`
      );
    }
  }

  /**
   * Append a verdict to the tamper-evident chain. The REAL sessionId/agentId are
   * carried in actor.agent (the old code dropped them), plus a decisionId and the
   * lifted matched rule id. AuditChain.append is fail-open so a broken audit file
   * never blocks a tool call.
   */
  private logVerdict(entry: {
    phase: string;
    tool: string;
    outcome: string;
    reason: string;
    rules?: readonly string[];
    ms?: number;
  }): void {
    if (!this.chain) return;
    const rules = entry.rules ?? [];
    this.chain.append({
      phase: entry.phase,
      tool: entry.tool,
      outcome: entry.outcome,
      reason: entry.reason,
      rules: [...rules],
      ms: entry.ms,
      ts: new Date().toISOString(),
      decisionId: newDecisionId(),
      actor: buildActor({
        platform: 'mcp-proxy',
        sessionId: this.sessionId,
        agentId: this.agentId,
      }),
      ...(rules.length > 0 ? { rule: { id: rules[0]! } } : {}),
    });
  }

  /** Verify the durable proxy-verdicts chain end-to-end. */
  async verify(): Promise<VerifyResult | null> {
    await this.ensureChain();
    return this.chain ? this.chain.verify() : null;
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
        this.logVerdict({
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

      // PreToolUse: evaluate the call as a 'tool_call' event so the full
      // tool_call rule family (shell injection, SSRF, SQLi, credential theft,
      // privilege escalation, tool poisoning) runs — an MCP tool call carries
      // exactly those payloads in its args. Via the engine's mcp-over-tool
      // exception this is a superset of the mcp_exchange rules, so nothing that
      // 'mcp_exchange' caught is lost. (The old default silently skipped ~44
      // tool_call rules on every MCP call.)
      let preResult;
      try {
        preResult = await Promise.race([
          this.evaluator.evaluateToolCall(name, toolArgs, 'tool_call'),
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
          adviseOnly: false,
        };
      }

      this.logVerdict({
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

      // An 'ask' verdict cannot pause for a human here — MCP has no
      // user-in-the-loop channel — so the call is forwarded. Surface it loudly
      // on stderr so a flagged-but-not-denied call is never silent (the journal
      // entry above is easy to miss). Semantics are unchanged: logged + forwarded.
      if (preResult.outcome === 'ask') {
        process.stderr.write(`[panguard-proxy] FLAGGED (ask): ${name} — ${preResult.reason}\n`);
      }

      // Forward to upstream
      const result = await client.callTool({ name, arguments: toolArgs });

      // PostToolUse: evaluate the response. Serialize EVERY content block —
      // text AND non-text (resource URIs, embedded resource.text/blob, image
      // data) — so a malicious server cannot smuggle an exfil/injection payload
      // through a resource/image block that a text-only extractor would silently
      // drop. Cap is 256KB (not 10KB) so padding the payload past a tiny cap no
      // longer evades the scan.
      const responseText = (result.content as Array<Record<string, unknown>>)
        ?.map((c) => {
          if (typeof c['text'] === 'string') return c['text'];
          try {
            return JSON.stringify(c);
          } catch {
            return '';
          }
        })
        .join('\n')
        .slice(0, 262144);

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
            adviseOnly: false,
          };
        }

        this.logVerdict({
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

        // Same as the pre-call path: an 'ask' response verdict is logged +
        // forwarded (no human-in-the-loop in MCP) — surface it loudly so it is
        // never silent.
        if (postResult.outcome === 'ask') {
          process.stderr.write(
            `[panguard-proxy] FLAGGED response (ask): ${name} — ${postResult.reason}\n`
          );
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
