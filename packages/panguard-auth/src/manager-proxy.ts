/**
 * Manager proxy - forwards admin API requests to the Manager server.
 *
 * Uses node:http to make requests to the Manager's REST API.
 * The Manager URL defaults to http://127.0.0.1:8443 but can be
 * configured via MANAGER_URL environment variable.
 *
 * @module @panguard-ai/panguard-auth/manager-proxy
 */

import { request as httpRequest, type IncomingMessage as HttpIncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';

// ── Response Types ──────────────────────────────────────────────────

export interface ManagerEnvelopeOk<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ManagerEnvelopeError {
  readonly ok: false;
  readonly error: string;
}

export type ManagerEnvelope<T> = ManagerEnvelopeOk<T> | ManagerEnvelopeError;

export interface AgentListItem {
  readonly id: string;
  readonly hostname: string;
  readonly status: string;
  readonly ip?: string;
  readonly os?: string;
  readonly mode?: string;
  readonly eventsProcessed?: number;
  readonly threatsDetected?: number;
  readonly memoryUsageMB?: number;
  readonly lastSeen?: string;
}

export interface AgentListResponse {
  readonly agents: readonly AgentListItem[];
}

export interface AgentResponse {
  readonly agent: Record<string, unknown>;
}

export interface EventItem {
  readonly agentId: string;
  readonly agentHostname: string;
  readonly receivedAt: string;
  readonly event: Record<string, unknown>;
  readonly verdict: {
    readonly conclusion: string;
    readonly confidence: number;
    readonly action: string;
  };
}

export interface EventsResponse {
  readonly events: readonly EventItem[];
  readonly total: number;
}

export interface ThreatSummaryData {
  readonly totalThreats: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly suspiciousCount: number;
  readonly uniqueAttackers: number;
  readonly affectedAgents: number;
  readonly correlatedGroups: number;
}

export interface ManagerOverviewData {
  readonly totalAgents: number;
  readonly onlineAgents: number;
  readonly staleAgents: number;
  readonly offlineAgents: number;
  readonly agents: readonly Record<string, unknown>[];
  readonly threatSummary: ThreatSummaryData;
  readonly activePolicyVersion: number;
  readonly uptimeMs: number;
}

// ── Constants ───────────────────────────────────────────────────────

const DEFAULT_MANAGER_URL = 'http://127.0.0.1:8443';
const REQUEST_TIMEOUT_MS = 10_000;

// ── ManagerProxy Class ──────────────────────────────────────────────

/**
 * Proxies requests from the auth/serve server to the Manager server.
 *
 * All methods return an envelope response. On connection errors,
 * returns `{ ok: false, error: 'Manager service unavailable' }`.
 */
export class ManagerProxy {
  private readonly managerUrl: string;
  private readonly authToken: string;

  constructor(managerUrl?: string, authToken?: string) {
    this.managerUrl = (managerUrl ?? DEFAULT_MANAGER_URL).replace(/\/$/, '');
    this.authToken = authToken ?? '';
  }

  // ── Public API Methods ────────────────────────────────────────────

  /**
   * GET /api/overview - Manager dashboard overview.
   */
  async getOverview(): Promise<ManagerEnvelope<ManagerOverviewData>> {
    return this.proxyGet<ManagerOverviewData>('/api/overview');
  }

  /**
   * GET /api/agents - List all registered agents.
   *
   * The Manager returns `{ ok: true, data: agents[] }`.
   * We reshape it to `{ ok: true, data: { agents: [...] } }` so
   * the admin frontend can read `response.agents`.
   */
  async getAgents(): Promise<ManagerEnvelope<AgentListResponse>> {
    const result = await this.fetchFromManager<unknown>('/api/agents');
    if (!result.ok) {
      return result;
    }

    // Manager responds with { ok: true, data: <array of agents> }
    // Reshape for the admin frontend which expects { agents: [...] }
    const raw = result.data;
    const agents = Array.isArray(raw) ? raw : [];

    return {
      ok: true,
      data: { agents: agents as readonly AgentListItem[] },
    };
  }

  /**
   * GET /api/agents/:id - Get a single agent.
   */
  async getAgent(agentId: string): Promise<ManagerEnvelope<AgentResponse>> {
    const sanitizedId = encodeURIComponent(agentId);
    const result = await this.proxyGet<Record<string, unknown>>(`/api/agents/${sanitizedId}`);
    if (!result.ok) {
      return result;
    }
    return { ok: true, data: { agent: result.data } };
  }

  /**
   * GET /api/threats - Fetch events (threats) from the Manager.
   *
   * The Manager has /api/threats with `?since=<ISO>` parameter.
   * We adapt this to support `?limit=N&offset=N` for the admin frontend's
   * paginated event table.
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<ManagerEnvelope<EventsResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.since) {
      searchParams.set('since', params.since);
    }

    const path = searchParams.toString()
      ? `/api/threats?${searchParams.toString()}`
      : '/api/threats';

    const result = await this.fetchFromManager<unknown>(path);
    if (!result.ok) {
      return result;
    }

    // Manager returns { ok: true, data: AggregatedThreat[] }
    const rawThreats = Array.isArray(result.data) ? result.data : [];

    // Map AggregatedThreat to the EventItem shape the frontend expects
    const allEvents: EventItem[] = rawThreats.map(
      (t: Record<string, unknown>) => {
        const original = (t['originalThreat'] ?? {}) as Record<string, unknown>;
        const verdict = (original['verdict'] ?? {}) as Record<string, unknown>;
        const event = (original['event'] ?? {}) as Record<string, unknown>;

        return {
          agentId: String(t['sourceAgentId'] ?? ''),
          agentHostname: String(t['sourceHostname'] ?? ''),
          receivedAt: String(t['receivedAt'] ?? ''),
          event,
          verdict: {
            conclusion: String(verdict['conclusion'] ?? 'unknown'),
            confidence: Number(verdict['confidence'] ?? 0),
            action: String(verdict['action'] ?? ''),
          },
        };
      }
    );

    // Sort by receivedAt descending
    allEvents.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );

    const total = allEvents.length;
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 50;
    const paged = allEvents.slice(offset, offset + limit);

    return {
      ok: true,
      data: { events: paged, total },
    };
  }

  /**
   * GET /api/threats/summary - Threat summary for dashboard.
   */
  async getThreatSummary(): Promise<ManagerEnvelope<ThreatSummaryData>> {
    return this.proxyGet<ThreatSummaryData>('/api/threats/summary');
  }

  /**
   * Generic proxy pass-through for any Manager API path.
   * Used for routes we do not need to reshape.
   */
  async proxyPassthrough(path: string): Promise<ManagerEnvelope<unknown>> {
    return this.proxyGet<unknown>(path);
  }

  // ── Internal HTTP Client ──────────────────────────────────────────

  /**
   * Fetch a GET endpoint from the Manager, returning the envelope as-is.
   */
  private async proxyGet<T>(path: string): Promise<ManagerEnvelope<T>> {
    const result = await this.fetchFromManager<T>(path);
    return result;
  }

  /**
   * Low-level HTTP GET to the Manager server.
   * Extracts the `data` field from the Manager's `{ ok, data }` envelope.
   */
  private fetchFromManager<T>(path: string): Promise<ManagerEnvelope<T>> {
    return new Promise((resolve) => {
      const fullUrl = `${this.managerUrl}${path}`;
      let parsed: URL;
      try {
        parsed = new URL(fullUrl);
      } catch {
        resolve({ ok: false, error: `Invalid Manager URL: ${fullUrl}` });
        return;
      }

      const isHttps = parsed.protocol === 'https:';
      const doRequest = isHttps ? httpsRequest : httpRequest;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        },
        timeout: REQUEST_TIMEOUT_MS,
      };

      const req = doRequest(options, (incomingRes: HttpIncomingMessage) => {
        const chunks: Buffer[] = [];

        incomingRes.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        incomingRes.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;

            // If the Manager returned an error envelope, forward it
            if (parsed['ok'] === false) {
              resolve({
                ok: false,
                error: String(parsed['error'] ?? 'Manager returned an error'),
              });
              return;
            }

            // Extract `data` from the Manager's { ok: true, data: ... } envelope
            resolve({
              ok: true,
              data: parsed['data'] as T,
            });
          } catch {
            resolve({ ok: false, error: 'Invalid JSON response from Manager' });
          }
        });

        incomingRes.on('error', () => {
          resolve({ ok: false, error: 'Manager response stream error' });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Manager request timed out' });
      });

      req.on('error', (err: Error) => {
        // Connection refused, DNS failure, etc.
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
          resolve({ ok: false, error: 'Manager service unavailable' });
        } else {
          resolve({ ok: false, error: `Manager connection error: ${err.message}` });
        }
      });

      req.end();
    });
  }
}
