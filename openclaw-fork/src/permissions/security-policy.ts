/**
 * Security policy configuration and enforcement
 * 安全政策配置與執行
 *
 * @module @openclaw/security-hardening/permissions/security-policy
 */

import { z } from 'zod';
import { createLogger, validateInput } from '@openclaw/core';
import type { SecurityPolicy } from '../types.js';

const logger = createLogger('permissions:security-policy');

/**
 * Zod schema for security policy validation
 * 安全政策驗證的 Zod schema
 */
export const SecurityPolicySchema = z.object({
  allowShellAccess: z.boolean().default(false),
  allowedDirectories: z.array(z.string()).default([]),
  allowedCommands: z.array(z.string()).default([]),
  requireCsrfToken: z.boolean().default(true),
  allowedOrigins: z.array(z.string()).default(['http://localhost:18789', 'http://127.0.0.1:18789']),
  enableAuditLog: z.boolean().default(true),
  syslogServer: z.string().optional(),
  syslogPort: z.number().int().min(1).max(65535).optional(),
});

/**
 * Default security policy (restricted mode)
 * 預設安全政策（受限模式）
 *
 * Shell access disabled, CSRF required, audit logging enabled.
 * Shell 存取停用、CSRF 必要、稽核日誌啟用。
 */
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowShellAccess: false,
  allowedDirectories: [],
  allowedCommands: [],
  requireCsrfToken: true,
  allowedOrigins: ['http://localhost:18789', 'http://127.0.0.1:18789'],
  enableAuditLog: true,
};

/**
 * Operation types that can be checked against policy
 * 可以根據政策檢查的操作類型
 */
export type OperationType = 'shell' | 'file_read' | 'file_write' | 'command' | 'network';

/**
 * Load and validate a security policy from configuration
 * 從配置載入並驗證安全政策
 *
 * Falls back to default restricted policy on validation failure.
 * 驗證失敗時回退到預設的受限政策。
 *
 * @param config - Raw configuration object / 原始配置物件
 * @returns Validated security policy / 驗證後的安全政策
 */
export function loadSecurityPolicy(config: unknown): SecurityPolicy {
  try {
    const parsed = validateInput(SecurityPolicySchema, config);
    // Zod .default() guarantees all required fields after parsing
    const policy: SecurityPolicy = {
      allowShellAccess: parsed.allowShellAccess ?? false,
      allowedDirectories: parsed.allowedDirectories ?? [],
      allowedCommands: parsed.allowedCommands ?? [],
      requireCsrfToken: parsed.requireCsrfToken ?? true,
      allowedOrigins: parsed.allowedOrigins ?? ['http://localhost:18789', 'http://127.0.0.1:18789'],
      enableAuditLog: parsed.enableAuditLog ?? true,
      syslogServer: parsed.syslogServer,
      syslogPort: parsed.syslogPort,
    };
    logger.info('Security policy loaded', {
      allowShellAccess: policy.allowShellAccess,
      requireCsrfToken: policy.requireCsrfToken,
      enableAuditLog: policy.enableAuditLog,
    });
    return policy;
  } catch (error) {
    logger.error('Failed to load security policy, using restricted defaults', {
      error: String(error),
    });
    return DEFAULT_SECURITY_POLICY;
  }
}

/**
 * Check if an operation is allowed by the current policy
 * 檢查操作是否被目前的政策允許
 *
 * @param operation - Operation type / 操作類型
 * @param policy - Security policy / 安全政策
 * @returns true if operation is allowed / 操作被允許則回傳 true
 */
export function isOperationAllowed(operation: OperationType, policy: SecurityPolicy): boolean {
  let allowed: boolean;

  switch (operation) {
    case 'shell':
      allowed = policy.allowShellAccess;
      break;
    case 'file_read':
    case 'file_write':
      allowed = policy.allowedDirectories.length > 0;
      break;
    case 'command':
      allowed = policy.allowedCommands.length > 0 || policy.allowShellAccess;
      break;
    case 'network':
      allowed = true; // Network is allowed by default, controlled separately
      break;
    default:
      allowed = false;
  }

  if (!allowed) {
    logger.warn('Operation blocked by security policy', { operation });
  }

  return allowed;
}
