import { describe, it, expect, beforeEach } from 'vitest';
import { LLMReviewer } from '../src/llm-reviewer.js';
import { ThreatCloudDB } from '../src/database.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

/**
 * Tests for LLM Reviewer verdict parsing and regex validation.
 * These test the pure logic paths without hitting the Anthropic API.
 */

describe('LLMReviewer', () => {
  let reviewer: LLMReviewer;
  let db: ThreatCloudDB;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'llm-reviewer-test-'));
    db = new ThreatCloudDB(join(tempDir, 'test.db'));
    reviewer = new LLMReviewer('fake-api-key', db);
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  // Access private parseVerdict via any cast (testing pure logic)
  const parseVerdict = (r: LLMReviewer, text: string) =>
    (r as unknown as { parseVerdict(t: string): unknown }).parseVerdict(text);

  describe('parseVerdict', () => {
    it('parses a well-formed JSON verdict', () => {
      const result = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "low", "coverageScore": 85, "reasoning": "Detects real attack"}'
      );
      expect(result).toEqual({
        approved: true,
        falsePositiveRisk: 'low',
        coverageScore: 85,
        reasoning: 'Detects real attack',
      });
    });

    it('handles JSON wrapped in markdown code blocks', () => {
      const result = parseVerdict(
        reviewer,
        '```json\n{"approved": false, "falsePositiveRisk": "high", "coverageScore": 20, "reasoning": "Too broad"}\n```'
      );
      expect(result).toEqual({
        approved: false,
        falsePositiveRisk: 'high',
        coverageScore: 20,
        reasoning: 'Too broad',
      });
    });

    it('handles JSON with surrounding text', () => {
      const result = parseVerdict(
        reviewer,
        'Here is my analysis:\n{"approved": true, "falsePositiveRisk": "medium", "coverageScore": 60, "reasoning": "Looks good"}\nEnd of review.'
      );
      expect(result).toEqual({
        approved: true,
        falsePositiveRisk: 'medium',
        coverageScore: 60,
        reasoning: 'Looks good',
      });
    });

    it('defaults to not approved when approved field is missing', () => {
      const result = parseVerdict(
        reviewer,
        '{"falsePositiveRisk": "low", "coverageScore": 90, "reasoning": "Fine"}'
      );
      expect(result).toMatchObject({ approved: false });
    });

    it('defaults to not approved when approved is non-boolean', () => {
      const result = parseVerdict(
        reviewer,
        '{"approved": "yes", "falsePositiveRisk": "low", "coverageScore": 90, "reasoning": "Fine"}'
      );
      expect(result).toMatchObject({ approved: false });
    });

    it('normalizes falsePositiveRisk to lowercase', () => {
      const result = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "LOW", "coverageScore": 50, "reasoning": "ok"}'
      );
      expect(result).toMatchObject({ falsePositiveRisk: 'low' });
    });

    it('defaults to medium for invalid falsePositiveRisk', () => {
      const result = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "extreme", "coverageScore": 50, "reasoning": "ok"}'
      );
      expect(result).toMatchObject({ falsePositiveRisk: 'medium' });
    });

    it('clamps coverageScore to 0-100 range', () => {
      const over = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "low", "coverageScore": 150, "reasoning": "ok"}'
      );
      expect(over).toMatchObject({ coverageScore: 100 });

      const under = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "low", "coverageScore": -20, "reasoning": "ok"}'
      );
      expect(under).toMatchObject({ coverageScore: 0 });
    });

    it('rounds coverageScore to integer', () => {
      const result = parseVerdict(
        reviewer,
        '{"approved": true, "falsePositiveRisk": "low", "coverageScore": 72.7, "reasoning": "ok"}'
      );
      expect(result).toMatchObject({ coverageScore: 73 });
    });

    it('truncates reasoning to 1000 chars', () => {
      const longReasoning = 'x'.repeat(2000);
      const result = parseVerdict(
        reviewer,
        `{"approved": true, "falsePositiveRisk": "low", "coverageScore": 50, "reasoning": "${longReasoning}"}`
      ) as { reasoning: string };
      expect(result.reasoning.length).toBe(1000);
    });

    it('returns default verdict for empty string', () => {
      const result = parseVerdict(reviewer, '');
      expect(result).toMatchObject({
        approved: false,
        falsePositiveRisk: 'medium',
        coverageScore: 0,
        reasoning: 'No JSON found in LLM response',
      });
    });

    it('returns default verdict for non-JSON text', () => {
      const result = parseVerdict(reviewer, 'This rule looks fine to me.');
      expect(result).toMatchObject({
        approved: false,
        reasoning: 'No JSON found in LLM response',
      });
    });

    it('returns default verdict for malformed JSON', () => {
      const result = parseVerdict(reviewer, '{"approved": true, broken json}');
      expect(result).toMatchObject({
        approved: false,
        falsePositiveRisk: 'medium',
        coverageScore: 0,
      });
    });
  });

  describe('regex validation in analyzeSkills (single vs double quotes)', () => {
    // This tests the fix for the single-quote regex extraction bug.
    // The ATR drafter prompt tells LLM to use single quotes,
    // but the old code only matched double quotes.

    it('extracts regex from single-quoted YAML value', () => {
      const ruleContent = `title: 'Test rule'
id: ATR-2026-DRAFT-abcd1234
detection:
  conditions:
    - field: content
      operator: regex
      value: 'curl\\s+[^\\n]*\\d{1,3}\\.\\d{1,3}.*\\|\\s*(bash|sh)'`;

      // Simulate the regex extraction logic from analyzeSkills (the fixed version)
      const regexMatch = ruleContent.match(/value:\s*(['"])((?:(?!\1).)+)\1/);
      expect(regexMatch).not.toBeNull();
      expect(regexMatch![2]).toContain('curl');
      // Verify the extracted regex is valid JS RegExp
      expect(() => new RegExp(regexMatch![2]!, 'i')).not.toThrow();
    });

    it('extracts regex from double-quoted YAML value', () => {
      const ruleContent = `title: 'Test rule'
id: ATR-2026-DRAFT-abcd1234
detection:
  conditions:
    - field: content
      operator: regex
      value: "curl\\s+.*\\|\\s*(bash|sh)"`;

      const regexMatch = ruleContent.match(/value:\s*(['"])((?:(?!\1).)+)\1/);
      expect(regexMatch).not.toBeNull();
      expect(regexMatch![2]).toContain('curl');
      expect(() => new RegExp(regexMatch![2]!, 'i')).not.toThrow();
    });

    it('rejects invalid regex patterns', () => {
      const ruleContent = `title: 'Test rule'
id: ATR-2026-DRAFT-abcd1234
detection:
  conditions:
    - field: content
      operator: regex
      value: '(?i)(unclosed group'`;

      const regexMatch = ruleContent.match(/value:\s*(['"])((?:(?!\1).)+)\1/);
      expect(regexMatch).not.toBeNull();
      // The extracted pattern should fail RegExp construction
      expect(() => new RegExp(regexMatch![2]!, 'i')).toThrow();
    });
  });

  describe('isAvailable', () => {
    it('returns true when API key is set', () => {
      expect(reviewer.isAvailable()).toBe(true);
    });

    it('returns false when API key is empty', () => {
      const noKey = new LLMReviewer('', db);
      expect(noKey.isAvailable()).toBe(false);
    });
  });
});
