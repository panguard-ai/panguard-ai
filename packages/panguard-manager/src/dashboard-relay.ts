/**
 * Dashboard Relay Server - Proxies dashboard connections between agents and clients
 * Dashboard Relay Server - 在 agent 和客戶端之間代理 dashboard 連接
 *
 * URL routing:
 *   /api/dashboard/relay/{agentId} - Agent upstream connections (Guard -> Manager)
 *   /api/dashboard/view/{agentId}  - Client downstream connections (Browser -> Manager)
 *
 * When an agent sends an event, it is broadcast to all subscribed clients.
 * When a client sends a command, it is forwarded to the target agent.
 *
 * Uses Node.js built-in http module with native RFC 6455 WebSocket handshake.
 *
 * @module @panguard-ai/manager/dashboard-relay
 */

import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-manager:dashboard-relay');

/** WebSocket magic GUID per RFC 6455 / RFC 6455 WebSocket 魔術 GUID */
const WS_MAGIC_GUID = '258EAFA5-E914-47DA-95CA-5AB5DC11E65B';

/** Maximum clients per agent / 每個 agent 的最大客戶端數 */
const MAX_CLIENTS_PER_AGENT = 50;

export interface DashboardRelayConfig {
  /** Require auth for relay connections / 要求 relay 連接認證 */
  readonly requireAuth?: boolean;
}

/** Tracked connection metadata / 追蹤的連接中繼資料 */
interface TrackedConnection {
  readonly socket: Socket;
  readonly agentId: string;
  readonly connectedAt: number;
}

/**
 * Dashboard relay server -- proxies dashboard connections between agents and clients
 * Dashboard relay server -- 在 agent 和客戶端之間代理 dashboard 連接
 */
export class DashboardRelay extends EventEmitter {
  /** Map of agentId -> upstream agent WebSocket connection / agentId -> 上游 agent WebSocket 連接 */
  private readonly agentConnections: Map<string, TrackedConnection> = new Map();
  /** Map of agentId -> Set of downstream client connections / agentId -> 下游客戶端連接集合 */
  private readonly clientConnections: Map<string, Set<TrackedConnection>> = new Map();
  /** Configuration / 配置 */
  private readonly config: DashboardRelayConfig;

  constructor(config?: DashboardRelayConfig) {
    super();
    this.config = config ?? {};

    logger.info(
      `Dashboard relay initialized (requireAuth: ${this.config.requireAuth ?? false}) / ` +
        `Dashboard relay 已初始化`
    );
  }

  /**
   * Handle WebSocket upgrade for relay endpoint / 處理 relay 端點的 WebSocket 升級
   *
   * Routes based on URL path:
   *   /api/dashboard/relay/{agentId} -> agent connection
   *   /api/dashboard/view/{agentId}  -> client connection
   */
  handleUpgrade(req: IncomingMessage, socket: Socket, _head: Buffer): void {
    const url = req.url ?? '';
    const agentRelayMatch = url.match(/^\/api\/dashboard\/relay\/([^/?]+)/);
    const clientViewMatch = url.match(/^\/api\/dashboard\/view\/([^/?]+)/);

    if (agentRelayMatch) {
      const agentId = agentRelayMatch[1]!;
      this.handleAgentUpgrade(req, socket, agentId);
      return;
    }

    if (clientViewMatch) {
      const agentId = clientViewMatch[1]!;
      this.handleClientUpgrade(req, socket, agentId);
      return;
    }

    // Unknown path -> reject / 未知路徑 -> 拒絕
    logger.warn(`Rejected relay upgrade for unknown path: ${url} / 拒絕未知路徑的 relay 升級`);
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }

  /**
   * Get connected agent IDs / 取得已連接的 agent ID 列表
   */
  getConnectedAgents(): string[] {
    return Array.from(this.agentConnections.keys());
  }

  /**
   * Get client count for an agent / 取得 agent 的客戶端數量
   */
  getClientCount(agentId: string): number {
    const clients = this.clientConnections.get(agentId);
    return clients ? clients.size : 0;
  }

  /**
   * Disconnect all connections / 斷開所有連接
   */
  disconnectAll(): void {
    // Close all agent connections / 關閉所有 agent 連接
    for (const [agentId, conn] of this.agentConnections) {
      try {
        conn.socket.destroy();
      } catch {
        /* ignore */
      }
      this.agentConnections.delete(agentId);
    }

    // Close all client connections / 關閉所有客戶端連接
    for (const [agentId, clients] of this.clientConnections) {
      for (const client of clients) {
        try {
          client.socket.destroy();
        } catch {
          /* ignore */
        }
      }
      this.clientConnections.delete(agentId);
    }

    logger.info('All relay connections disconnected / 所有 relay 連接已斷開');
  }

  // ---------------------------------------------------------------------------
  // Agent connection handling / Agent 連接處理
  // ---------------------------------------------------------------------------

  /** Handle agent WebSocket upgrade / 處理 agent WebSocket 升級 */
  private handleAgentUpgrade(
    req: IncomingMessage,
    socket: Socket,
    agentId: string
  ): void {
    // Validate auth if required / 若需要則驗證認證
    if (this.config.requireAuth) {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        logger.warn(
          `Agent relay auth failed for ${agentId} / Agent relay 認證失敗`
        );
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    // Complete WebSocket handshake / 完成 WebSocket 交握
    if (!this.completeHandshake(req, socket)) return;

    // If agent already connected, close old connection / 若 agent 已連接，關閉舊連接
    const existing = this.agentConnections.get(agentId);
    if (existing) {
      logger.info(`Replacing existing agent connection for ${agentId} / 替換現有 agent 連接`);
      try {
        existing.socket.destroy();
      } catch {
        /* ignore */
      }
    }

    const conn: TrackedConnection = {
      socket,
      agentId,
      connectedAt: Date.now(),
    };

    this.agentConnections.set(agentId, conn);
    this.emit('agent:connected', agentId);

    logger.info(
      `Agent ${agentId} connected to dashboard relay / ` +
        `Agent ${agentId} 已連接到 dashboard relay`
    );

    // Handle incoming data from agent (events to forward to clients)
    // 處理從 agent 收到的資料（轉發給客戶端的事件）
    socket.on('data', (data: Buffer) => {
      this.handleAgentData(agentId, socket, data);
    });

    socket.on('end', () => {
      this.handleAgentDisconnect(agentId, socket);
    });

    socket.on('close', () => {
      this.handleAgentDisconnect(agentId, socket);
    });

    socket.on('error', (err: Error) => {
      logger.warn(
        `Agent ${agentId} relay socket error: ${err.message} / Agent relay 連線錯誤`
      );
      this.handleAgentDisconnect(agentId, socket);
    });
  }

  /** Handle data from agent connection / 處理 agent 連接的資料 */
  private handleAgentData(agentId: string, socket: Socket, data: Buffer): void {
    if (data.length < 2) return;

    const firstByte = data[0] ?? 0;
    const opcode = firstByte & 0x0f;

    // Close frame / 關閉框架
    if (opcode === 0x08) {
      this.handleAgentDisconnect(agentId, socket);
      return;
    }

    // Ping -> pong / Ping -> pong
    if (opcode === 0x09) {
      this.sendPong(this.agentConnections.get(agentId)?.socket);
      return;
    }

    // Pong -> ignore
    if (opcode === 0x0a) return;

    // Text frame -> extract payload and broadcast to clients
    // 文字框架 -> 提取載荷並廣播給客戶端
    if (opcode === 0x01) {
      const payload = this.extractPayload(data);
      if (payload) {
        this.broadcastToClients(agentId, payload);
      }
    }
  }

  /** Handle agent disconnect / 處理 agent 斷線 */
  private handleAgentDisconnect(agentId: string, socket: Socket): void {
    const conn = this.agentConnections.get(agentId);
    // Only remove if this is the current connection (not a replaced one)
    // 只在這是當前連接時移除（而不是已被替換的連接）
    if (!conn || conn.socket !== socket) return;

    try {
      conn.socket.destroy();
    } catch {
      /* ignore */
    }

    this.agentConnections.delete(agentId);
    this.emit('agent:disconnected', agentId);

    logger.info(
      `Agent ${agentId} disconnected from relay / ` +
        `Agent ${agentId} 已從 relay 斷線`
    );

    // Notify all connected clients that the agent is gone
    // 通知所有已連接的客戶端 agent 已離線
    const disconnectMsg = JSON.stringify({
      type: 'agent_disconnected',
      agentId,
      timestamp: new Date().toISOString(),
    });
    const frame = this.createWSFrame(Buffer.from(disconnectMsg, 'utf-8'));
    const clients = this.clientConnections.get(agentId);
    if (clients) {
      for (const client of clients) {
        try {
          client.socket.write(frame);
        } catch {
          /* ignore */
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Client connection handling / 客戶端連接處理
  // ---------------------------------------------------------------------------

  /** Handle client WebSocket upgrade / 處理客戶端 WebSocket 升級 */
  private handleClientUpgrade(
    req: IncomingMessage,
    socket: Socket,
    agentId: string
  ): void {
    // Check if agent exists / 檢查 agent 是否存在
    if (!this.agentConnections.has(agentId)) {
      logger.warn(
        `Client tried to view non-connected agent ${agentId} / ` +
          `客戶端嘗試查看未連接的 agent`
      );
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    // Enforce max clients per agent / 限制每個 agent 的最大客戶端數
    const existingClients = this.clientConnections.get(agentId);
    if (existingClients && existingClients.size >= MAX_CLIENTS_PER_AGENT) {
      logger.warn(`Max clients reached for agent ${agentId} / 客戶端數已達上限`);
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    // Complete WebSocket handshake / 完成 WebSocket 交握
    if (!this.completeHandshake(req, socket)) return;

    const conn: TrackedConnection = {
      socket,
      agentId,
      connectedAt: Date.now(),
    };

    if (!this.clientConnections.has(agentId)) {
      this.clientConnections.set(agentId, new Set());
    }
    this.clientConnections.get(agentId)!.add(conn);

    this.emit('client:connected', agentId);

    logger.info(
      `Client connected to view agent ${agentId} (total: ${this.getClientCount(agentId)}) / ` +
        `客戶端已連接查看 agent`
    );

    // Handle incoming data from client (commands to forward to agent)
    // 處理從客戶端收到的資料（轉發給 agent 的指令）
    socket.on('data', (data: Buffer) => {
      this.handleClientData(agentId, data);
    });

    socket.on('end', () => {
      this.handleClientDisconnect(agentId, conn);
    });

    socket.on('close', () => {
      this.handleClientDisconnect(agentId, conn);
    });

    socket.on('error', () => {
      this.handleClientDisconnect(agentId, conn);
    });
  }

  /** Handle data from client connection / 處理客戶端連接的資料 */
  private handleClientData(agentId: string, data: Buffer): void {
    if (data.length < 2) return;

    const firstByte = data[0] ?? 0;
    const opcode = firstByte & 0x0f;

    // Close frame
    if (opcode === 0x08) return;
    // Ping -> pong
    if (opcode === 0x09) return;
    // Pong -> ignore
    if (opcode === 0x0a) return;

    // Text frame -> forward to agent / 文字框架 -> 轉發給 agent
    if (opcode === 0x01) {
      const payload = this.extractPayload(data);
      if (payload) {
        this.forwardToAgent(agentId, payload);
      }
    }
  }

  /** Handle client disconnect / 處理客戶端斷線 */
  private handleClientDisconnect(agentId: string, conn: TrackedConnection): void {
    try {
      conn.socket.destroy();
    } catch {
      /* ignore */
    }

    const clients = this.clientConnections.get(agentId);
    if (clients) {
      clients.delete(conn);
      if (clients.size === 0) {
        this.clientConnections.delete(agentId);
      }
    }

    this.emit('client:disconnected', agentId);

    logger.info(
      `Client disconnected from agent ${agentId} (remaining: ${this.getClientCount(agentId)}) / ` +
        `客戶端已從 agent 斷線`
    );
  }

  // ---------------------------------------------------------------------------
  // Message forwarding / 訊息轉發
  // ---------------------------------------------------------------------------

  /** Broadcast a payload from agent to all subscribed clients / 將 agent 載荷廣播給所有訂閱的客戶端 */
  private broadcastToClients(agentId: string, payload: Buffer): void {
    const clients = this.clientConnections.get(agentId);
    if (!clients || clients.size === 0) return;

    // Re-frame the payload as an unmasked server->client frame
    // 將載荷重新包裝為未遮罩的 server->client 框架
    const frame = this.createWSFrame(payload);

    const deadClients: TrackedConnection[] = [];
    for (const client of clients) {
      try {
        client.socket.write(frame);
      } catch {
        deadClients.push(client);
      }
    }

    // Cleanup dead clients / 清理斷線客戶端
    for (const dead of deadClients) {
      clients.delete(dead);
      try {
        dead.socket.destroy();
      } catch {
        /* ignore */
      }
    }

    if (clients.size === 0) {
      this.clientConnections.delete(agentId);
    }
  }

  /** Forward a payload from client to the target agent / 將客戶端載荷轉發給目標 agent */
  private forwardToAgent(agentId: string, payload: Buffer): void {
    const agentConn = this.agentConnections.get(agentId);
    if (!agentConn) return;

    try {
      // Re-frame as unmasked server->client frame
      const frame = this.createWSFrame(payload);
      agentConn.socket.write(frame);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Failed to forward to agent ${agentId}: ${message} / 轉發失敗`);
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket helpers / WebSocket 輔助函數
  // ---------------------------------------------------------------------------

  /** Complete the WebSocket handshake / 完成 WebSocket 交握 */
  private completeHandshake(req: IncomingMessage, socket: Socket): boolean {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      logger.warn('Missing Sec-WebSocket-Key header / 缺少 Sec-WebSocket-Key 標頭');
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return false;
    }

    const acceptKey = createHash('sha1')
      .update(key + WS_MAGIC_GUID)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        '\r\n'
    );

    return true;
  }

  /** Create a WebSocket text frame (unmasked, server->client) / 建立 WebSocket 文字框架 */
  private createWSFrame(payload: Buffer): Buffer {
    const length = payload.length;
    let header: Buffer;

    if (length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text opcode
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payload]);
  }

  /** Extract payload from a WebSocket frame (handles both masked and unmasked) / 提取 WebSocket 框架載荷 */
  private extractPayload(data: Buffer): Buffer | null {
    if (data.length < 2) return null;

    const secondByte = data[1] ?? 0;
    const masked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      if (data.length < 4) return null;
      payloadLength = data.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (data.length < 10) return null;
      payloadLength = Number(data.readBigUInt64BE(2));
      offset = 10;
    }

    if (masked) {
      if (data.length < offset + 4 + payloadLength) return null;
      const maskKey = data.subarray(offset, offset + 4);
      offset += 4;
      const payload = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i++) {
        payload[i] = (data[offset + i] ?? 0) ^ (maskKey[i % 4] ?? 0);
      }
      return payload;
    }

    if (data.length < offset + payloadLength) return null;
    return data.subarray(offset, offset + payloadLength);
  }

  /** Send a pong frame / 發送 pong 框架 */
  private sendPong(socket: Socket | undefined): void {
    if (!socket) return;
    try {
      const pong = Buffer.alloc(2);
      pong[0] = 0x8a; // FIN + pong
      pong[1] = 0x00; // 0 payload
      socket.write(pong);
    } catch {
      /* ignore */
    }
  }
}
