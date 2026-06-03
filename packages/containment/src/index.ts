/**
 * PanGuard agent containment closed-loop — the dual-path model.
 * See docs/architecture/agent-containment-closed-loop.md (v2).
 *
 * Layer 1 (hot path): InlineGate + RiskStore read.
 * Layer 2 (async brain): RiskAnalyzer over the ATR corpus.
 * Layer 3 (rare): ContainmentController.
 * Orchestrated by GuardGate (onAction sync / onSessionActivity async).
 *
 * @module @panguard-ai/panguard-guard/containment
 */
export * from './types.js';
export * from './risk-store.js';
export * from './inline-gate.js';
export * from './risk-analyzer.js';
export * from './atr-detector.js';
export * from './guard-gate.js';
export * from './response-controller.js';
export * from './mcp-gate.js';
