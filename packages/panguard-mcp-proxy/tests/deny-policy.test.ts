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
});
