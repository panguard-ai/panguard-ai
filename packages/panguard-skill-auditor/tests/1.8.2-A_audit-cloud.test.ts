/**
 * Regression tests for finding 1.8.2-A_audit-cloud:
 * "`pga audit --cloud` fetches and executes unsigned Threat-Cloud rules with
 *  zero signature/ReDoS/capacity gating."
 *
 * These tests lock the SKILL-AUDITOR half of the trust boundary: the injectable
 * cloud-rule gate (ReDoS + capacity cap) that every caller of checkWithATR must
 * pass through before a network-authored rule reaches engine.addRule(). They
 * assert the unsafe behavior CANNOT recur.
 */

import { describe, it, expect } from 'vitest';
import {
  filterInjectableCloudRules,
  isCloudRuleSafe,
  MAX_CLOUD_RULES,
  type CloudRuleShape,
} from '../src/checks/cloud-rule-guard.js';

/** Build a cloud rule whose single regex condition is `pattern`. */
function ruleWithPattern(id: string, pattern: string): CloudRuleShape {
  return {
    id,
    title: `rule ${id}`,
    detection: {
      condition: 'any',
      conditions: [{ field: 'content', operator: 'regex', value: pattern }],
    },
  };
}

describe('cloud-rule-guard (finding 1.8.2-A)', () => {
  describe('ReDoS / pattern-safety gate', () => {
    it('accepts a rule with a safe, bounded regex', () => {
      const rule = ruleWithPattern('SAFE-1', 'ignore all previous instructions');
      expect(isCloudRuleSafe(rule)).toBe(true);
    });

    it('rejects a rule with a catastrophic-backtracking (nested quantifier) regex', () => {
      const rule = ruleWithPattern('REDOS-1', '(a+)+$');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects a rule with overlapping-alternation ReDoS', () => {
      const rule = ruleWithPattern('REDOS-2', '(a|a)+');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects a rule with star-of-star ReDoS', () => {
      const rule = ruleWithPattern('REDOS-3', '.*.*.*x');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects a DEEPLY-nested quantified inner group (flat heuristic missed this)', () => {
      // (([a-z])+)+ compiles fine but blows up exponentially; the old
      // /\([^)]*[+*]\)[+*{]/ heuristic could not see the inner quantified group.
      // The structural walk (parity with the guard daemon) must catch it.
      const rule = ruleWithPattern('REDOS-NESTED', '(([a-z])+)+$');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects (a*)*b-class nested quantifiers', () => {
      const rule = ruleWithPattern('REDOS-4', '(a*)*b');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('accepts a bounded {2,4} quantifier (not exponential)', () => {
      const rule = ruleWithPattern('BOUNDED-1', '(ab){2,4}');
      expect(isCloudRuleSafe(rule)).toBe(true);
    });

    it('rejects a rule whose regex does not compile', () => {
      const rule = ruleWithPattern('BAD-1', '([unterminated');
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects a rule with an oversized pattern (resource bound)', () => {
      const rule = ruleWithPattern('BIG-1', 'a'.repeat(2001));
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('rejects unsafe patterns hidden in a grouped patterns[] condition', () => {
      const rule: CloudRuleShape = {
        id: 'REDOS-GROUP',
        title: 'grouped',
        detection: { conditions: [{ patterns: ['safe', '(x*)*y'] }] },
      };
      expect(isCloudRuleSafe(rule)).toBe(false);
    });

    it('accepts a rule with no regex conditions (nothing executable)', () => {
      const rule: CloudRuleShape = {
        id: 'NOOP',
        title: 'no regex',
        detection: { conditions: [{ field: 'x', operator: 'equals', value: 'y' }] },
      };
      expect(isCloudRuleSafe(rule)).toBe(true);
    });
  });

  describe('filterInjectableCloudRules', () => {
    it('drops unsafe rules and keeps safe ones (immutable — new array)', () => {
      const input: CloudRuleShape[] = [
        ruleWithPattern('SAFE-A', 'curl .* evil'),
        ruleWithPattern('REDOS-A', '(a+)+'),
        ruleWithPattern('SAFE-B', 'rm -rf'),
      ];
      const out = filterInjectableCloudRules(input);
      expect(out.map((r) => r.id)).toEqual(['SAFE-A', 'SAFE-B']);
      expect(out).not.toBe(input);
    });

    it('enforces the MAX_CLOUD_RULES capacity cap', () => {
      const input: CloudRuleShape[] = Array.from({ length: MAX_CLOUD_RULES + 25 }, (_, i) =>
        ruleWithPattern(`SAFE-${i}`, `pattern-${i}`)
      );
      const out = filterInjectableCloudRules(input);
      expect(out.length).toBe(MAX_CLOUD_RULES);
    });

    it('a poisoned ReDoS rule can NEVER survive the gate even in bulk', () => {
      const input: CloudRuleShape[] = [
        ...Array.from({ length: 10 }, (_, i) => ruleWithPattern(`SAFE-${i}`, `p${i}`)),
        // Canonical nested-quantifier ReDoS the shared isSafeRegex heuristic catches.
        ruleWithPattern('POISON', '(a+)+$'),
      ];
      const out = filterInjectableCloudRules(input);
      expect(out.some((r) => r.id === 'POISON')).toBe(false);
    });
  });
});
