/**
 * Tamper-evident audit subsystem.
 *
 * - hash-chain: pure SHA-256 chain + HMAC primitives and verifyChain.
 * - audit-chain: durable, append-only, rotation-spanning JSONL chain.
 * - audit-key: keychain-first / file-fallback HMAC key management.
 * - attribution: forensic actor/decisionId/rule enrichment.
 *
 * @module @panguard-ai/panguard-guard/audit
 */

export {
  GENESIS_HASH,
  HASH_HEX_LENGTH,
  canonicalize,
  computeHash,
  signHmac,
  verifyChain,
  type ChainedRecord,
  type VerifyReason,
  type VerifyResult,
} from './hash-chain.js';

export {
  AuditChain,
  type AuditChainOptions,
  type ChainHead,
  type AnchorHook,
} from './audit-chain.js';

export { getAuditKey, __resetAuditKeyCacheForTests } from './audit-key.js';

export {
  buildActor,
  newDecisionId,
  anonymizeActorForExport,
  type Actor,
  type AgentAttribution,
  type RuleRef,
} from './attribution.js';
