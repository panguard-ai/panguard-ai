/**
 * CSRF token mechanism for WebSocket authentication
 * WebSocket 認證的 CSRF token 機制
 *
 * Prevents cross-site WebSocket hijacking (CVE-2026-25253).
 * 防止跨站 WebSocket 劫持（CVE-2026-25253）。
 *
 * @module @panguard-ai/security-hardening/websocket/csrf-token
 */

import { randomBytes } from 'crypto';
import { createLogger } from '@panguard-ai/core';
import type { CsrfToken } from '../types.js';

const logger = createLogger('websocket:csrf-token');

/** Default token expiration: 15 minutes / 預設 token 過期時間：15 分鐘 */
const DEFAULT_EXPIRATION_MS = 15 * 60 * 1000;

/**
 * CSRF token manager
 * CSRF token 管理器
 *
 * Manages generation, validation, and cleanup of CSRF tokens.
 * 管理 CSRF token 的產生、驗證和清理。
 */
export class CsrfTokenManager {
  private readonly store = new Map<string, CsrfToken>();
  private readonly expirationMs: number;

  /**
   * Create a new CSRF token manager
   * 建立新的 CSRF token 管理器
   *
   * @param expirationMs - Token expiration in milliseconds / Token 過期時間（毫秒）
   */
  constructor(expirationMs: number = DEFAULT_EXPIRATION_MS) {
    this.expirationMs = expirationMs;
  }

  /**
   * Generate a new CSRF token for a session
   * 為會話產生新的 CSRF token
   *
   * @param sessionId - Session identifier / 會話識別碼
   * @returns Generated CSRF token / 產生的 CSRF token
   */
  generate(sessionId: string): CsrfToken {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.expirationMs);

    const csrfToken: CsrfToken = {
      token,
      sessionId,
      createdAt: now,
      expiresAt,
    };

    this.store.set(token, csrfToken);
    logger.info('CSRF token generated', { sessionId, expiresAt: expiresAt.toISOString() });

    return csrfToken;
  }

  /**
   * Validate a CSRF token
   * 驗證 CSRF token
   *
   * @param token - Token value / Token 值
   * @param sessionId - Expected session ID / 預期的會話 ID
   * @returns true if token is valid / Token 有效則回傳 true
   */
  validate(token: string, sessionId: string): boolean {
    const stored = this.store.get(token);

    if (!stored) {
      logger.warn('CSRF token validation failed: token not found');
      return false;
    }

    if (stored.sessionId !== sessionId) {
      logger.warn('CSRF token validation failed: session mismatch', {
        expected: sessionId,
        actual: stored.sessionId,
      });
      return false;
    }

    if (new Date() > stored.expiresAt) {
      logger.warn('CSRF token validation failed: token expired');
      this.store.delete(token);
      return false;
    }

    logger.info('CSRF token validated successfully', { sessionId });
    return true;
  }

  /**
   * Revoke a specific token
   * 撤銷特定 token
   *
   * @param token - Token to revoke / 要撤銷的 token
   */
  revoke(token: string): void {
    if (this.store.delete(token)) {
      logger.info('CSRF token revoked');
    }
  }

  /**
   * Clean up all expired tokens
   * 清理所有過期的 token
   *
   * @returns Number of tokens cleaned / 清理的 token 數量
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [token, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Expired CSRF tokens cleaned up', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Get current token count (for testing/monitoring)
   * 取得目前 token 數量（用於測試/監控）
   */
  get size(): number {
    return this.store.size;
  }
}
