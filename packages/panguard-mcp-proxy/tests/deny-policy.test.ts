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
  // agent's OWN native shell, ONLY the shell-metacharacter-injection subcategories
  // (shell-escape / parameter-injection) degrade — those key on `;` `|` `$()`
  // grammar that is normal in a shell (`echo x; curl localhost`). Every OTHER
  // scan_target:mcp rule (credential-theft, env-var-harvesting, tool-poisoning)
  // detects malicious SEMANTICS illegitimate on any shell and MUST keep blocking —
  // 1.8.12's whole-class gate wrongly degraded `cat ~/.ssh/id_rsa` to advisory.
  describe('builtinToolSurface — built-in-tool hook shell-metacharacter gate', () => {
    it('mcp shell-escape / parameter-injection rules degrade on the built-in surface (the real FP)', () => {
      expect(
        shouldHardDeny(
          {
            severity: 'critical',
            maturity: 'test',
            tags: { scan_target: 'mcp', subcategory: 'shell-escape' },
          },
          true
        )
      ).toBe(false);
      expect(
        shouldHardDeny(
          {
            severity: 'critical',
            maturity: 'stable',
            tags: { scan_target: 'mcp', subcategory: 'parameter-injection' },
          },
          true
        )
      ).toBe(false);
    });
    it('REGRESSION (1.8.13): mcp credential-theft / env-harvesting STILL hard-block on the built-in surface (cat ~/.ssh/id_rsa)', () => {
      expect(
        shouldHardDeny(
          {
            severity: 'critical',
            maturity: 'test',
            tags: { scan_target: 'mcp', subcategory: 'credential-theft' },
          },
          true
        )
      ).toBe(true);
      expect(
        shouldHardDeny(
          {
            severity: 'critical',
            maturity: 'test',
            tags: { scan_target: 'mcp', subcategory: 'env-var-harvesting' },
          },
          true
        )
      ).toBe(true);
      // an mcp rule with no/other subcategory is NOT a metacharacter FP -> still blocks
      expect(
        shouldHardDeny(
          { severity: 'critical', maturity: 'test', tags: { scan_target: 'mcp' } },
          true
        )
      ).toBe(true);
    });
    it('a shell-domain rule (tool_args/skill/host/code) still hard-blocks on the built-in surface', () => {
      expect(
        shouldHardDeny(
          { severity: 'critical', maturity: 'test', tags: { scan_target: 'tool_args' } },
          true
        )
      ).toBe(true);
      expect(
        shouldHardDeny(
          { severity: 'critical', maturity: 'test', tags: { scan_target: 'skill' } },
          true
        )
      ).toBe(true);
      // high still needs stable regardless of surface
      expect(
        shouldHardDeny(
          { severity: 'high', maturity: 'stable', tags: { scan_target: 'tool_args' } },
          true
        )
      ).toBe(true);
      expect(
        shouldHardDeny(
          { severity: 'high', maturity: 'test', tags: { scan_target: 'tool_args' } },
          true
        )
      ).toBe(false);
    });
    it('still never hard-blocks a broad confirm:embedding rule (checked before the mcp gate)', () => {
      expect(
        shouldHardDeny(
          {
            severity: 'critical',
            maturity: 'stable',
            confirm: 'embedding',
            tags: { scan_target: 'mcp' },
          },
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
