/**
 * Permission and security policy module
 * 權限與安全政策模組
 *
 * @module @openclaw/security-hardening/permissions
 */

export {
  loadSecurityPolicy,
  isOperationAllowed,
  DEFAULT_SECURITY_POLICY,
  SecurityPolicySchema,
} from './security-policy.js';
export type { OperationType } from './security-policy.js';
