import { describe, it, expect } from 'vitest';
import { shouldHardDeny } from '../src/evaluator.js';

// The live ATR corpus changes daily; the proxy's hard-deny POLICY must not
// drift silently. These assert the policy directly on synthetic rules, so they
// stay green regardless of which real rule happens to match a payload.
describe('shouldHardDeny — proxy hard-deny policy', () => {
  it('hard-denies a critical attack rule even when its maturity is young', () => {
    expect(shouldHardDeny({ severity: 'critical', maturity: 'test' })).toBe(true);
    expect(shouldHardDeny({ severity: 'critical', maturity: 'experimental' })).toBe(true);
    expect(shouldHardDeny({ severity: 'critical', maturity: 'stable' })).toBe(true);
  });

  it('hard-denies a high-severity rule only once it is proven (stable)', () => {
    expect(shouldHardDeny({ severity: 'high', maturity: 'stable' })).toBe(true);
    expect(shouldHardDeny({ severity: 'high', maturity: 'test' })).toBe(false);
    expect(shouldHardDeny({ severity: 'high', maturity: 'experimental' })).toBe(false);
  });

  it('never hard-denies a broad confirm:embedding rule (top FP source, async-confirm only)', () => {
    // e.g. ATR-2026-00001/00002 — stable + high, but must NOT auto-break a call.
    expect(shouldHardDeny({ severity: 'high', maturity: 'stable', confirm: 'embedding' })).toBe(
      false
    );
    expect(shouldHardDeny({ severity: 'critical', maturity: 'stable', confirm: 'embedding' })).toBe(
      false
    );
  });

  it('never hard-denies medium / low / informational matches', () => {
    expect(shouldHardDeny({ severity: 'medium', maturity: 'stable' })).toBe(false);
    expect(shouldHardDeny({ severity: 'low', maturity: 'stable' })).toBe(false);
    expect(shouldHardDeny({ severity: 'informational', maturity: 'stable' })).toBe(false);
  });

  // requireStable=true is the built-in-tool hook's enforce-lane gate: guarding
  // the agent's OWN shell, an unvalidated (test/experimental) rule must NOT
  // hard-block — even at critical severity — because broad tool-arg-injection
  // rules key on shell metacharacters that are normal there (`echo x; curl y`).
  // Only a wild-corpus-validated stable rule may hard-block; the rest advise.
  describe('requireStable — built-in-tool hook enforce-lane gate', () => {
    it('a critical rule hard-blocks ONLY when stable', () => {
      expect(shouldHardDeny({ severity: 'critical', maturity: 'stable' }, true)).toBe(true);
      expect(shouldHardDeny({ severity: 'critical', maturity: 'test' }, true)).toBe(false);
      expect(shouldHardDeny({ severity: 'critical', maturity: 'experimental' }, true)).toBe(false);
    });
    it('a high rule still hard-blocks only when stable', () => {
      expect(shouldHardDeny({ severity: 'high', maturity: 'stable' }, true)).toBe(true);
      expect(shouldHardDeny({ severity: 'high', maturity: 'test' }, true)).toBe(false);
    });
    it('still never hard-blocks a broad confirm:embedding rule', () => {
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'stable', confirm: 'embedding' }, true)
      ).toBe(false);
    });
    it('default (requireStable=false, the MCP proxy) is unchanged — critical always hard-denies', () => {
      expect(shouldHardDeny({ severity: 'critical', maturity: 'test' })).toBe(true);
    });
  });
});
