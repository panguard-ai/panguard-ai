/**
 * Agents Registry — persistent store of registered Guard agents
 * Agents Registry — 已註冊 Guard 代理的持久化儲存
 *
 * Stores agent records in a JSON file on disk and keeps an in-memory mirror
 * for fast lookup. Tokens are generated server-side and used by Guards to
 * authenticate every relay call.
 *
 * @module @panguard-ai/panguard-manager/agents-registry
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createLogger } from '@panguard-ai/core';
import type { AgentRecord, RegisterBody } from './types.js';

const logger = createLogger('panguard-manager:registry');

/** Constructor options for AgentsRegistry / AgentsRegistry 建構選項 */
export interface AgentsRegistryOptions {
  /** Absolute path to the JSON file backing the registry / 後備 JSON 檔案的絕對路徑 */
  readonly filePath: string;
}

/**
 * Persistent registry of Guard agents.
 *
 * Thread-safety: this class assumes single-process access. Writes go through
 * an atomic temp-file + rename to avoid torn JSON on crash.
 */
export class AgentsRegistry {
  private readonly filePath: string;
  private agents: Map<string, AgentRecord>;

  constructor(options: AgentsRegistryOptions) {
    if (!options.filePath) {
      throw new Error('filePath is required / filePath 為必要參數');
    }
    this.filePath = options.filePath;
    this.agents = new Map();
    this.loadFromDisk();
  }

  /** Load registry from disk; missing file is treated as empty / 從磁碟載入註冊資料；遺失檔案視為空 */
  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) {
      this.agents = new Map();
      return;
    }
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as { agents?: AgentRecord[] };
      const records = Array.isArray(parsed.agents) ? parsed.agents : [];
      this.agents = new Map(records.map((r) => [r.agent_id, r] as const));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Failed to load registry from ${this.filePath}: ${msg} — starting empty`);
      this.agents = new Map();
    }
  }

  /** Persist registry to disk atomically / 原子化地持久化註冊資料到磁碟 */
  private persistToDisk(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const payload = {
      version: 1,
      updated_at: new Date().toISOString(),
      agents: Array.from(this.agents.values()),
    };
    const tmpPath = `${this.filePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
    renameSync(tmpPath, this.filePath);
  }

  /** Register a new Guard agent and return its id + token / 註冊新 Guard 代理並返回 id + token */
  register(body: RegisterBody): { agent_id: string; token: string } {
    if (!body.hostname || !body.machine_id) {
      throw new Error('hostname and machine_id are required / hostname 與 machine_id 為必要參數');
    }

    // If a record for this machine_id already exists and is not revoked, reuse it
    // 如果該 machine_id 已存在且未撤銷，重用既有記錄
    const existing = Array.from(this.agents.values()).find(
      (a) => a.machine_id === body.machine_id && !a.revoked
    );
    if (existing) {
      return { agent_id: existing.agent_id, token: existing.token };
    }

    const agent_id = `agent_${randomBytes(8).toString('hex')}`;
    const token = randomBytes(32).toString('hex');
    const record: AgentRecord = {
      agent_id,
      token,
      hostname: body.hostname,
      os_type: body.os_type ?? 'unknown',
      panguard_version: body.panguard_version ?? 'unknown',
      machine_id: body.machine_id,
      registered_at: new Date().toISOString(),
      revoked: false,
    };
    this.agents.set(agent_id, record);
    this.persistToDisk();
    return { agent_id, token };
  }

  /** Lookup by agent_id; returns undefined if unknown or revoked / 依 agent_id 查詢；若未知或已撤銷則返回 undefined */
  findByAgentId(agent_id: string): AgentRecord | undefined {
    const record = this.agents.get(agent_id);
    if (!record || record.revoked) return undefined;
    return record;
  }

  /** Validate (agent_id, token) pair for an incoming relay call / 驗證進來 relay 呼叫的 (agent_id, token) 對 */
  validateToken(agent_id: string, token: string): boolean {
    const record = this.findByAgentId(agent_id);
    if (!record) return false;
    // Constant-time comparison via Buffer to avoid timing leaks
    // 用 Buffer 做常數時間比較，避免時序洩漏
    if (token.length !== record.token.length) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(record.token);
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
  }

  /** Mark an agent as revoked / 將代理標記為已撤銷 */
  revoke(agent_id: string): boolean {
    const record = this.agents.get(agent_id);
    if (!record) return false;
    this.agents.set(agent_id, { ...record, revoked: true });
    this.persistToDisk();
    return true;
  }

  /** Update last_seen timestamp / 更新 last_seen 時間戳 */
  touch(agent_id: string): void {
    const record = this.agents.get(agent_id);
    if (!record) return;
    this.agents.set(agent_id, { ...record, last_seen: new Date().toISOString() });
    // Best-effort persist; do not block hot path
    // 盡力持久化；不阻塞熱路徑
    try {
      this.persistToDisk();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.debug(`Failed to persist touch for ${agent_id}: ${msg}`);
    }
  }

  /** List all non-revoked agents / 列出所有未撤銷的代理 */
  list(): ReadonlyArray<AgentRecord> {
    return Array.from(this.agents.values()).filter((a) => !a.revoked);
  }

  /** List ALL agents including revoked (used for CLI inspection) / 列出所有代理含已撤銷（CLI 檢視用） */
  listAll(): ReadonlyArray<AgentRecord> {
    return Array.from(this.agents.values());
  }

  /** Total number of non-revoked agents / 未撤銷代理總數 */
  count(): number {
    return this.list().length;
  }

  /** Default registry file location given a data directory / 給定資料目錄的預設註冊檔案位置 */
  static defaultFilePath(dataDir: string): string {
    return join(dataDir, 'agents.json');
  }
}
