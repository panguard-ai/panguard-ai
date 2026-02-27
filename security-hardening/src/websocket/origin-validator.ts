/**
 * WebSocket Origin header validation
 * WebSocket Origin 標頭驗證
 *
 * Prevents CVE-2026-25253: unauthorized domains connecting to local WebSocket.
 * 防止 CVE-2026-25253：未經授權的網域連接到本地 WebSocket。
 *
 * @module @panguard-ai/security-hardening/websocket/origin-validator
 */

import { createLogger } from '@panguard-ai/core';
import type { OriginConfig } from '../types.js';

const logger = createLogger('websocket:origin-validator');

/** Default allowed origins / 預設允許的 origins */
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:18789', 'http://127.0.0.1:18789'];

/** Localhost pattern / 本機模式 */
const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/;

/**
 * Validate WebSocket Origin header against allowlist
 * 根據允許清單驗證 WebSocket Origin 標頭
 *
 * @param origin - Origin header value (undefined if missing) / Origin 標頭值（缺少時為 undefined）
 * @param config - Validation configuration / 驗證配置
 * @returns true if origin is allowed / Origin 被允許則回傳 true
 */
export function validateOrigin(
  origin: string | undefined,
  config: OriginConfig = { allowedOrigins: DEFAULT_ALLOWED_ORIGINS, allowLocalhost: true }
): boolean {
  // Missing Origin header is always rejected
  if (!origin) {
    logger.warn('WebSocket connection rejected: missing Origin header');
    return false;
  }

  // Check explicit allowlist
  if (config.allowedOrigins.includes(origin)) {
    logger.info('Origin allowed by explicit allowlist', { origin });
    return true;
  }

  // Check localhost patterns
  if (config.allowLocalhost && LOCALHOST_PATTERN.test(origin)) {
    logger.info('Origin allowed by localhost rule', { origin });
    return true;
  }

  logger.warn('WebSocket connection rejected: unauthorized Origin', { origin });
  return false;
}

/**
 * Create Origin validation middleware for WebSocket server
 * 為 WebSocket 伺服器建立 Origin 驗證中介軟體
 *
 * @param config - Validation configuration / 驗證配置
 * @returns Validation function that takes request headers / 接受請求標頭的驗證函式
 */
export function createOriginValidator(config?: Partial<OriginConfig>) {
  const fullConfig: OriginConfig = {
    allowedOrigins: config?.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS,
    allowLocalhost: config?.allowLocalhost ?? true,
  };

  return (headers: Record<string, string | string[] | undefined>): boolean => {
    const origin = Array.isArray(headers['origin']) ? headers['origin'][0] : headers['origin'];
    return validateOrigin(origin, fullConfig);
  };
}
