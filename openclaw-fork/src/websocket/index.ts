/**
 * WebSocket security module
 * WebSocket 安全模組
 *
 * Fixes for CVE-2026-25253: WebSocket cross-site authentication hijacking.
 * 修復 CVE-2026-25253：WebSocket 跨站認證劫持。
 *
 * @module @openclaw/security-hardening/websocket
 */

export { validateOrigin, createOriginValidator } from './origin-validator.js';
export { CsrfTokenManager } from './csrf-token.js';
export { validateGatewayUrl, sanitizeWebSocketUrl } from './connection-validator.js';
