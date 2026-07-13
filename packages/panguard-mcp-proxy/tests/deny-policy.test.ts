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

  // builtinToolSurface=true is the built-in-tool hook's FP gate: guarding the
  // agent's OWN native shell, a rule scoped scan_target:mcp (an MCP-tool-ARGUMENT
  // rule, e.g. "Shell Metacharacter Injection in Tool Arguments") must NOT
  // hard-block — those key on shell metacharacters (`;` `|`) that are the normal
  // grammar of a shell (`echo x; curl localhost`). Rules scoped to the shell's
  // real domain (tool_args/skill/host/code/any) still hard-block, so credential
  // exfil is caught regardless. The gate keys on scan_target (a rule's intrinsic
  // scope), NOT maturity — so it never drifts with the daily rule corpus.
  describe('builtinToolSurface — built-in-tool hook scan_target:mcp gate', () => {
    it('an mcp-scoped rule does NOT hard-block on the built-in surface (advises)', () => {
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'test', tags: { scan_target: 'mcp' } }, true)
      ).toBe(false);
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'stable', tags: { scan_target: 'mcp' } }, true)
      ).toBe(false);
    });
    it('a shell-domain rule (tool_args/skill/host/code) still hard-blocks on the built-in surface', () => {
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'test', tags: { scan_target: 'tool_args' } }, true)
      ).toBe(true);
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'test', tags: { scan_target: 'skill' } }, true)
      ).toBe(true);
      // high still needs stable regardless of surface
      expect(
        shouldHardDeny({ severity: 'high', maturity: 'stable', tags: { scan_target: 'tool_args' } }, true)
      ).toBe(true);
      expect(
        shouldHardDeny({ severity: 'high', maturity: 'test', tags: { scan_target: 'tool_args' } }, true)
      ).toBe(false);
    });
    it('still never hard-blocks a broad confirm:embedding rule (checked before the mcp gate)', () => {
      expect(
        shouldHardDeny(
          { severity: 'critical', maturity: 'stable', confirm: 'embedding', tags: { scan_target: 'mcp' } },
          true
        )
      ).toBe(false);
    });
    it('the MCP proxy (builtinToolSurface=false) is unchanged — an mcp-scoped critical rule still hard-denies', () => {
      expect(
        shouldHardDeny({ severity: 'critical', maturity: 'test', tags: { scan_target: 'mcp' } })
      ).toBe(true);
    });
  });
});
