/**
 * InlineGate — Layer 1 of the dual-path containment model.
 *
 * The ONLY component in the hot path. MUST stay sub-millisecond: a capability
 * lookup, an egress allowlist lookup, a tiny block-on-sight regex set, and a
 * read of the session's current risk. No LLM, no awaited I/O, no full rule
 * corpus — those run in the async brain (RiskAnalyzer).
 *
 * Allow-by-default: a legitimate agent never feels it. Only clear violations
 * are denied (with a clean, actionable message), and only an already-risky
 * session escalates.
 *
 * @module @panguard-ai/panguard-guard/containment/inline-gate
 */
import type { ActionContext, GateDecision, SessionRisk } from './types.js';

/**
 * Tiny curated block-on-sight patterns: unambiguously malicious payloads with
 * no benign reason to appear (reverse shells, pipe-to-shell, netcat exec).
 * Deliberately NOT the full ATR corpus — that runs in the brain. 0 FP by design.
 */
const BLOCK_ON_SIGHT: readonly RegExp[] = [
  /\b(?:ba)?sh\b\s+-i\b[^\n]*>&\s*\/dev\/(?:tcp|udp)\//i, // reverse shell
  /\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/i, // download piped to shell
  /\bnc(?:at)?\b[^\n]*\s-e\s/i, // netcat exec
];

export interface InlineGateConfig {
  /** Allowlisted egress hosts (Layer 0 scope). Empty = deny all egress. */
  readonly egressAllowlist?: ReadonlySet<string>;
  /** Extra block-on-sight patterns beyond the built-in set. */
  readonly extraBlockPatterns?: readonly RegExp[];
}

export class InlineGate {
  private readonly egressAllowlist: ReadonlySet<string>;
  private readonly blockPatterns: readonly RegExp[];

  constructor(config: InlineGateConfig = {}) {
    this.egressAllowlist = config.egressAllowlist ?? new Set();
    this.blockPatterns = config.extraBlockPatterns
      ? [...BLOCK_ON_SIGHT, ...config.extraBlockPatterns]
      : BLOCK_ON_SIGHT;
  }

  /**
   * Decide allow / deny / escalate for an attempted action. Synchronous and
   * fast — this is the only thing in the hot path.
   */
  decide(ctx: ActionContext, risk: SessionRisk): GateDecision {
    // A confirmed-malicious session: block every action now. The brain kills
    // the session out-of-band; the gate just stops further damage immediately.
    if (risk.level === 'confirmed_malicious') return 'DENY';

    // Layer 0 capability scope: a tool/command must be in the granted set.
    if (this.violatesCapability(ctx)) return 'DENY';

    // Egress allowlist: deny network egress to non-allowlisted hosts.
    if (ctx.kind === 'network_egress' && !this.egressAllowlist.has(ctx.target)) {
      return 'DENY';
    }

    // Block-on-sight: tiny 0-FP malicious-payload set.
    for (const pattern of this.blockPatterns) {
      if (pattern.test(ctx.payload)) return 'DENY';
    }

    // A session the brain already flagged 'high' routes through containment
    // (quarantine) rather than a blanket block.
    if (risk.level === 'high') return 'ESCALATE';

    // Default: allow. The legitimate agent never feels the gate.
    return 'ALLOW';
  }

  /** A clean, actionable denial message — never a deceptive/hung response. */
  denyMessage(ctx: ActionContext): string {
    if (this.violatesCapability(ctx)) {
      return `Action denied: '${ctx.target}' is not in this agent's granted capabilities.`;
    }
    if (ctx.kind === 'network_egress' && !this.egressAllowlist.has(ctx.target)) {
      return `Egress denied: host '${ctx.target}' is not on the allowlist.`;
    }
    return 'Action denied by PanGuard policy.';
  }

  private violatesCapability(ctx: ActionContext): boolean {
    return (
      (ctx.kind === 'tool_call' || ctx.kind === 'command') &&
      !ctx.capabilities.has(ctx.target)
    );
  }
}
